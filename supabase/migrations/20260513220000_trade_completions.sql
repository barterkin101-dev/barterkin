-- Trade Completion Flow
-- Members mark trades as complete; when both parties mark complete, the trade is mutually completed.
-- This drives the review request flow and tracks trade_completion_rate metric.

create table public.trade_completions (
  id                    uuid primary key default gen_random_uuid(),
  conversation_id       uuid not null references public.conversations(id) on delete cascade,
  listing_id            uuid references public.listings(id) on delete set null,
  initiator_profile_id  uuid not null references public.profiles(id) on delete cascade,
  recipient_profile_id  uuid not null references public.profiles(id) on delete cascade,
  initiator_marked_at   timestamptz,
  recipient_marked_at   timestamptz,
  completed_at          timestamptz,
  status                text not null default 'pending'
    check (status in ('pending', 'initiator_marked', 'recipient_marked', 'completed', 'cancelled')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (conversation_id)
);

-- Indexes
 create index trade_completions_conversation_idx on public.trade_completions(conversation_id);
 create index trade_completions_initiator_idx on public.trade_completions(initiator_profile_id);
 create index trade_completions_recipient_idx on public.trade_completions(recipient_profile_id);
 create index trade_completions_status_idx on public.trade_completions(status);

-- RLS
alter table public.trade_completions enable row level security;

-- Participants can read their own trade completions
create policy "trade_completions_read_participant" on public.trade_completions for select to authenticated
  using (
    initiator_profile_id in (select id from public.profiles where owner_id = (select auth.uid()))
    or recipient_profile_id in (select id from public.profiles where owner_id = (select auth.uid()))
  );

-- Participants can update their own side (mark complete)
create policy "trade_completions_update_participant" on public.trade_completions for update to authenticated
  using (
    initiator_profile_id in (select id from public.profiles where owner_id = (select auth.uid()))
    or recipient_profile_id in (select id from public.profiles where owner_id = (select auth.uid()))
  )
  with check (
    initiator_profile_id in (select id from public.profiles where owner_id = (select auth.uid()))
    or recipient_profile_id in (select id from public.profiles where owner_id = (select auth.uid()))
  );

-- Insert: only participants in the conversation can create a trade completion record
create policy "trade_completions_insert_participant" on public.trade_completions for insert to authenticated
  with check (
    public.current_user_is_verified()
    and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = trade_completions.conversation_id
        and cp.profile_id in (select id from public.profiles where owner_id = (select auth.uid()))
    )
  );

-- Trigger: updated_at
create trigger trade_completions_updated_at
  before update on public.trade_completions
  for each row execute function public.set_updated_at();

-- RPC: mark_trade_complete — idempotent, detects mutual completion, returns new status
create or replace function public.mark_trade_complete(
  p_conversation_id uuid,
  p_profile_id uuid
)
returns table (status text, completed_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_record public.trade_completions%rowtype;
  v_other_profile_id uuid;
begin
  -- Get or create the trade completion record
  select * into v_record
  from public.trade_completions
  where conversation_id = p_conversation_id;

  if not found then
    -- Determine the other participant
    select cp.profile_id into v_other_profile_id
    from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id
      and cp.profile_id != p_profile_id
    limit 1;

    if v_other_profile_id is null then
      raise exception 'Conversation has no other participant';
    end if;

    insert into public.trade_completions (
      conversation_id,
      initiator_profile_id,
      recipient_profile_id,
      initiator_marked_at,
      status
    ) values (
      p_conversation_id,
      p_profile_id,
      v_other_profile_id,
      now(),
      'initiator_marked'
    )
    returning * into v_record;

    return query select v_record.status, v_record.completed_at;
    return;
  end if;

  -- Idempotency: already marked by this user
  if v_record.initiator_profile_id = p_profile_id and v_record.initiator_marked_at is not null then
    return query select v_record.status, v_record.completed_at;
    return;
  end if;

  if v_record.recipient_profile_id = p_profile_id and v_record.recipient_marked_at is not null then
    return query select v_record.status, v_record.completed_at;
    return;
  end if;

  -- Mark the appropriate side
  if v_record.initiator_profile_id = p_profile_id then
    update public.trade_completions
    set initiator_marked_at = now(),
        status = case
          when recipient_marked_at is not null then 'completed'
          else 'initiator_marked'
        end,
        completed_at = case
          when recipient_marked_at is not null then now()
          else completed_at
        end
    where id = v_record.id
    returning * into v_record;
  elsif v_record.recipient_profile_id = p_profile_id then
    update public.trade_completions
    set recipient_marked_at = now(),
        status = case
          when initiator_marked_at is not null then 'completed'
          else 'recipient_marked'
        end,
        completed_at = case
          when initiator_marked_at is not null then now()
          else completed_at
        end
    where id = v_record.id
    returning * into v_record;
  else
    raise exception 'Profile is not a participant in this trade';
  end if;

  return query select v_record.status, v_record.completed_at;
end;
$$;

revoke execute on function public.mark_trade_complete(uuid, uuid) from public;
revoke execute on function public.mark_trade_complete(uuid, uuid) from anon;
grant execute on function public.mark_trade_complete(uuid, uuid) to authenticated;
grant execute on function public.mark_trade_complete(uuid, uuid) to service_role;

comment on table public.trade_completions is
  'Tracks trade completion state per conversation. Both parties must mark complete for mutual completion.';

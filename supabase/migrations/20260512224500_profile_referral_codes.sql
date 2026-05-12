-- Add durable referral codes to profiles for invite links.

create or replace function public.generate_referral_code()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
begin
  loop
    candidate := '';

    for i in 1..8 loop
      candidate := candidate || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    end loop;

    exit when not exists (
      select 1
      from public.profiles
      where referral_code = candidate
    );
  end loop;

  return candidate;
end;
$$;

alter table public.profiles
  add column if not exists referral_code text;

alter table public.profiles
  add constraint profiles_referral_code_format
  check (referral_code is null or referral_code ~ '^[A-Z0-9]{8}$');

update public.profiles
set referral_code = public.generate_referral_code()
where referral_code is null;

alter table public.profiles
  alter column referral_code set default public.generate_referral_code();

create unique index if not exists profiles_referral_code_idx
  on public.profiles(referral_code);

alter table public.profiles
  alter column referral_code set not null;

comment on column public.profiles.referral_code is
  'Unique 8-character invite code used for member referral links.';

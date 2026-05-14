alter table public.profiles
  add column if not exists phone_number text,
  add column if not exists phone_verified boolean not null default false;

comment on column public.profiles.phone_number is
  'Encrypted phone number ciphertext for SMS verification.';

comment on column public.profiles.phone_verified is
  'True only after the member completes SMS verification.';

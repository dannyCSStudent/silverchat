create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'admin_role') then
    create type admin_role as enum ('moderator', 'lead', 'admin');
  end if;

  if not exists (select 1 from pg_type where typname = 'profile_status') then
    create type profile_status as enum ('pending', 'active', 'paused', 'banned');
  end if;

  if not exists (select 1 from pg_type where typname = 'age_verified_status') then
    create type age_verified_status as enum ('pending', 'self_attested', 'verified', 'rejected');
  end if;

  if not exists (select 1 from pg_type where typname = 'report_reason') then
    create type report_reason as enum ('nudity', 'harassment', 'scam', 'underage', 'spam', 'other');
  end if;

  if not exists (select 1 from pg_type where typname = 'report_status') then
    create type report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
  end if;

  if not exists (select 1 from pg_type where typname = 'session_status') then
    create type session_status as enum ('queued', 'matched', 'connected', 'ended', 'reported');
  end if;

  if not exists (select 1 from pg_type where typname = 'verification_provider') then
    create type verification_provider as enum ('self_attested', 'manual_review', 'persona', 'stripe_identity');
  end if;
end
$$;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  date_of_birth date not null,
  bio text,
  avatar_url text,
  country_code text,
  age_verified_status age_verified_status not null default 'pending',
  profile_status profile_status not null default 'pending',
  safety_notes text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists profiles_profile_status_idx on public.profiles (profile_status);
create index if not exists profiles_age_verified_status_idx on public.profiles (age_verified_status);
create index if not exists profiles_country_code_idx on public.profiles (country_code);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function set_updated_at();

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  display_name text,
  role admin_role not null default 'moderator',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists admin_users_role_idx on public.admin_users (role, username);
create index if not exists admin_users_active_idx on public.admin_users (is_active, username);

drop trigger if exists admin_users_set_updated_at on public.admin_users;
create trigger admin_users_set_updated_at
before update on public.admin_users
for each row
execute function set_updated_at();

create table if not exists public.interests (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_interests (
  user_id uuid not null references auth.users (id) on delete cascade,
  interest_id uuid not null references public.interests (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, interest_id)
);

create table if not exists public.match_queue (
  user_id uuid primary key references auth.users (id) on delete cascade,
  queued_at timestamptz not null default timezone('utc', now()),
  last_active_at timestamptz not null default timezone('utc', now()),
  preferred_language text,
  country_code text,
  is_available boolean not null default true
);

create index if not exists match_queue_available_idx on public.match_queue (is_available, queued_at);

create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  initiator_user_id uuid not null references auth.users (id) on delete cascade,
  recipient_user_id uuid not null references auth.users (id) on delete cascade,
  status session_status not null default 'queued',
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists chat_sessions_initiator_idx on public.chat_sessions (initiator_user_id, created_at desc);
create index if not exists chat_sessions_recipient_idx on public.chat_sessions (recipient_user_id, created_at desc);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references auth.users (id) on delete cascade,
  reported_user_id uuid not null references auth.users (id) on delete cascade,
  reason report_reason not null,
  details text,
  evidence_storage_path text,
  session_id uuid references public.chat_sessions (id) on delete set null,
  status report_status not null default 'open',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists reports_reporter_idx on public.reports (reporter_user_id, created_at desc);
create index if not exists reports_reported_idx on public.reports (reported_user_id, created_at desc);
create index if not exists reports_status_idx on public.reports (status, created_at desc);

create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_user_id uuid not null references auth.users (id) on delete cascade,
  blocked_user_id uuid not null references auth.users (id) on delete cascade,
  reason text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (blocker_user_id, blocked_user_id)
);

create index if not exists blocks_blocker_idx on public.blocks (blocker_user_id, created_at desc);
create index if not exists blocks_blocked_idx on public.blocks (blocked_user_id, created_at desc);

create table if not exists public.verification_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider verification_provider not null default 'self_attested',
  status age_verified_status not null default 'pending',
  reviewed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists verification_checks_user_idx on public.verification_checks (user_id, created_at desc);

create table if not exists public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists device_push_tokens_set_updated_at on public.device_push_tokens;
create trigger device_push_tokens_set_updated_at
before update on public.device_push_tokens
for each row
execute function set_updated_at();

create table if not exists public.user_presence (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status text not null default 'offline',
  last_seen_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists user_presence_set_updated_at on public.user_presence;
create trigger user_presence_set_updated_at
before update on public.user_presence
for each row
execute function set_updated_at();

create table if not exists public.moderation_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users (id) on delete set null,
  subject_user_id uuid references auth.users (id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

insert into public.interests (name, category)
values
  ('Travel', 'Lifestyle'),
  ('Gardening', 'Lifestyle'),
  ('Books', 'Culture'),
  ('Cooking', 'Lifestyle'),
  ('Walking', 'Wellness'),
  ('Music', 'Culture'),
  ('Faith', 'Community'),
  ('Volunteering', 'Community')
on conflict (name) do nothing;

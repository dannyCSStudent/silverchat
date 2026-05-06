create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'client_status') then
    create type client_status as enum ('lead', 'active', 'completed');
  end if;

  if not exists (select 1 from pg_type where typname = 'interaction_type') then
    create type interaction_type as enum ('call', 'email', 'meeting', 'note', 'follow_up');
  end if;

  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('admin', 'staff', 'viewer');
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

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  profile_image_url text,
  banner_image_url text,
  status client_status not null default 'lead',
  notes text,
  last_contacted_at timestamptz,
  owner_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.clients add column if not exists profile_image_url text;
alter table public.clients add column if not exists banner_image_url text;

create index if not exists clients_email_idx on public.clients (email);
create index if not exists clients_status_idx on public.clients (status);
create index if not exists clients_owner_user_id_idx on public.clients (owner_user_id);

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
before update on public.clients
for each row
execute function set_updated_at();

create table if not exists public.client_activity (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  interaction_type interaction_type not null,
  notes text,
  timestamp timestamptz not null default timezone('utc', now()),
  created_by uuid references auth.users (id) on delete set null
);

create index if not exists client_activity_client_id_idx on public.client_activity (client_id);
create index if not exists client_activity_timestamp_idx on public.client_activity (timestamp desc);

create table if not exists public.users_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null default 'staff'
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.client_tags (
  client_id uuid not null references public.clients (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (client_id, tag_id)
);

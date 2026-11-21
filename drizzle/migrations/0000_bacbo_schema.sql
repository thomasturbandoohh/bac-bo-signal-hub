-- Lord M (Bac Bo) schema: consolidated final state of the original project's migrations 0000-0006.

-- Roles
create type public.app_role as enum ('admin', 'user');
create type public.account_status as enum ('pending', 'approved', 'rejected', 'blocked');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users read own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  avatar_url text,
  status public.account_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create policy "Users read own profile" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Users update own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "Admins update any profile" on public.profiles for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Only admins may change status or email
create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.status is distinct from old.status or new.email is distinct from old.email)
     and not public.has_role(auth.uid(), 'admin') then
    raise exception 'Not allowed to change status';
  end if;
  if new.id = auth.uid() and public.has_role(auth.uid(), 'admin') and new.status <> 'approved' then
    raise exception 'Admin cannot block own account';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger protect_profile_fields before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- Signup handler: every new account starts pending with only the 'user' role
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, avatar_url, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.email, ''),
    new.raw_user_meta_data->>'avatar_url',
    'pending'::public.account_status
  );
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_approved(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = _user_id and status = 'approved')
$$;

-- Robot settings (single row)
create table public.robot_settings (
  id int primary key default 1 check (id = 1),
  min_confidence int not null default 70 check (min_confidence between 50 and 95),
  analysis_seconds int not null default 15 check (analysis_seconds between 5 and 60),
  maintenance boolean not null default false,
  running boolean not null default false,
  api_paused boolean not null default false,
  started_at timestamptz,
  updated_at timestamptz not null default now()
);
comment on column public.robot_settings.api_paused is
  'When true no client polls the live table and the server does not call the provider. Only admins can change it (robot_settings update policy).';
grant select, update on public.robot_settings to authenticated;
grant all on public.robot_settings to service_role;
alter table public.robot_settings enable row level security;
create policy "Approved users read settings" on public.robot_settings for select to authenticated
  using (public.is_approved(auth.uid()));
create policy "Admins update settings" on public.robot_settings for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
insert into public.robot_settings (id) values (1);

-- Signals (deprecated, kept for compatibility)
create table public.signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  side text not null check (side in ('player', 'banker')),
  pattern text not null,
  confidence int not null,
  result text not null check (result in ('green_g0', 'green_g1', 'green_g2', 'red')),
  tie_hit boolean not null default false,
  rounds jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index signals_user_created_idx on public.signals (user_id, created_at desc);
grant select, insert, delete on public.signals to authenticated;
grant all on public.signals to service_role;
alter table public.signals enable row level security;
create policy "Users read own signals" on public.signals for select to authenticated
  using (user_id = auth.uid());
create policy "Approved users insert own signals" on public.signals for insert to authenticated
  with check (user_id = auth.uid() and public.is_approved(auth.uid()));
create policy "Users delete own signals" on public.signals for delete to authenticated
  using (user_id = auth.uid());
comment on table public.signals is 'DEPRECATED: signal history is now kept per login session on the device';

-- Real Bac Bo Live rounds received from the live table feed
create table public.live_rounds (
  id text primary key,
  table_id text,
  started_at timestamptz,
  settled_at timestamptz not null,
  outcome text not null check (outcome in ('player', 'banker', 'tie')),
  player_dice smallint[] not null,
  banker_dice smallint[] not null,
  player_score smallint not null,
  banker_score smallint not null,
  multiplier integer,
  received_at timestamptz not null default now()
);
create index live_rounds_settled_at_idx on public.live_rounds (settled_at desc);
grant select on public.live_rounds to authenticated;
grant all on public.live_rounds to service_role;
alter table public.live_rounds enable row level security;
create policy "Approved users read live rounds" on public.live_rounds
  for select to authenticated using (public.is_approved(auth.uid()));

-- Single-row feed status
create table public.live_feed_status (
  id smallint primary key default 1 check (id = 1),
  last_attempt_at timestamptz not null default 'epoch',
  last_success_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);
grant select on public.live_feed_status to authenticated;
grant all on public.live_feed_status to service_role;
alter table public.live_feed_status enable row level security;
create policy "Admins read feed status" on public.live_feed_status
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
insert into public.live_feed_status (id) values (1) on conflict (id) do nothing;

create or replace function public.claim_live_feed_sync(_min_interval_ms integer)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  claimed boolean;
begin
  insert into public.live_feed_status as s (id, last_attempt_at)
  values (1, now())
  on conflict (id) do update set last_attempt_at = now()
    where s.last_attempt_at < now() - make_interval(secs => _min_interval_ms / 1000.0)
  returning true into claimed;
  return coalesce(claimed, false);
end;
$$;

-- Function permissions
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protect_profile_fields() from public, anon, authenticated;
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.is_approved(uuid) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;
grant execute on function public.is_approved(uuid) to authenticated, service_role;
revoke execute on function public.claim_live_feed_sync(integer) from public, anon, authenticated;
grant execute on function public.claim_live_feed_sync(integer) to service_role;

-- Avatar storage policies (private bucket "avatars"); "app-config" stays service-role only.
create policy "Users upload own avatar"
on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users update own avatar"
on storage.objects for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users delete own avatar"
on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users read own avatar, admins read all"
on storage.objects for select to authenticated
using (
  bucket_id = 'avatars'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(), 'admin'))
);
-- Squadbook shared backend
-- Run this once in the Supabase SQL Editor after enabling Anonymous Sign-Ins.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 24),
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists pin_hash text;

create table if not exists public.profile_devices (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  linked_at timestamptz not null default now()
);

create table if not exists public.profile_pin_attempts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  attempts smallint not null default 0,
  blocked_until timestamptz
);

create table if not exists public.strategies (
  id text primary key,
  map_id text not null,
  side text not null check (side in ('attack', 'defense')),
  site_id text not null,
  floor smallint not null,
  title text not null check (char_length(title) between 1 and 42),
  author_id uuid not null references public.profiles(id),
  author_name text not null check (char_length(author_name) between 1 and 24),
  editor_id uuid references public.profiles(id),
  editor_name text check (editor_name is null or char_length(editor_name) between 1 and 24),
  operators text[] not null default '{}',
  checkpoints text[] not null default '{}',
  plant_image_path text,
  post_image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(operators) <= 5),
  check (cardinality(checkpoints) <= 4)
);

alter table public.strategies
add column if not exists visual_references jsonb not null default '[]'::jsonb;

alter table public.strategies add column if not exists editor_id uuid references public.profiles(id);
alter table public.strategies add column if not exists editor_name text;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists strategies_set_updated_at on public.strategies;
create trigger strategies_set_updated_at
before update on public.strategies
for each row execute function public.set_updated_at();

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select device.profile_id from public.profile_devices as device where device.user_id = (select auth.uid())),
    (select profile.id from public.profiles as profile where profile.id = (select auth.uid()))
  );
$$;

create or replace function public.get_my_profile()
returns table (id uuid, display_name text, avatar_path text, pin_ready boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select profile.id, profile.display_name, profile.avatar_path, profile.pin_hash is not null
  from public.profiles as profile
  where profile.id = public.current_profile_id();
$$;

create or replace function public.list_player_profiles()
returns table (id uuid, display_name text, avatar_path text, pin_ready boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select profile.id, profile.display_name, profile.avatar_path, profile.pin_hash is not null
  from public.profiles as profile
  order by profile.created_at;
$$;

create or replace function public.create_player_profile(p_display_name text, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  player_id uuid := auth.uid();
  clean_name text := btrim(p_display_name);
begin
  if player_id is null then return jsonb_build_object('ok', false, 'error', 'not_signed_in'); end if;
  if clean_name = '' or char_length(clean_name) > 24 then return jsonb_build_object('ok', false, 'error', 'invalid_name'); end if;
  if p_pin !~ '^[0-9]{4}$' then return jsonb_build_object('ok', false, 'error', 'invalid_pin'); end if;
  if public.current_profile_id() is not null then return jsonb_build_object('ok', false, 'error', 'profile_exists'); end if;

  perform pg_advisory_xact_lock(74427433);
  if (select count(*) from public.profiles) >= 5 then
    return jsonb_build_object('ok', false, 'error', 'squad_full');
  end if;

  insert into public.profiles (id, display_name, pin_hash)
  values (player_id, clean_name, extensions.crypt(p_pin, extensions.gen_salt('bf')));
  insert into public.profile_devices (user_id, profile_id) values (player_id, player_id);
  return jsonb_build_object('ok', true, 'id', player_id);
end;
$$;

create or replace function public.set_my_profile_pin(p_pin text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  player_id uuid := public.current_profile_id();
begin
  if player_id is null or p_pin !~ '^[0-9]{4}$' then return false; end if;
  update public.profiles
  set pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf'))
  where id = player_id;
  return found;
end;
$$;

create or replace function public.claim_player_profile(p_profile_id uuid, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_id uuid := auth.uid();
  saved_hash text;
  attempt_count smallint;
  blocked timestamptz;
begin
  if session_id is null then return jsonb_build_object('ok', false, 'error', 'not_signed_in'); end if;
  if p_pin !~ '^[0-9]{4}$' then return jsonb_build_object('ok', false, 'error', 'invalid_pin'); end if;

  insert into public.profile_pin_attempts (user_id) values (session_id) on conflict do nothing;
  select attempts, blocked_until into attempt_count, blocked
  from public.profile_pin_attempts where user_id = session_id for update;

  if blocked is not null and blocked > now() then
    return jsonb_build_object('ok', false, 'error', 'try_later');
  end if;

  select pin_hash into saved_hash from public.profiles where id = p_profile_id;
  if saved_hash is null or extensions.crypt(p_pin, saved_hash) <> saved_hash then
    attempt_count := coalesce(attempt_count, 0) + 1;
    update public.profile_pin_attempts
    set attempts = case when attempt_count >= 5 then 0 else attempt_count end,
        blocked_until = case when attempt_count >= 5 then now() + interval '15 minutes' else null end
    where user_id = session_id;
    return jsonb_build_object('ok', false, 'error', case when attempt_count >= 5 then 'try_later' else 'incorrect_pin' end);
  end if;

  update public.profile_pin_attempts set attempts = 0, blocked_until = null where user_id = session_id;
  insert into public.profile_devices (user_id, profile_id)
  values (session_id, p_profile_id)
  on conflict (user_id) do update set profile_id = excluded.profile_id, linked_at = now();
  return jsonb_build_object('ok', true, 'id', p_profile_id);
end;
$$;

alter table public.profiles enable row level security;
alter table public.profile_devices enable row level security;
alter table public.profile_pin_attempts enable row level security;
alter table public.strategies enable row level security;

revoke all on public.profiles from anon;
revoke all on public.strategies from anon;
revoke all on public.profiles from authenticated;
grant select (id, display_name, avatar_path, created_at, updated_at), update (display_name, avatar_path) on public.profiles to authenticated;
revoke all on public.profile_devices from anon, authenticated;
grant select on public.profile_devices to authenticated;
revoke all on public.profile_pin_attempts from anon, authenticated;
grant select, insert, update, delete on public.strategies to authenticated;

revoke all on function public.current_profile_id() from public, anon;
revoke all on function public.get_my_profile() from public, anon;
revoke all on function public.list_player_profiles() from public, anon;
revoke all on function public.create_player_profile(text, text) from public, anon;
revoke all on function public.set_my_profile_pin(text) from public, anon;
revoke all on function public.claim_player_profile(uuid, text) from public, anon;
grant execute on function public.current_profile_id() to authenticated;
grant execute on function public.get_my_profile() to authenticated;
grant execute on function public.list_player_profiles() to authenticated;
grant execute on function public.create_player_profile(text, text) to authenticated;
grant execute on function public.set_my_profile_pin(text) to authenticated;
grant execute on function public.claim_player_profile(uuid, text) to authenticated;

drop policy if exists "Players read own device link" on public.profile_devices;
create policy "Players read own device link"
on public.profile_devices for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Squad reads profiles" on public.profiles;
create policy "Squad reads profiles"
on public.profiles for select to authenticated
using (true);

drop policy if exists "Players create own profile" on public.profiles;

drop policy if exists "Players update own profile" on public.profiles;
create policy "Players update own profile"
on public.profiles for update to authenticated
using (id = public.current_profile_id())
with check (id = public.current_profile_id());

drop policy if exists "Squad reads strategies" on public.strategies;
create policy "Squad reads strategies"
on public.strategies for select to authenticated
using (public.current_profile_id() is not null);

drop policy if exists "Squad creates strategies" on public.strategies;
create policy "Squad creates strategies"
on public.strategies for insert to authenticated
with check (author_id = public.current_profile_id());

drop policy if exists "Squad updates strategies" on public.strategies;
create policy "Squad updates strategies"
on public.strategies for update to authenticated
using (public.current_profile_id() is not null)
with check (public.current_profile_id() is not null);

drop policy if exists "Squad deletes strategies" on public.strategies;
create policy "Squad deletes strategies"
on public.strategies for delete to authenticated
using (public.current_profile_id() is not null);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 524288, array['image/jpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('strategy-media', 'strategy-media', false, 3145728, array['image/jpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Squad reads avatars" on storage.objects;
create policy "Squad reads avatars"
on storage.objects for select to authenticated
using (bucket_id = 'avatars');

drop policy if exists "Players upload own avatar" on storage.objects;
create policy "Players upload own avatar"
on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = public.current_profile_id()::text);

drop policy if exists "Players update own avatar" on storage.objects;
create policy "Players update own avatar"
on storage.objects for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = public.current_profile_id()::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = public.current_profile_id()::text);

drop policy if exists "Players delete own avatar" on storage.objects;
create policy "Players delete own avatar"
on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = public.current_profile_id()::text);

drop policy if exists "Squad reads strategy media" on storage.objects;
create policy "Squad reads strategy media"
on storage.objects for select to authenticated
using (bucket_id = 'strategy-media' and public.current_profile_id() is not null);

drop policy if exists "Squad uploads strategy media" on storage.objects;
create policy "Squad uploads strategy media"
on storage.objects for insert to authenticated
with check (bucket_id = 'strategy-media' and public.current_profile_id() is not null);

drop policy if exists "Squad updates strategy media" on storage.objects;
create policy "Squad updates strategy media"
on storage.objects for update to authenticated
using (bucket_id = 'strategy-media' and public.current_profile_id() is not null)
with check (bucket_id = 'strategy-media' and public.current_profile_id() is not null);

drop policy if exists "Squad deletes strategy media" on storage.objects;
create policy "Squad deletes strategy media"
on storage.objects for delete to authenticated
using (bucket_id = 'strategy-media' and public.current_profile_id() is not null);

do $$
begin
  alter publication supabase_realtime add table public.strategies;
exception
  when duplicate_object then null;
end;
$$;

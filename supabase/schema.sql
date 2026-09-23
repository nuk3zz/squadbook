-- Squadbook shared backend
-- Run this once in the Supabase SQL Editor after enabling Anonymous Sign-Ins.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 24),
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
  operators text[] not null default '{}',
  checkpoints text[] not null default '{}',
  plant_image_path text,
  post_image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(operators) <= 5),
  check (cardinality(checkpoints) <= 4)
);

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

alter table public.profiles enable row level security;
alter table public.strategies enable row level security;

revoke all on public.profiles from anon;
revoke all on public.strategies from anon;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.strategies to authenticated;

drop policy if exists "Squad reads profiles" on public.profiles;
create policy "Squad reads profiles"
on public.profiles for select to authenticated
using (true);

drop policy if exists "Players create own profile" on public.profiles;
create policy "Players create own profile"
on public.profiles for insert to authenticated
with check (id = auth.uid());

drop policy if exists "Players update own profile" on public.profiles;
create policy "Players update own profile"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Squad reads strategies" on public.strategies;
create policy "Squad reads strategies"
on public.strategies for select to authenticated
using (true);

drop policy if exists "Squad creates strategies" on public.strategies;
create policy "Squad creates strategies"
on public.strategies for insert to authenticated
with check (author_id = auth.uid());

drop policy if exists "Squad updates strategies" on public.strategies;
create policy "Squad updates strategies"
on public.strategies for update to authenticated
using (true)
with check (true);

drop policy if exists "Squad deletes strategies" on public.strategies;
create policy "Squad deletes strategies"
on public.strategies for delete to authenticated
using (true);

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
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Players update own avatar" on storage.objects;
create policy "Players update own avatar"
on storage.objects for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Players delete own avatar" on storage.objects;
create policy "Players delete own avatar"
on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Squad reads strategy media" on storage.objects;
create policy "Squad reads strategy media"
on storage.objects for select to authenticated
using (bucket_id = 'strategy-media');

drop policy if exists "Squad uploads strategy media" on storage.objects;
create policy "Squad uploads strategy media"
on storage.objects for insert to authenticated
with check (bucket_id = 'strategy-media');

drop policy if exists "Squad updates strategy media" on storage.objects;
create policy "Squad updates strategy media"
on storage.objects for update to authenticated
using (bucket_id = 'strategy-media')
with check (bucket_id = 'strategy-media');

drop policy if exists "Squad deletes strategy media" on storage.objects;
create policy "Squad deletes strategy media"
on storage.objects for delete to authenticated
using (bucket_id = 'strategy-media');

do $$
begin
  alter publication supabase_realtime add table public.strategies;
exception
  when duplicate_object then null;
end;
$$;


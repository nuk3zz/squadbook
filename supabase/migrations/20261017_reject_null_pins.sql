-- Reject SQL NULL inputs before PIN validation or bcrypt comparisons.
-- Existing project only: apply in its owner-authenticated SQL Editor.
-- Changes function bodies only; preserves function grants and all records.
begin;

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
  if clean_name is null or clean_name = '' or char_length(clean_name) > 24 then return jsonb_build_object('ok', false, 'error', 'invalid_name'); end if;
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then return jsonb_build_object('ok', false, 'error', 'invalid_pin'); end if;
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
  if player_id is null or p_pin is null or p_pin !~ '^[0-9]{4}$' then return false; end if;
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
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then return jsonb_build_object('ok', false, 'error', 'invalid_pin'); end if;

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

commit;

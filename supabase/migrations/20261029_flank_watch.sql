-- Extend the existing categories without changing any squad records or media.
begin;
alter table public.strategies drop constraint if exists strategies_entry_type_check;
alter table public.strategies add constraint strategies_entry_type_check
  check (entry_type in ('strategy', 'setup', 'power-spot', 'flank-watch'));
alter table public.strategies drop constraint if exists strategies_flank_watch_check;
alter table public.strategies add constraint strategies_flank_watch_check
  check (entry_type <> 'flank-watch' or (
    side = 'attack' and cardinality(applicable_sites) > 0
    and site_id = any(applicable_sites)
  ));
commit;

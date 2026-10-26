-- Add defense-only Power Spots without changing existing strategies or setups.
begin;

alter table public.strategies
  add column if not exists applicable_sites text[] not null default '{}';

alter table public.strategies drop constraint if exists strategies_entry_type_check;
alter table public.strategies add constraint strategies_entry_type_check
  check (entry_type in ('strategy', 'setup', 'power-spot'));

alter table public.strategies drop constraint if exists strategies_power_spot_check;
alter table public.strategies add constraint strategies_power_spot_check
  check (entry_type <> 'power-spot' or (
    side = 'defense' and cardinality(applicable_sites) > 0
    and site_id = any(applicable_sites)
  ));

commit;

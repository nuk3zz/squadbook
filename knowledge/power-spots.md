# Defense Power Spots

Source: `raw/2026-10-26-power-spots.md`.

- Defense browsing order: Power Spots, Strategies, Site setups. Attack omits Power Spots.
- No seeded Power Spots. Each spot has a required title and optional, unlimited photo references with short notes.
- One title owns its photo gallery. Several titled spots can share the same map/site.
- `entryType: "power-spot"` uses the existing record/media system. `applicableSites` contains one or more bomb-site IDs. Show all applicable site labels on the card and detail page.
- Browse site/floor filters match any applicable site, using the map catalog for floor ownership. Applicability refers to defended bomb sites rather than chronological round numbers or the physical floor of a photo.
- The editor uses checkboxes and requires at least one site. `site` and `floor` retain the first selected catalog site's values for existing blueprint/storage compatibility.
- Shared columns: `entry_type = 'power-spot'`, `applicable_sites text[]`. The database constrains Power Spots to Defense and a nonempty applicability list including `site_id`.
- Apply `supabase/migrations/20261026_power_spots.sql` to the existing backend before releasing shared Power Spot saving. Applied and verified on the existing production project on 26 October 2026 through the owner-authenticated SQL editor. Existing strategy/setup saves do not send the new column and remain compatible before migration.
- Offline UI checks cover multiple sites/floors, attack exclusion, save/edit, required applicability, titled photo grouping and gallery separation. Adapter checks cover shared save/cache round trips. Synthetic isolated browser QA covers desktop/tablet/mobile, multi-photo saves, reload and editing. No live squad records changed.

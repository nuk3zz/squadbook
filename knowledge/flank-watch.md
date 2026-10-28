# Flank Watch

Requested 29 October 2026: an Attack-only category to record flank drones, player flank watchers and the flanks to cover.

- Attack order is Strategies then Flank Watch. Site setups are visible and creatable only on Defense, whose order stays Power Spots, Strategies, Site setups. Existing legacy attack setup records remain stored but are hidden.
- Empty until a player adds a titled entry. Use multiple photos and short notes, optional operator alternatives, and one or more applicable bomb sites.
- Reuse the existing record/media editor. `entryType: "flank-watch"` and `applicableSites` map to `entry_type` and `applicable_sites`. Site/floor filters match any selected site. Do not count these entries as strategies or site setups.
- `siteReferenceTypes` centralizes labels and side restrictions for Flank Watch and Power Spots. Validate side and nonempty applicability before saving, and exclude wrong-side records from browsing.
- Prepared `supabase/migrations/20261029_flank_watch.sql` for the existing backend. It extends category validation and requires Attack plus applicable sites for Flank Watch. It does not rewrite records, media or profiles. Applied on 29 October 2026 through the existing project SQL editor; live introspection verified the expanded entry-type check, the Attack-only Flank Watch check, and the preserved Power Spot check.

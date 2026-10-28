# Operator alternatives and default map

Requested 29 October 2026: group interchangeable operators (Thermite or Ace), support both strategy sides, allow lineups in defense Power Spots, and select Bank on startup. Follow-up visual direction: slightly overlap alternative icons and separate each lineup slot more clearly.

- Pick operators normally, or choose a slot's **+ Alternative** button and pick a backup. Remove buttons preserve the other members. Done cancels alternative selection.
- Cards and detail views display alternatives as overlapping icon bundles, with space between slots. Accessible labels and hover titles say **Thermite or Ace**. The editor spells out **or** between named members.
- Power Spots and Flank Watch expose the optional lineup editor. Site setups retain their previous behavior.
- Keep `operators text[]`: each array element is one slot; `thermite|ace` represents alternatives, while `nomad` remains a singleton. The pipe is a reserved delimiter, never an operator asset ID. `operatorGroups` validates the record's side roster and removes duplicates. No lineup migration or record rewrite is needed.
- The shared adapter stores the text array unchanged. Existing singleton records become standalone editor slots. Older frontend versions cannot interpret grouped values; users must refresh to the new shell before editing grouped records after release.
- Bank is selected on startup, including its photo, heading and filters. The first available map is the fallback if Bank is absent.
- Release shell v8 / adapter URL v6, authorized for the existing production URL on 29 October; v8 also preserves defense drone setup classification. Previous release/rollback baseline is `6ab4eeb` (26 October); see the canonical handoff and local deployment receipt.
- Verification: UI harness covers grouping, roster validation, save/edit/remove, legacy singletons, Power Spot display, Bank default/fallback. Adapter tests check round trips. Isolated browser QA checks attack and Power Spot pairing, save/reload/edit, Bank startup and desktop/390px layouts. No production records changed.

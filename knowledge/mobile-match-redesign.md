# Compact match screen — approved 2026-10-10

## Goal

Get from a map to a visual reminder within a 10–20 second match window. Preserve the dark grid, operator icons, shared content, and existing photo editor.

## Implementation

1. Replace blueprint map thumbnails with small authentic exterior/loading images, stored locally with source attribution. Remove the large introductory headline and duplicate visible map dropdown.
2. Use Attack/Defense segmented buttons, optional floor chips, and bomb-site chips. Start with all sites visible on the selected side; every card retains its site/floor label. New entries explicitly choose their bomb site in the editor.
3. Keep the blueprint hidden and unloaded until requested. A small Blueprint action opens the existing full-screen gesture viewer; closing returns to the playbook.
4. Render compact two-column mobile photo cards: yellow strategies, green setups, short names, location, and operator icons. Use the first reference as a strategy thumbnail, falling back to the map photo. Reduce section spacing and empty-state size.
5. Offer a fill-in default plan whenever a map side has no strategies. These are virtual drafts, not automatic shared writes; saving uses the normal strategy editor and storage path.

## Safety and verification

- No database schema changes, automatic shared-content insertion, or credential changes. The owner explicitly approved deployment on 2026-10-10 through the existing GitHub Pages workflow.
- Preserve existing strategies, setups, profiles, per-photo labels, clipboard/camera uploads, and attribution.
- Verify mobile widths including 360/390 px, desktop, map/side/site switching, draft saves in an isolated local store, and blueprint open/close gestures.
- Update the PWA shell cache version so a later release picks up the redesigned screen and map-photo manifest together.

## Result

- Implemented and verified; approved for GitHub Pages release on 2026-10-10. PWA cache is `squadbook-shell-v4`; the photo manifest is attribution data, not a runtime dependency.
- All 26 map photos are official Ubisoft exterior images, compressed to 360 px wide and 637 KiB combined. Source pages and asset URLs are recorded in `dist/data/map-photos.json`; `scripts/import-map-photos.mjs` regenerates the images.
- Browser checks at 360/390 px and 1280 px confirmed no page-width overflow, no visible homepage dropdowns, side/floor/site chips, photo-first detail, optional blueprint with floor switching, and no console errors.
- `node scripts/check-match-ui.mjs` verifies filtering, virtual defaults without automatic writes, strategy/setup classification, correct editor-owned site/floor, and edit/move attribution using synthetic records and an in-memory store only.
- Saving to a different site adjusts incompatible browse filters so the newly saved card cannot disappear from the current results.

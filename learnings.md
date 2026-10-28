# Learnings

## 2026-09-23 — Stage 1 prototype

### Worked

- A single static page is enough to validate the core selection flow without spending time on accounts, storage, or frameworks.
- Separating a quick selection screen from a focused strategy screen keeps the match-time interaction short.
- Strategy records can stay compact: title, author, operator roles, short checkpoints, and media.

### Intentionally deferred

- Real gameplay screenshots and videos are waiting for user-provided material.
- Editing, shared persistence, uploads, and authentication belong to later stages after the browsing flow is approved.

### Product constraint

- The app is a visual memory aid for a small squad, not a public guide or strategy wiki.

## 2026-09-23 — Mobile-first LAN trial

### Worked

- Keeping the desktop composition while compressing the mobile selector into two rows makes the same interface useful on both screens.
- Plant and post-plant references fit side by side on phone screens, reducing match-time scrolling.
- A dependency-free server can expose the prototype to phones on the same Wi-Fi from the Mac Mini.

### Limitation

- The LAN address is only reachable by devices on the same home network. Remote squad members still require a secure tunnel or hosted deployment.

## 2026-09-23 — Blueprint and operator visual system

### Worked

- R6Calls exposes 29 current maps as floor-layered SVG files with cross-origin access enabled.
- Loading only the selected map avoids bundling roughly one gigabyte of raw blueprint files.
- The MIT-licensed `r6operators` project supplies 81 consistent local SVG icons, which is better suited to the app than scraping wiki images.
- Moving one blueprint element between the browse and strategy views avoids parsing the same large SVG twice.

### Constraint

- The source SVG's top-level floor groups are named `Floor 0`, `Floor 1`, and so on; filtering for numeric ID prefixes hides the interior plan.
- Full-map framing makes the playable rooms too small on phones. Cropping to the selected floor's embedded `*-pic` bounds produces a much better reference.

## 2026-09-23 — Compact blueprint export

### Worked

- A dependency-free Node script can download one R6Calls map at a time, isolate every floor, crop it, render it through the installed Chrome, and compress it to an 800 px JPEG.
- The temporary multi-megabyte SVG and PNG files are deleted after each export, so only small mobile-ready images remain in the app.
- Blueprint gestures must not capture a normal one-finger swipe. A small two-touch handler provides 1x–4x pinch zoom and movement while leaving one-finger page scrolling untouched.
- Do not apply `overscroll-behavior: contain` to the blueprint viewport: on mobile it can trap a one-finger page swipe when the gesture begins over the image.
- Forward wheel deltas to the page while the blueprint is embedded so desktop scrolling also remains consistent over the image.
- CSS grid children need `min-width: 0` and fractional columns need `minmax(0, ...)` to prevent long native-select values from widening a phone layout.

## 2026-09-23 — Lightweight player profiles

### Worked

- A name plus optional compressed avatar is enough to identify strategy authors for this private squad tool; email, passwords, and verification add no value at this stage.
- Storing the profile in browser local storage lets every phone create and edit its own identity before a shared backend exists.
- Resizing avatar uploads to a 192 px square JPEG keeps browser storage small.

### Constraint

- Profiles currently belong to the browser/device that created them. Cross-device profile recovery or switching requires the later shared-storage stage.

## 2026-09-23 — Desktop blueprint controls

- Ctrl plus wheel on Windows/Linux and Command plus wheel on macOS zooms around the pointer position from 1x to 4x.
- Ctrl/Command plus left-drag pans a zoomed blueprint like a hand tool; window-level mouse-move/up handlers keep the drag active when the cursor leaves the image.
- A normal wheel continues scrolling the page; in expanded mode it moves an already-zoomed blueprint.
- Double-click resets the blueprint to its original framing.
- A height-constrained viewer needs both `max-width: 100%` and `max-height: 100%` with auto dimensions. `height: 100%` can leave an intrinsic-size image clipped instead of fitted.
- A centered fitted image needs a centered translation while its scaled size remains smaller than the viewport; clamping that translation to zero makes zoom appear to grow only toward the right.

## 2026-09-23 — Local strategy editor

### Worked

- A compact editor with a title, five visual operator choices, four short checkpoints, and two optional reference images matches the playbook's quick-recall goal.
- Plant and post-plant uploads are resized to a maximum 960 px side and stored as compressed JPEG data, keeping browser storage use reasonable during the prototype stage.
- Strategy records persist in browser local storage and retain their original author when another player edits them.
- Create, edit, reload persistence, operator rendering, checkpoints, and image preview/detail rendering were verified end to end.

### Constraint

- Strategies and their images currently exist only in the browser that created them. Shared squad editing requires the next backend/storage stage.

## 2026-09-23 — Bomb-site catalog

### Worked

- The Bomb markers and nearby room labels can be extracted directly from each floor layer in the R6Calls SVG, producing 104 sites across 27 maps without shipping the source SVGs to phones.
- A small override table is useful for replacing geometric nearest-room results with the short, familiar callouts players actually use.
- Stable floor/site-number IDs keep saved strategies linked even when a displayed callout is corrected later.
- Bank selection, automatic floor syncing, and the empty non-Bomb-map state were verified in the running app with no browser console errors.

### Constraint

- Close Quarters and District contain no Bomb objective layers, so strategy creation is intentionally disabled for those maps.

## 2026-09-24 — Shared storage foundation

### Worked

- A small store adapter lets the same UI use browser local storage when unconfigured and Supabase when project settings are present.
- Supabase anonymous sessions preserve the name-and-photo onboarding with no email, password, or verification code.
- Keeping database records limited to media paths allows private buckets and expiring signed URLs without embedding image data in Postgres.
- A one-time migration marker prevents local strategies from being uploaded repeatedly when shared mode starts.
- Vendoring the pinned Supabase browser client adds only about 218 KB and avoids delaying the LAN version on a third-party CDN request.
- Local-mode profile and strategy CRUD, the running UI status, and browser console state were verified after the storage refactor.

### Constraint

- A real shared round trip cannot be verified until the Supabase project exists, Anonymous Sign-Ins are enabled, the SQL schema is applied, and the publishable project settings are added.
- Anonymous identity is device-bound. Clearing browser storage or changing devices creates a new player identity, though the player can reuse the same visible name.

## 2026-09-24 — Public repository boundary

- The real `dist/data/supabase-config.json` is intentionally ignored; only a placeholder example is publishable.
- Environment files, private keys, and local work directories are excluded before the first commit.
- The public repository must be scanned both before staging and against the exact staged patch before every push containing configuration changes.
- Public documentation must use loopback addresses or generic instructions, never a user's real-looking LAN address or machine-specific setup details.

## 2026-09-24 — Live Supabase connection

- Anonymous sign-in was saved in the Supabase dashboard and the local ignored configuration connected successfully with the browser-safe publishable key.
- The running app reached **Shared** mode, migrated the existing local player profile, loaded shared data, and produced no browser warnings or errors.
- The real project configuration remains untracked and excluded from public repository scans.

## 2026-09-24 — Static deployment

- GitHub Pages can publish the existing `dist/` directory at no hosting cost for this public repository.
- The deployment workflow generates the ignored Supabase config from GitHub Actions secrets inside the runner, so the real values never enter Git history.
- The live GitHub Pages build loaded all app data, reached **Shared** mode, and produced no browser warnings or errors.

## 2026-09-24 — PIN recovery and flexible references

- A stable player profile can remain separate from browser-bound anonymous auth by linking each anonymous user UUID through a small device-to-profile table.
- Four-digit PINs stay server-side as bcrypt hashes; five failures pause claims for 15 minutes, and profile creation is capped at five.
- Existing anonymous profiles need a one-time PIN setup on their original browser, after which other devices can claim the same profile.
- Strategy references work better as an ordered list of compressed screenshots and optional notes than fixed plant/post-plant slots.
- Side-specific labels keep a large reference gallery scannable: Attack and Defense use different tactical taxonomies, and the detail view only shows filter chips for labels present in that strategy.
- Number overlays add no useful meaning once references have tactical labels and can hide the exact angle players need to see, so thumbnails should remain unobstructed.
- Squad callouts still benefit from stable reference numbers; place `01`, `02`, and so on below the image and calculate them before filtering so a photo's number never changes.
- Reusing the same blueprint node still works with different priorities: keep it visible during round selection, then apply a detail-only collapsed class so strategy screenshots lead without loading or duplicating another map.
- A rare correction such as moving a strategy should stay behind a collapsed editor control. Selecting the destination bomb site is sufficient because the site catalog already owns the correct floor.
- New visual references should default to the first valid side-specific label: `Plant Spot` on Attack and `Rotations` on Defense.
- Operator recommendations should not inherit the five-player round limit; extra suggestions are useful as explicit backups when operators are banned.
- On a phone, even a collapsed map toolbar consumes valuable vertical space. A small location-adjacent `Blueprint` text action preserves access while removing the entire map card from the normal strategy flow.
- Strategy author avatars should resolve by stable profile ID rather than display name, so renamed players and duplicate-looking names still show the correct photo.
- Creator and latest-editor identity need separate fields: updating the author fields would erase authorship, while an optional editor pair supports compact overlapping avatars and both names.
- A focusable image box can support both ordinary file selection and direct screenshot paste without adding another dependency.
- Attack/Defense operator filtering and removing colored icon backgrounds make the optional picker much faster to scan.
- Mobile image capture should use a separate `accept="image/*" capture="environment"` file input. Keeping it separate from the ordinary input lets users explicitly choose Camera or Gallery, while the same compression and upload path handles both.

## 2026-09-24 — Visual map picker

- A large map catalog should not become a long mobile page. A two-row, horizontal CSS grid keeps every supported map visually selectable in a compact area.
- Existing 800 px blueprint JPEGs also work as lightweight map thumbnails, avoiding another image set and additional storage.
- Route thumbnail clicks and dropdown changes through one map-selection function so map, floor, site, blueprint, and strategy results cannot drift apart.

## 2026-09-24 — Installable PWA

- A relative manifest `start_url` and `scope` keep the same build valid under the GitHub Pages `/squadbook/` subpath and on localhost.
- iOS still benefits from explicit Apple standalone metadata and a 180 px touch icon in addition to the web manifest.
- Cache the static app shell and same-origin assets on demand, but bypass `data/supabase-config.json` entirely so offline support never stores connection configuration.
- Delete only old caches carrying the `squadbook-` prefix because GitHub Pages projects can share one origin; clearing every origin cache could interfere with another installed site.
- Serve cached static assets immediately while refreshing them in the background so future deployments do not leave an installed app permanently pinned to an old shared script or map catalog.
- Keep unsupported maps out of the runtime catalog rather than deleting their source assets; this preserves regeneration inputs while preventing UI selection or caching.

## 2026-09-29 — Standalone site setups

- A full strategy and a reusable site detail have different match-time jobs. Strategies retain operators and checkpoints; site setups contain only a short title, type, and visual references.
- Keeping both record types in the existing `strategies` table with an `entry_type` discriminator preserves the proven media, attribution, realtime, and editing paths without adding a parallel backend.
- Bomb-site results should always render strategies first and site setups second as a denser visual grid, so small cams and tricks remain immediately visible without pretending to be round plans.

## 2026-09-29 — Fast cached startup

- Static map data should not wait behind authentication or a remote strategy query; start both paths together and render the catalog as soon as its cached files resolve.
- Keep a small shared-data snapshot in local storage so repeat visits can render the last known profile, strategies, and setups immediately, then replace it after the authoritative Supabase refresh.
- A first-run local-to-shared migration should only trigger a second remote strategy load when it actually imported records.
- Setup type belongs to the setup as a whole. Per-photo tactical labels remain useful for mixed strategy galleries but are duplicate input for setup photo collections.
- When HTML and a separately cached data adapter change together, version the adapter URL as well as the service-worker cache. Otherwise a new Add Setup UI can call an old save payload that omits `entry_type`, causing the database default to classify it as a strategy.

## 2026-10-14 — Linux development recovery

- Added `start-local.sh` using Bash and Python, binding the local preview to loopback. The existing macOS launcher remains available. HTTP 200 startup verified on Linux.

## 2026-10-17 — Final source recovery checkpoint

- Added `RESTORE.md` and canonical `knowledge/current-handoff.md` with platform setup, current features, verification limits, optional backlog, and separate source versus cloud/browser-data backup procedures.
- Shared screenshot removal now follows successful database persistence; replacements get new paths. Database/upload failures preserve the saved media, and failed cleanup does not report a committed save as rejected. Six isolated failure/success checks cover this behavior.
- SQL NULL must be rejected explicitly before negated regex/bcrypt checks. Updated the schema's three PIN functions and supplied a minimal existing-project migration; live application is still pending owner access.
- Windows/Linux recovery launchers and all original history/assets are retained in the private recovery checkpoint. Python serves the app without a build; native Node runs offline checks. Private backup Actions are disabled to avoid deployment.
- A Git backup does not contain Supabase records/Auth/media, GitHub secret values, or browser-local content. A repaired Mac can restore source independently, then reconnect the existing service rather than create a replacement squad.

## 2026-10-18 — README visual demonstration

- Added actual mobile/desktop app captures and a four-step GIF walkthrough with labeled synthetic demo content. Bundled map references illustrate the photo editor without exposing private squad uploads.
- Documentation capture uses an ignored, separately served copy of `dist/`, with real shared config explicitly excluded. Demo data never enters the runtime catalog or a shared backend. Refresh instructions live in `docs/media/README.md`.

## 26 October 2026 — defense Power Spots

- Added an empty Defense-only Power Spots section before Strategies, matching the existing interface. Every spot has a title, multiple optional photos/notes, and one or more applicable bomb sites; multiple titles can share a site.
- Filter applicability through catalog sites, including secondary floors/sites, rather than relying on the record's compatibility site/floor. Keep Power Spots out of the strategy draft/count and Attack.
- Preserve the entry type and applicability through shared adapter saves/cache. Existing strategy/setup payloads omit the new column so they still work before migration. Prepared `supabase/migrations/20261026_power_spots.sql`; no live database changes or deployment performed.
- Verified project checks, expanded UI harness (including title/photo grouping and edit behavior), eight shared adapter tests, and isolated browser QA at 1440/768/390 with multi-photo save/reload/detail/edit. Screenshots and synthetic runner are under ignored `work/power-spots/`.
- See `knowledge/power-spots.md` and source request `raw/2026-10-26-power-spots.md`.

Deployment follow-up, 26 October 2026: user authorized publishing to the existing GitHub Pages URL. Owner-authenticated Supabase SQL editor applied the Power Spots migration; information_schema confirmed the non-null array column. No strategy/media records were changed by the migration.

## 29 October 2026 — lineup alternatives, Bank startup, Flank Watch

- Lineup slots store either a singleton operator ID or pipe-separated alternatives in the existing text array. Validate/split centrally before asset rendering; keep old singleton records compatible and group boundaries visible with overlapping icons and wider gaps. Strategies on both sides, Power Spots and Flank Watch support these lineups.
- Bank is now the startup map, with first-map fallback. Added Attack-only Flank Watch using the shared multi-site photo-entry editor; category/side metadata is centralized.
- Prepared the additive Flank Watch constraint migration; not applied to production. No squad records or media changed. Local shell v7 / adapter URL v6 coordinate the release. Current production remains 6ab4eeb.
- Meaningful UI and shared-adapter checks cover groups, legacy values, save/edit/remove, side restrictions, Power Spot/Flank Watch behavior and Bank selection. Isolated browser preview verifies actual interactions and responsive controls. See knowledge/operator-alternatives.md and knowledge/flank-watch.md.
Category-order clarification, 29 October: Attack displays Strategies followed by Flank Watch, with Site setups hidden and creation disabled. Defense keeps Power Spots, Strategies, Site setups. Legacy attack setup records are preserved in storage. Offline UI checks cover visibility, editor access and order.

29 October deployment: user authorized release to the existing URL. Verified prior source 6ab4eeb and prior live constraint definitions. Applied the transactional Flank Watch constraint expansion through owner-authenticated SQL editor; live introspection confirmed the expanded category list, Attack-only Flank Watch rule and unchanged Defense-only Power Spot rule. No row/media migration was needed.

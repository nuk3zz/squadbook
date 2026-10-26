# Squadbook current handoff — 17 October 2026

Scope: Squadbook only. Windows checkout `C:\Projects\squadbook`. This is the canonical resume point; older stage plans and dated learnings are historical context. Read `../RESTORE.md` for fresh Windows/Linux/macOS setup and backup boundaries.

Local feature follow-up, 26 October 2026: defense-only Power Spots precede Strategies, with multiple titled photo groups per site and multi-site applicability. See `power-spots.md`. Shared migration `supabase/migrations/20261026_power_spots.sql` was applied and verified against the existing production project on 26 October; frontend release to the existing GitHub Pages URL is authorized and prepared. Adapter URL is now v5 and shell cache v6. Earlier pending migrations remain pending.

Documentation follow-up, 18 October 2026: root README now includes a four-step mobile GIF and mobile/desktop screenshots in `docs/media/`. Captures use synthetic records in an ignored, isolated local copy; no production app data/source or shared backend changed. Refresh instructions and capture helpers are documented in `docs/media/README.md`. The pending backend migration and cloud-data backup below remain pending.

## Source and hosting

- Local checkpoint branch: `recovery/20261017-final-checkpoint`, based on public `main` at `87b17f6e9db3efe7b87d0eab0ebb594d31a5901b`. The checkpoint commit is identified by `git log -1`; local receipt and remote verification are under `C:\Projects\_handoff\squadbook-final-20261017`.
- Private source/history backup: https://github.com/nuk3zz/squadbook-private-backup, default branch `main`, remote name `private-backup`. GitHub Actions disabled before the first push.
- Public source/deployment remains https://github.com/nuk3zz/squadbook (`origin`), main at the base commit above. Every push to its `main` deploys GitHub Pages. This checkpoint does not push there or change the live app.
- Existing recovery changes (Linux learning and Windows/Linux launchers) are included without overwriting their content. Original Mac launcher and full reachable Git history are retained.
- No ChatGPT subscription, SDK, framework, npm dependency installation, or paid local service is needed to serve or edit the static app. Python 3 serves it; optional Node runs offline checks.

## Implemented features

The dependency-free mobile-first app supports 26 selectable maps and 100 current selectable Bomb sites. Original metadata/assets also retain excluded maps. Match flow is map → Attack/Defense → optional floor/site filter → strategy/setup photo reference.

Implemented: compact exterior-photo map picker; optional full-screen floor blueprints with pinch and Ctrl/Command zoom/pan; side-specific operator recommendations; draft default plans that save only on user action; strategy and separate camera/gadget/angle/trick setups; screenshot upload/paste/camera and notes; creator/latest-editor attribution; local persistence; optional Supabase anonymous sessions, five-player profiles and four-digit PIN recovery; private shared images, realtime refresh and cached startup; installable iOS/Android PWA and static GitHub Pages workflow.

Main files: `dist/index.html` holds UI/styles; `dist/assets/shared-store.js` holds local/shared persistence; `dist/sw.js` and `manifest.webmanifest` hold the PWA shell; `dist/data` and `dist/assets` hold runtime data/assets; `supabase/schema.sql` defines backend tables/functions/policies/buckets. Keep reference-source material in `raw/`, approved decisions in `knowledge/`, and media separate from records.

## Final audit changes

1. Shared screenshot edits now commit metadata before removing obsolete images. Replacements upload to a new versioned path so an upload/database failure cannot destroy the currently saved screenshot. Failed post-commit cleanup warns while returning the committed save. Six synthetic adapter tests cover success and failures. A failed database write may leave an unused new upload; do not delete unknown objects blindly. A separate owner-reviewed orphan sweep could be added later.
2. App adapter URL is `shared-store.js?v=4`; PWA shell is `squadbook-shell-v5` so a later release can load this fix coherently. These versions are local/private-backup only until explicitly released.
3. SQL PIN entry points explicitly reject NULL inputs. Previously the negated regex and bcrypt comparison could evaluate to SQL NULL rather than true, letting a direct null-PIN claim fall through. New-project `schema.sql` and minimal existing-project migration `supabase/migrations/20261017_reject_null_pins.sql` match. **Migration is pending on the live backend.** No service credentials were added and no backend mutation was performed.
4. Added a full restoration guide, canonical handoff, asset/syntax validation, and LF rules for Unix launchers. Windows/Linux recovery launchers are committed with the checkpoint; the Linux launcher is executable in Git.

## Verification

- Windows native Node: `node scripts/check-project.mjs` passes JavaScript/JSON syntax, 26 maps, 100 sites, 76 side-roster operator references, runtime asset/PWA references, matching adapter versions, and Unix launcher LF checks. Additional preserved operator assets remain in source.
- Existing `node scripts/check-match-ui.mjs` passes side/floor/site filtering, virtual defaults without writes, editor-owned location/floor, setup classification, save visibility, and creator/editor identity, using only synthetic records.
- `node --test scripts/check-shared-store.mjs`: six tests pass, including rejected database saves, rejected uploads, replacement path preservation/order, cleanup failure, and metadata-only saves. No network/Supabase account is used.
- PowerShell launcher parsing passes; checked launcher serves homepage and versioned adapter locally. Browser QA uses an unconfigured **Local only** store and synthetic profile/strategy: map/side selection, blueprint open/close, changing editor site, save, and reload persistence checked at mobile and desktop sizes. Preview is stopped at completion.
- Linux preview HTTP 200 was recorded on 14 October; no native Linux execution occurred on 17 October. The preserved Mac launcher has not been executed on a repaired Mac. Fresh-machine acceptance remains to be done there.
- SQL migration has local source review only: no PostgreSQL runtime or owner Supabase session was available. Valid/incorrect/null PIN acceptance and shared uploads/realtime remain unverified against the live service in this audit. No customer/squad records were touched.
- Source and reachable history are scanned for recognized credential/private-key patterns before upload. Exact checkpoint, file hashes, Git bundle verification, private visibility, and matching remote SHA are recorded in the local backup receipt.

## Remaining work and exact next step

The source is ready for preservation/resumption. The next operational step is owner-authenticated application/verification of the small null-PIN migration to the EXISTING Supabase project, plus a separate cloud database/Auth AND media backup. Neither is included in the source backup. Then explicitly review/release the frontend screenshot fix through the public repository's existing workflow when desired; release was not part of this preservation push.

Optional backlog: owner-only export/import (needs an actual admin boundary; never embed a service key), external video links/short uploads if the squad needs them, optional custom domain, and real-match usability/phone acceptance. Compressed images and server-side image size/type limits already exist. Do not invent a new platform or mark those optional features complete.

For a repaired Mac: clone private backup, install native Git/Python, run `bash ./start-local.sh`, execute the three offline check commands, and reconnect the existing backend using owner-held browser-safe config and player PIN. Do not recreate the database, transfer OS dependencies, overwrite dirty Linux work, or copy credentials between machines.

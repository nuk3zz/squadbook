# Siege Playbook — lean build plan

## Product definition

A private, screenshot-led memory aid for a five-person Rainbow Six Siege squad. The match-time path is:

`Map → Side → Bomb site → Strategy → Visual reminder`

Long descriptions, comments, ratings, seasonal history, and encyclopedia-style content are out of scope.

## Stage 1 — Interaction prototype

Status: complete.

- Responsive match-time selection flow.
- Clubhouse sample data.
- Attack and defense selection.
- Four Clubhouse bomb-site choices.
- Two compact CCTV/Cash attack strategies.
- Visual reference slots, operator roles, short checkpoints, and author color.
- No account, upload, hosting, or database work.

## Stage 2 — Simple content editor

- Status: complete.
- Completed first: mobile-first layout refinement and a Mac Mini LAN trial server.
- Completed visual foundation: 29 selectable maps, an automated compact blueprint exporter, and 81 locally stored operator icons.
- Completed lightweight identity: each device creates a name-and-photo player profile with no email, password, or verification; tapping the header profile edits it.
- Removed prototype player names and strategies so real squad content starts clean.
- Completed strategy editor: add/edit/delete local strategies, select up to five operator icons, enter four short checkpoints, and attach plant/post-plant images.
- Completed bomb-site catalog: 104 selectable sites across the 27 maps whose source blueprints contain Bomb objectives; arcade-only Close Quarters and District correctly show no Bomb sites.
- Bomb-site IDs are stable across callout-name changes, and the four earlier Clubhouse IDs migrate when old local strategies are loaded.
- Completed author attribution through the active lightweight player profile.
- Completed local browser persistence while the editor is tested.

Optional gadget references were deliberately left out to keep the match-time tool visual and lightweight. They can be added later only if the squad finds a real need for them.

## Visual-content decision

- A selected floor blueprint appears above the strategy list and is carried into the opened strategy.
- Each floor is automatically cropped around the playable layout and exported as an 800 px JPEG.
- One finger keeps scrolling the page normally; two fingers zoom and move the blueprint up to 4x on phones.
- Strategy operator recommendations use icons as the primary language; names remain available as accessibility labels and hover titles.
- Huge source SVGs are used only during export and immediately discarded; the runtime serves compact local JPEGs with no internet dependency.

## Stage 3 — Shared squad version

- Status: complete and connected to the squad's Supabase project.
- Added anonymous session support with no email, password, or verification step.
- Added shared player profiles, strategies, private image paths, and realtime strategy refresh.
- Added automatic one-time migration of the current browser's local profile and strategies.
- Added a visible `Local only`, `Shared`, or `Local fallback` connection state.
- Everyone in the authenticated squad app can add, edit, and delete strategy content; only a player can edit their own profile.
- Kept only `Added by` attribution in strategy records.

## Stage 4 — Media and backup

- Completed compressed shared image uploads for avatars, plant spots, and post-plant angles.
- Add short-video uploads only if image references and external links prove insufficient.
- Support external video links.
- Add an owner-only export/import backup.
- Enforce small file limits to keep hosting inexpensive.

## Stage 5 — Publish and match test

- Deploy the static site through GitHub Pages, injecting the ignored Supabase browser configuration from repository secrets.
- Test on phones and second monitors during real matches.
- Remove any interaction that slows down map-to-strategy access.
- Add offline caching only if the squad actually needs it.

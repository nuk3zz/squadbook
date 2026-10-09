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
- Completed visual foundation: 26 squad-approved selectable maps, an automated compact blueprint exporter, and 81 locally stored operator icons. Bartlett University, Close Quarters, and District are intentionally excluded from the app.
- The compact two-row homepage map picker uses authentic exterior photos. Attack/Defense buttons and floor/site chips replace the duplicate visible dropdowns; all sites are shown initially, with locations on each compact photo card.
- Completed lightweight identity: each device creates a name-and-photo player profile with no email, password, or verification; tapping the header profile edits it.
- Removed prototype player names and strategies so real squad content starts clean.
- Completed strategy editor: add/edit/delete strategies, optionally select any number of side-specific operator icons including ban backups, enter four short checkpoints, and attach any number of generic photo-and-note references.
- Added standalone site setups for reusable cams, gadget placements, angles, lineups, and tricks. They belong directly to the selected map, side, and Bomb site, use a lightweight photo-first editor, and appear in their own grid after full strategies.
- Startup now renders cached map, profile, strategy, and setup data immediately while shared Supabase data refreshes in the background. Setup photos inherit their parent setup type; only full-strategy photos expose individual filter labels.
- Strategy and setup cards carry explicit compact type markers. The versioned shared-store script prevents an older cached save adapter from silently storing a newly created setup as a strategy.
- Editing includes an unobtrusive collapsed control for moving an accidentally misplaced strategy to another bomb site on the same map; the destination site supplies the correct floor automatically.
- Completed bomb-site catalog: 104 selectable sites across the 27 maps whose source blueprints contain Bomb objectives; arcade-only Close Quarters and District correctly show no Bomb sites.
- Bomb-site IDs are stable across callout-name changes, and the four earlier Clubhouse IDs migrate when old local strategies are loaded.
- Completed creator and latest-editor attribution through stable player profiles, including compact overlapping photo-or-initials avatars and both names when different players contribute.
- Completed local browser persistence while the editor is tested.

Optional gadget references were deliberately left out to keep the match-time tool visual and lightweight. They can be added later only if the squad finds a real need for them.

## Visual-content decision

- Blueprint is hidden and unloaded by default on both the homepage and detail screen. A small `Blueprint` action opens the existing full-screen viewer with floor buttons; Close returns to the photo-first view.
- Strategies and setups use two-column mobile photo cards with yellow and green borders respectively. The first reference is the card thumbnail, with a map-photo fallback for strategies. Empty map sides offer virtual default-plan drafts, persisted only after a player saves them.
- Each floor is automatically cropped around the playable layout and exported as an 800 px JPEG.
- One finger keeps scrolling the page normally; two fingers zoom and move the blueprint up to 4x on phones. Desktop blueprints fit fully at 1x, use Ctrl/Command plus wheel to zoom, and Ctrl/Command plus drag as a hand tool.
- Roof layers are hidden from the match-time floor selector, and the embedded desktop blueprint is height-limited while Expand retains the large view.
- Strategy operator recommendations use plain icons as the primary language; Attack and Defense show only their corresponding roster, and names remain available as accessibility labels and hover titles.
- Every visual reference is a screenshot plus optional short note and a side-specific tactical label. The strategy view shows only labels actually used and can filter the gallery without changing the saved order. Desktop users can choose a file or paste a screenshot with Ctrl/Command+V; phone users also get a dedicated rear-camera action without losing the gallery picker.
- Huge source SVGs are used only during export and immediately discarded; the runtime serves compact local JPEGs with no internet dependency.

## Stage 3 — Shared squad version

- Status: complete and connected to the squad's Supabase project.
- Added anonymous session support with no email, password, or verification step.
- Added four-digit PIN recovery so the same player profile can be linked on another browser or phone, with a five-player roster cap and failed-attempt cooldown.
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

- Status: deployed; awaiting real match testing and an optional custom domain.
- The static site deploys through GitHub Pages, injecting the ignored Supabase browser configuration from repository secrets.
- The site includes a manifest, iPhone touch icon, standalone display metadata, and a same-origin service worker so it can be installed from Safari as a PWA.
- Offline caching covers the app shell and static assets as they are used; the live Supabase configuration and remote shared data are deliberately never intercepted.
- Test on phones and second monitors during real matches.
- Remove any interaction that slows down map-to-strategy access.
- Add offline caching only if the squad actually needs it.

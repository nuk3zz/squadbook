# Restore Squadbook on Windows, Linux, or a fresh Mac

Checkpoint: 17 October 2026. Start with `CODEX.md` and `knowledge/current-handoff.md`. This file is sufficient to resume without the old computer or its chat history.

## What is saved

Private repository: https://github.com/nuk3zz/squadbook-private-backup

It contains the application, all checked-in map photos/blueprints/operator icons, pinned Supabase browser library, SQL schema and pending migration, source/reference notes, original Git history, local launchers, offline checks, and this handoff. GitHub Actions are disabled there, and it is a recovery source rather than a deployed site.

The public https://github.com/nuk3zz/squadbook repository remains the production source for https://nuk3zz.github.io/squadbook/. Its `main` push workflow deploys automatically. The recovery checkpoint has not been released there.

The local Windows backup also has a verified Git bundle and SHA-256 manifest in `C:\Projects\_handoff\squadbook-final-20261017`. Keep that folder on a separate owner-controlled drive for a second offline copy when convenient.

## Fresh computer

Install native Git and Python 3 from their official installers or the operating system's package manager. Node.js 22 or newer is only needed for development checks, not serving the app. Enroll GitHub access separately on the new computer; do not copy browser sessions, access tokens, or another OS's tools.

Choose a native directory: `C:\Projects` on Windows, `/home/nuke/Desktop/Projects` on this Linux installation, or a directory such as `~/Projects` on the Mac. In that directory:

```text
git clone https://github.com/nuk3zz/squadbook-private-backup.git squadbook
cd squadbook
git status --short --branch
git log -1 --oneline
```

The private repository's default `main` is the recovery checkpoint. A fresh clone calls this private remote `origin`; rename it before adding the public deployment remote, so the names match the existing Windows checkout:

```text
git remote rename origin private-backup
git remote add origin https://github.com/nuk3zz/squadbook.git
git remote -v
```

Do not push to public `origin/main` as part of restoration. The private checkpoint is ahead of the public app and includes a pending backend migration.

If restoring from the local bundle instead, first run `git bundle verify <absolute-path-to-bundle>`, then clone it into a NEW folder with `git clone --branch recovery/20261017-final-checkpoint <absolute-path-to-bundle> squadbook`. That clone's `origin` points at the bundle; remove that local-file remote and add the two HTTPS remotes above. Never clone over an existing project.

## Start and check

Windows, from the repository folder:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\start-local.ps1
```

Linux or macOS:

```bash
bash ./start-local.sh
```

Open http://127.0.0.1:4173 and press Ctrl+C in the server terminal when finished. There is no npm install or build step. If Python is missing on a fresh Mac, install native Python 3 first. Running the shell script through Bash avoids Finder executable/quarantine issues.

The preserved `start-local.command` is a macOS LAN-sharing launcher: `./start-local.command` binds to all interfaces and prints the Mac's Wi-Fi address for trusted local phones. Do not forward its port on a router. Windows/Linux launchers bind only to loopback.

With native Node installed:

```text
node scripts/check-project.mjs
node scripts/check-match-ui.mjs
node --test scripts/check-shared-store.mjs
```

Then confirm a local profile, map/side/site selection, draft strategy save, reload persistence, and blueprint open/close. Local test content stays in that browser/origin. Use an isolated browser profile or a different local port for future tests so you do not disturb existing local-only content. Do not add shared configuration until synthetic test content has been removed or you are using a fresh isolated browser: the app can migrate local strategies automatically.

## Restore the existing shared connection

The source runs in **Local only** mode until configured. Real configuration, backend credentials, GitHub Actions secrets, database rows, uploaded screenshots/avatars, profile PINs, and browser-local content are not included in the source backup.

1. Sign in to the owner's existing Supabase account/project. Do not create a new project or rerun the full schema on the existing service as a routine restoration step.
2. Copy `dist/data/supabase-config.example.json` to the ignored `dist/data/supabase-config.json` and fill its URL and browser-safe publishable/anonymous key from that existing project's dashboard. Never use a secret/service-role key. The production GitHub repository has secret names `SQUADBOOK_SUPABASE_URL` and `SQUADBOOK_SUPABASE_PUBLISHABLE_KEY`; their values cannot be recovered by listing GitHub secrets.
3. Use a clean browser profile for shared verification. Open the local app, confirm **Shared**, choose the existing player, and enter that player's PIN. A fresh Mac does not inherit anonymous browser sessions. Never make a new player merely to replace an existing one; the roster is limited to five.
4. Before live acceptance, review/apply `supabase/migrations/20261017_reject_null_pins.sql` in the existing project's owner-authenticated SQL Editor. It replaces only the three PIN function bodies in a transaction, preserving grants and records. It explicitly rejects SQL NULL PINs; `schema.sql` includes the same fix for new installations.
5. After migration, verify valid-PIN recovery and rejection of null/incorrect PINs with a disposable test profile/environment. The migration has been reviewed locally but has not been executed against PostgreSQL or the live project during this checkpoint.

If the old Mac was the only browser holding a profile that never had a recovery PIN set, owner-assisted database recovery is a separate task. Do not reset the squad or overwrite identities to bypass it.

## Separate content backup

Git restores the app and its schema, not the live squad. A complete content backup requires owner-authenticated exports from the existing Supabase project:

- Database backup covering the squad tables (`profiles`, `profile_devices`, `profile_pin_attempts`, `strategies`), functions/policies, and required Auth identities. Profile IDs reference `auth.users`; a public-tables-only dump is not a complete restore.
- The actual files and paths from both private Storage buckets, `avatars` and `strategy-media`. A database dump alone does not include their binary content. Preserve referenced paths and object metadata for restoration.
- The browser-safe connection values in an owner-controlled configuration/password store, and separate secure retention of project/account recovery access. Never commit passwords, service keys, PINs, session tokens, or unencrypted database/auth exports.
- Local-only browser strategies/profile/media, if used, exported from that specific browser/origin before clearing or replacing it. These are not automatically present in Supabase. Do not use a cached shared snapshot with expiring signed image URLs as a complete media backup.

Use the owner's supported backup/download workflow and store encrypted backups separately. No cloud-data/media export was performed by this checkpoint, and no Supabase owner session was available in this Windows checkout. Do not claim that the live squad is backed up merely because the code is on GitHub.

## Existing Windows/Linux checkouts

Preserve their dirty changes before fetching. Fetch `private-backup`, inspect the diff against `private-backup/main`, and bring reviewed changes onto a separate branch. Never reset, blindly pull, or apply a second copy of an already present recovery patch. Python, Node, caches, and browser configuration remain native to each OS.

Before an OS switch, stop the preview and update the shared workspace `OS_HANDOFF.md`. Follow the workspace's NTFS safety rules; do not force a hibernated, dirty, or read-only Windows volume writable from Linux.

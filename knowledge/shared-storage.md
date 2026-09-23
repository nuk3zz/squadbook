# Shared storage architecture

Processed from `raw/2026-09-24-shared-squad-request.md`.

## Decision

Use Supabase for anonymous authentication, Postgres records, private image storage, and lightweight realtime notifications. Keep the static app deployable to Cloudflare Pages and runnable from the existing Mac Mini server.

## Runtime flow

1. The browser creates or resumes a Supabase anonymous session.
2. The player enters only a display name and optional avatar.
3. Profiles and strategies are written under the authenticated role with row-level security enabled.
4. Strategy screenshots are compressed in the browser, then uploaded to a private bucket.
5. The database stores only media paths. Short-lived signed URLs are created when records are loaded.
6. A Postgres Changes subscription reloads strategies after any squad member inserts, updates, or deletes one.

## Local fallback and migration

- Empty Supabase configuration keeps the existing local-storage behavior.
- The UI clearly reports `Local only` or `Shared` mode.
- On the first successful shared connection, the current local profile is adopted by the anonymous account.
- Existing local strategies are uploaded once and attributed to the current anonymous profile.
- A project-specific migration marker prevents duplicate uploads.

## Security boundary

- Only the Supabase project URL and publishable/anonymous key belong in browser code.
- A service-role key must never be placed in the app or committed to the project.
- Anonymous users receive the `authenticated` database role. Table and storage policies therefore grant only the operations the playbook needs.
- Strategy media and avatars remain in private buckets and are read through expiring signed URLs.
- This version does not restrict membership to a known five-person roster. Anyone who obtains the final URL can create an anonymous account, so a squad gate can be added before public deployment if the chosen domain is discoverable.

## Data shapes

### profiles

- `id`: anonymous auth user UUID
- `display_name`: short player name
- `avatar_path`: private storage path, optional
- timestamps

### strategies

- `id`: stable client-generated text ID
- map, side, site, floor, title
- denormalized author name plus author profile UUID
- operator ID array
- checkpoint array
- optional plant and post-plant media paths
- timestamps


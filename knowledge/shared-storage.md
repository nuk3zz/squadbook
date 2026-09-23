# Shared storage architecture

Processed from `raw/2026-09-24-shared-squad-request.md`.

## Decision

Use Supabase for anonymous authentication, Postgres records, private image storage, and lightweight realtime notifications. Keep the static app deployable through GitHub Pages and runnable from the existing Mac Mini server.

## Runtime flow

1. The browser creates or resumes a Supabase anonymous session.
2. A new player enters a display name, optional avatar, and four-digit recovery PIN.
3. On another browser or phone, the player selects the existing profile and enters that PIN; the new anonymous session is linked to the same profile.
4. Profiles and strategies are written under the authenticated role with row-level security enabled.
5. Strategy screenshots are compressed in the browser, then uploaded to a private bucket.
6. The database stores only media paths and short notes. Short-lived signed URLs are created when records are loaded.
7. A Postgres Changes subscription reloads strategies after any squad member inserts, updates, or deletes one.

## Local fallback and migration

- Empty Supabase configuration keeps the existing local-storage behavior.
- The UI clearly reports `Local only` or `Shared` mode.
- On the first successful shared connection, the current local profile is adopted by the anonymous account.
- Existing local strategies are uploaded once and attributed to the current anonymous profile.
- A project-specific migration marker prevents duplicate uploads.

## Security boundary

- Only the Supabase project URL and publishable/anonymous key belong in browser code.
- A service-role key must never be placed in the app or committed to the project.
- Anonymous users receive the `authenticated` database role. Strategy and strategy-media policies require a linked player profile.
- PINs are bcrypt-hashed in Postgres and never returned to the browser. Five failed claims pause that anonymous session for 15 minutes.
- Profile creation is capped at five players, matching the squad roster.
- Strategy media and avatars remain in private buckets and are read through expiring signed URLs.
- Until all five roster slots are filled, someone with the public URL could still create a remaining profile. A separate squad invite code can be added later if this becomes a practical concern.

## Data shapes

### profiles

- `id`: anonymous auth user UUID
- `display_name`: short player name
- `avatar_path`: private storage path, optional
- `pin_hash`: server-only bcrypt hash, never selectable by browser clients
- timestamps

### profile_devices

- maps each browser's anonymous auth UUID to the selected stable player profile UUID
- written only by security-definer profile creation and PIN-claim functions

### strategies

- `id`: stable client-generated text ID
- map, side, site, floor, title
- denormalized author name plus author profile UUID
- latest editor name plus profile UUID, shown only when different from the creator
- operator ID array
- checkpoint array
- legacy plant and post-plant media paths, retained only for backward-compatible migration
- `visual_references`: ordered JSON array of image paths, side-specific labels, and short notes
- timestamps

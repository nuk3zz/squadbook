# Connect Squadbook to Supabase

The app is already prepared for shared mode. Do these steps once when the Supabase project is available.

1. Create a free project at <https://supabase.com/dashboard>.
2. In Authentication settings, enable **Anonymous Sign-Ins**.
3. Open the SQL Editor, paste all of `supabase/schema.sql`, and run it once.
4. Open the project's API settings and copy only:
   - Project URL
   - Publishable key (`sb_publishable_...`) or the legacy anonymous key
5. Copy `dist/data/supabase-config.example.json` to `dist/data/supabase-config.json`.
6. Put those two browser-safe values in the new local config file. It is ignored by Git and must stay untracked.
7. Reload Squadbook. The header should change from **Local only** to **Shared**.

Never copy a secret key or `service_role` key into the config file. Those credentials bypass row-level security and must not be used in a browser.

On the first shared load, the current device profile and local strategies are uploaded automatically. Images are kept in private buckets and loaded through expiring signed URLs.

## Verification

1. Open the website on two different devices.
2. Create a different player profile on each device.
3. Add a small test strategy on the first device.
4. Confirm it appears on the second device without reloading, or after one reload if Realtime is still connecting.
5. Edit it on the second device and confirm the first device receives the change.

The custom domain is connected later in Cloudflare after the static site has been deployed successfully.

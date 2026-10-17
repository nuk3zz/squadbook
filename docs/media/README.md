# README demonstration media

Captured from the actual app on 18 October 2026 using synthetic local-only records. These images contain no real squad profiles, Supabase configuration, or private gameplay screenshots. The sample photo references are already-bundled Club House blueprints/exterior imagery; existing credits in the root README and `THIRD_PARTY_NOTICES.md` apply.

- `walkthrough.gif`: four labeled steps, approximately 10 seconds, loops continuously. Still screenshots are available in the root README for readers who prefer them.
- `mobile-browse.png`, `mobile-strategy.png`, `mobile-blueprint.png`: the corresponding mobile views.
- `desktop-overview.png`: the playbook on a wider display.

## Refresh the captures

Use `python` on Windows or `python3` on Linux/macOS in the commands below.

1. From the repository root, run `node scripts/prepare-readme-demo.mjs`. This makes an ignored `work/readme-demo/site` copy with synthetic records; it excludes real Supabase config files. If that directory already exists, provide a new unused output path as the argument instead of overwriting it.
2. Serve that copy on a dedicated local origin: `python -m http.server 4187 --bind 127.0.0.1 --directory work/readme-demo/site`. Never serve the seeded copy on the normal app port or add a shared config to it.
3. Use a mobile browser viewport around 390 × 844. Capture the map browser, select `2F CCTV / Cash`, open `CCTV / Cash execute`, then open `Blueprint`. Save the four captures as `01-map.png`, `02-site.png`, `03-plan.png`, and `04-blueprint.png` in `work/readme-demo/frames`. Copy the last three to the corresponding `mobile-*.png` files here.
4. At a desktop viewport around 1280 × 900, return to the playbook and choose `All sites`; capture `desktop-overview.png`.
5. With Python/Pillow available, run `python scripts/make-readme-gif.py`. The script adds step captions outside the app captures and normalizes the canvas without stretching the screenshots. Optional `--frames` and `--output` arguments accept alternate paths. Pillow is only a documentation tool; the app still needs no packages/build step.
6. Inspect the animation and stills, stop the temporary server, and reset any browser viewport override. Keep the demo site/raw frames under ignored `work/`, not in `dist/`.

Only documentation, capture helpers, and these media files need to change when refreshing the README demonstration.

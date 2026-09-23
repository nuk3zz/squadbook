# Squadbook

A mobile-first visual strategy playbook for Rainbow Six Siege squads. Pick a map, side, and Bomb site, check the floor blueprint, then open a compact screenshot-led strategy.

**Live app:** [nuk3zz.github.io/squadbook](https://nuk3zz.github.io/squadbook/)

## Features

- 29 selectable maps and 104 Bomb-site definitions
- Compact floor blueprints and side-specific operator icons
- Mobile pinch-to-zoom and desktop Ctrl/Command-wheel blueprint zoom
- Lightweight player profiles with no email or verification code
- Unlimited labeled screenshot-and-note references with gallery filters, file upload, or clipboard paste
- Creator and latest-editor profile attribution with compact avatars
- Four-digit profile recovery across browsers and devices
- Optional Supabase sharing, private media storage, and realtime refresh

Squadbook uses plain HTML, CSS, and JavaScript with no build step.

## Run locally

Python 3 is the only requirement.

```bash
git clone https://github.com/nuk3zz/squadbook.git
cd squadbook
python3 -m http.server 4173 --directory dist
```

Open `http://127.0.0.1:4173` on the same computer. To use another device on the same local network, run `start-local.command` and open the address it prints. Do not expose or forward port 4173 on your router.

## Shared squad mode

The app works locally without an account or backend. To share profiles and strategies across devices, connect a Supabase project by following [SHARED-SETUP.md](SHARED-SETUP.md).

The real `dist/data/supabase-config.json` file is intentionally ignored by Git. Only the browser-safe publishable key belongs in that file—never add a Supabase secret or service-role key.

Every push to `main` deploys the contents of `dist/` to GitHub Pages. A custom domain can be attached later.

## Data sources and credits

- Map references: [R6Calls](https://www.r6calls.com/)
- Operator references: [r6operators](https://github.com/marcopixel/r6operators)

Rainbow Six Siege and its related names and assets are property of Ubisoft. This is an unofficial fan-made squad tool and is not affiliated with Ubisoft.

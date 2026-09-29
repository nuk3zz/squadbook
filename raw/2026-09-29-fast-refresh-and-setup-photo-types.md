# Fast refresh and setup photo type request

Source: user requests on 2026-09-29.

- A refresh currently leaves the useful interface waiting on shared Supabase startup for roughly two to three seconds.
- Render the static map catalog and the last known shared profile/content immediately, then refresh shared data in the background.
- A standalone setup already has one setup type at the top of its editor.
- Do not ask for a second type on every photo inside a setup.
- Full strategies still need individual photo labels because their mixed reference gallery uses those labels for filtering.
- Replace the vague `Ready to run` card tag with a compact content-type marker.
- Strategy cards should say `Strategy`; setup cards should say `Setup` together with their setup type.
- Correct the existing `3 Cross Angle Echo Drones` entry, which was created through Add Setup but saved as a strategy because an older cached storage script was still active.

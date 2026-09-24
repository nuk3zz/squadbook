# Strategy editor and profile recovery request

Source: user request on 2026-09-24.

- Remove Roof from the floor selector because it is not useful for strategy recall.
- Reduce the desktop blueprint height so strategy cards appear without excessive scrolling.
- Keep operator selection optional.
- Replace the two fixed strategy images with addable visual references, each containing an image and short note.
- Give each visual reference a side-specific label so a long gallery can be filtered quickly.
  - Attack: Plant Spot, Map Control, Walls to Breach, LOS (Line of sights), Smoke / Sense, Drone Placements, Vertical Play, Other.
  - Defense: Rotations, Map Control, Walls to Hold, LOS (Line of sights), Camera Placements, Vertical Play, Other.
- Let desktop users paste a screenshot into a focused reference box with Ctrl/Command+V.
- Recover the same player profile on another browser or device with a four-digit PIN.
- The intended roster is four to five players.
- Show the strategy author's small circular profile photo between `Added by` and their name, falling back to initials when no photo exists.
- When a different player edits a strategy, retain the original creator and show overlapping creator/editor avatars plus both `Added by` and `Edited by` names.
- Fit the whole blueprint inside the desktop viewer at 1x instead of clipping it, and support Ctrl/Command plus mouse drag as a hand tool while retaining two-finger mobile gestures.
- Keep reference thumbnails unobstructed by removing the numbered `Reference 1`, `Reference 2`, and similar overlays; show only the tactical label and optional note below.
- Add a compact `01`, `02`, `03` sequence beside the text label below each thumbnail. Restart at `01` for every strategy and preserve the original number while filtering.
- Keep the homepage blueprint unchanged, but collapse it by default inside an opened strategy so visual references appear first; Expand opens the blueprint and Close returns it to the collapsed state.
- Add a compact, collapsed `Wrong bomb site? Move strategy` control to Edit. Choosing another bomb site moves the strategy and updates its floor automatically without occupying normal editor space.
- Keep a fitted blueprint centered while zooming, provide reliable Ctrl/Command plus mouse dragging, and default new Attack visual references to `Plant Spot` (`Rotations` for Defense).
- Remove the five-operator recommendation cap so strategies can include backup choices when suggested operators are banned.
- Make strategy-detail attribution a very small avatar/name chip, remove the collapsed blueprint card from the content flow, and use a small `Blueprint` text action beside the map/site line to open the full-screen map. Keep the homepage blueprint unchanged.
- Give every visual reference a separate mobile `Camera` action that requests the rear camera, while preserving the normal gallery picker and desktop clipboard paste.

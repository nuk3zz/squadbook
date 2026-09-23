# Project instructions

## Product rule

This is a private, lightweight Rainbow Six Siege visual playbook for a small friend group. Optimize every screen for quick recall during operator selection. Do not turn strategy entries into long-form guides.

## Code conventions

- Keep the app dependency-free until shared storage or authentication requires a backend.
- Prefer plain, readable HTML, CSS, and JavaScript.
- Keep strategy content in structured data rather than hard-coded presentation markup.
- Design mobile-first, then confirm desktop/second-monitor use.
- Use short labels and visual references; avoid explanatory paragraphs in the play interface.
- Keep uploaded media separate from the strategy records.

## Knowledge structure

- `raw/`: screenshots, rough notes, map lists, operator lists, gadget lists, and source drops that have not been normalized.
- `knowledge/`: approved product decisions, data shapes, screen flows, and processed source summaries.
- Cross-reference processed material back to its source filename when applicable.

## Raw-input protocol

1. Inspect new files in `raw/` before changing product data.
2. Convert confirmed facts into a concise page under `knowledge/`.
3. Keep ambiguous names or locations marked as unconfirmed.
4. Do not delete the source file after processing it.
5. Update `learnings.md` after implementation or debugging work.

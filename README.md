# Annotation Platform · visual demo

A self-contained, single-page product tour of the OASIS Lab annotation
platform, for introducing the project to researchers, IRB reviewers and
collaborators who will not read the code.

**Open it:** double-click `index.html`. No server, build step, network access
or fonts are required. It works from `file://` in Chrome, Edge and Firefox.

**What it is not:** a working annotation tool. Nothing is uploaded or stored
anywhere. Every account, post, transcript, label and agreement number is
fictitious and generated on the page from a seeded random generator, so the
same numbers appear on every visit. Media are drawn placeholders, never real
videos or screenshots.

## Sections

| # | Hash | What it shows |
|---|------|---------------|
| 1 | `#annotator` | One annotator's path in a browser frame: sign in → consent → My Tasks → training (5 worked examples + 5 practice items) → Mental Health safety orientation → task advisory → the three-column workspace → task complete |
| 2 | `#manager` | The staff console: Upload (dry run, then commit), Datasets, Tasks (activate / pause / archive, split items with an overlap), Progress (per-annotator counts, needs-review list, percent agreement and Cohen's κ, the two-reviews-per-post agreement lab with a blinded third review and majority labels), Accounts, Training & Gold, Topics & Forms (versioned codebooks), Exports (a real CSV/JSON file is generated in the browser) |

The two sections share one in-memory state. Labels saved in section 1 appear
in section 2's Progress and agreement numbers at once. Pausing a task in
section 2 locks the card in section 1. "Reset demo" in the top bar returns
everything to the starting state.

The page is written for readers who are not engineers. File paths and
function names sit behind "For technical readers" toggles.

## What is real

- The three codebooks (Mental Health v2, Immigration v3, Cancer misinformation
  v1): field ids, labels, options, definitions, show/require conditions and
  cross-field rules, with the same validation messages as the server.
- Keyboard shortcuts in the workspace: `↑`/`↓` or `j`/`k` move between items,
  `1`–`9` pick the primary label, `s` saves and moves on, `x` skips.
- Item splitting with an overlap (each item held by exactly N people).
- Agreement: pairwise percent agreement and Cohen's κ with skipped and
  prefer-not-to-view items excluded, plus majority vote after a third review.
- The Mental Health safety layer: versioned orientation, Safety & Support
  drawer, Take a break (media covered), Save & leave, Prefer not to view
  (item removed without replacement), Stop Mental Health assignments.

## Files

- `index.html` — page shell, inline icon sprite, the two sections, dialog and toast
- `styles.css` — tokens mirrored from the product's stylesheet, all components, breakpoints, print
- `engine.js` — splitting, agreement (κ), majority vote, form evaluation, keyboard map, formatters
- `data.js` — synthetic topics, forms, users, datasets, tasks, items, training examples, safety policy, consent, label generator
- `app.js` — state, hash router, event delegation, dialog, toast, animation sequencer
- `views-annotator.js`, `views-manager.js` — the two sections

## Privacy

No real usernames, participant ids, post text, contact details or media
appear anywhere. Email addresses use the reserved `.example` domain.
Mental Health example posts are deliberately mild (exam stress, sleep,
burnout) and never describe self-harm.

## Licence

Copyright (c) 2026 Pooriya Jamie, OASIS Lab. All rights reserved. The demo
may be viewed but not copied, modified, hosted or reused without written
permission; see `LICENSE`. Interested in using the platform? Contact OASIS Lab
at https://oasislab.science/.

# Design direction — Six Words Live

## 1. Aesthetic direction

**Editorial serif.** Six Words Live is a literary journal for a shared daily writing prompt —
warm cream paper, deep ink-navy-black text, and a single coral "stamp" accent for the actions
that matter (submit, upvote). It should feel like a well-typeset lit-mag page that happens to
be alive, not a SaaS dashboard and not another dark-mode chat app. This is a deliberate break
from the "dark surface + one neon accent" look that's the default for most side projects.

## 2. Tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#f3ede1` | page background — warm cream paper |
| `--surface-1` | `#e9e0cf` | recessed panels, input wells |
| `--surface-2` | `#faf6ec` | raised cards (entry cards, the composer) |
| `--text` | `#201a14` | primary ink |
| `--text-muted` | `#6b5f4f` | secondary copy, timestamps, counts |
| `--accent` | `#c1432c` | primary actions — submit, upvote, live indicator |
| `--accent-ink` | `#faf6ec` | text/icon color on top of `--accent` |
| `--support` | `#2f5233` | secondary accent — "top" badge, success states |
| `--danger` | `#a3291a` | errors, rate-limit / validation messages |
| Display font | **Fraunces** (Google Fonts), fallback `Georgia, "Times New Roman", serif` | wordmark, the prompt itself, big numbers |
| UI font | **Inter** (Google Fonts), fallback `system-ui, sans-serif` | body copy, form fields, metadata |
| Spacing unit | 8px scale (8/16/24/32/48/64) | all layout spacing |
| Corner radius | 10px cards, 6px inputs/buttons, 999px pill for the live badge | |
| Shadow | soft, warm-tinted: `0 1px 2px rgba(32,26,20,0.06), 0 8px 24px rgba(32,26,20,0.08)` — never a cool gray shadow | card elevation |
| Motion | UI transitions 150–220ms ease-out; new wall entries slide+fade in over 220ms; vote bump is a 90ms scale pop | |

## 3. Layout intent

The **hero is the prompt + composer**, front and center at the top; the **live wall is the
majority of the page below it**. Desktop (1440×900): a centered column ~760px wide holds the
prompt/composer, then the wall runs as a masonry-ish single column of entry cards filling the
rest of the viewport — no sidebar chrome, no dead margins, background texture (see below) fills
the edges. Phone (390×844): everything stacks full-width with the composer pinned near the top
and the wall scrolling beneath; the composer collapses to a slim "write yours" bar once a user
has already submitted today, handing that space back to the wall.

## 4. Signature detail

The page background is a **subtle paper-grain texture** (a tiled, low-opacity SVG noise
pattern) under the cream, so the "page" reads as paper rather than a flat color fill. The
day's prompt renders in the display serif at a large size with a **hand-stamped coral
underline** (an inline SVG squiggle, not a straight `border-bottom`) — it's the one flourish
that says "someone designed this," reused as the loading-state placeholder shape too.

## 5. Juice plan

- **Submit**: button depresses on press (translateY + shadow contraction, 90ms); on success the
  new entry card slides in at the top of the wall with a 220ms fade+slide and a brief coral
  outline pulse that fades over 600ms so the author can find their own line in the wall.
- **Upvote**: the vote count does a 90ms scale-pop (1 → 1.15 → 1) and the arrow icon fills
  solid; a second click on an already-voted entry is a no-op with a tiny shake to signal
  "already counted."
- **Live wall updates**: entries arriving from other visitors (via polling) fade+slide in from
  the top with a soft coral-tinted glow that decays over 1s, distinguishing "just arrived" from
  older entries without being distracting.
- **Midnight rollover**: when the client detects a new UTC day, the wall gets a short
  cross-fade transition into the "today's prompt" empty state rather than an abrupt reload.
- **Sound** (WebAudio-synthesized, mute toggle persisted in `localStorage`, lazy `AudioContext`
  created on first gesture, all guarded for environments without `AudioContext`):
  - *submit*: a short warm two-note chime (sine, ~440Hz → 660Hz, 80ms each)
  - *new entry arrives*: a very soft single tick (filtered noise burst, <40ms, low volume)
  - *upvote*: a quick high triangle-wave blip (~120ms)
  - *midnight rollover*: a soft descending three-note phrase marking the day closing
- All motion respects `prefers-reduced-motion` (drop slide/pulse/shake, keep opacity + state
  changes).

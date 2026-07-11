# Backlog — Sestet

Epics and stories for the build. All start unchecked. Every story has verifiable acceptance
criteria a later run can confirm true/false. **Epic 1, Story 1.1 is the wow moment** — it must
land before anything optional.

## Epic 1 — The live wall (the wow moment)

- [x] **1.1 Submit a six-word entry and land in the live wall instantly**
  - Submitting a valid six-word entry adds it to the wall for the current visitor with no
    page reload, in under 1 second of the request resolving.
  - The submitted entry visually distinguishes itself (e.g. a highlight/pulse) as "yours" for
    at least a few seconds after landing.
  - Submitting fewer or more than six words shows an inline error and does not create an
    entry (verify via a direct 5-word and 7-word submission).

- [x] **1.2 See the shared daily prompt**
  - Loading the site with no prior visit shows a prompt and a compose box, not a blank page.
  - Two separate sessions (e.g. two browser profiles) loading the site on the same UTC day see
    byte-identical prompt text.
  - Reloading later the same UTC day shows the same prompt as before.

- [x] **1.3 Live-updating wall for entries from other visitors**
  - An entry submitted from Session A appears in Session B's wall without Session B reloading
    the page, within 10 seconds.
  - The wall handles zero entries (empty state, not a blank area) and 100+ entries (scrolls,
    doesn't degrade layout) without visual breakage.

- [x] **1.4 One entry per visitor per day**
  - After a successful submission, the compose box is replaced by a "you already wrote today's
    story" state showing the visitor's own entry; resubmitting via a direct API call returns a
    409 and does not create a second row.
  - Clearing cookies and resubmitting is allowed (new anonymous visitor) — verify a fresh
    browser profile can submit on the same day a first profile already used.

- [x] **1.5 Design polish — composer and wall**
  - The composer and wall match `docs/DESIGN.md` tokens (colors, type pairing, spacing scale)
    and pass the D3 self-review checklist (390/768/1440 layouts, hover/focus/active states,
    submit + arrival juice, sound with persisted mute) before this story is checked off.

## Epic 2 — Voting

- [x] **2.1 Upvote any entry once**
  - Clicking upvote on an entry increases its displayed count by exactly one and the button
    visually reflects the "voted" state.
  - Clicking upvote again on the same entry from the same browser does not increase the count
    a second time (verify via two direct API calls with the same visitor cookie).
  - Voting on your own entry is allowed (no special-casing) — verify the count increments.

- [x] **2.2 Sort the wall by newest or most-upvoted**
  - Toggling to "top" reorders visible entries by vote count descending, ties broken by newest
    first; toggling back to "new" restores chronological order.
  - The active sort choice is visually indicated (not just functional).

- [x] **2.3 Abuse resistance on writes**
  - Submitting more than 3 entries in 60 seconds from one visitor token is rejected with a 429
    and a user-visible message (verify via rapid direct API calls).
  - Casting more than 30 votes in 60 seconds from one visitor token is rejected with a 429.
  - Design polish — rate-limit and validation error states use `docs/DESIGN.md`'s danger token
    and match the rest of the UI's tone (not a raw browser alert).

## Epic 3 — Midnight rollover and archive

- [x] **3.1 New prompt at UTC midnight**
  - A visitor with the page open across UTC midnight sees the wall transition to the new
    day's prompt without a manual reload, within 60 seconds of rollover (poll-driven is fine).
  - The previous day's entries are no longer submittable-against (a direct API call trying to
    post against a stale prompt id is rejected).

- [x] **3.2 Browse the archive**
  - An `/archive` (or equivalent) route lists past UTC days with their prompt text.
  - Selecting a past day shows that day's frozen wall, sorted by votes, read-only (no
    compose box, no voting).
  - The archive handles the "no past days yet" state (first day of the site's life) without
    error.

- [x] **3.3 Design polish — archive and empty states**
  - The archive list and archive detail view match `docs/DESIGN.md` tokens and layout intent;
    empty/loading/error states are designed, not blank, per the D3 checklist.

## Epic 4 — Hardening and launch readiness

- [x] **4.1 Accessibility pass**
  - Full keyboard navigation reaches the composer, sort toggle, and every entry's upvote
    control in a sane tab order; focus is visible at every stop.
  - The live wall's arrival of new entries is announced via an `aria-live` region without
    spamming screen readers on every poll tick.

- [x] **4.2 Mobile composer ergonomics**
  - On a 390px viewport, the compose box, submit button, and wall are all reachable and usable
    with no horizontal scroll and no overlapping elements.
  - Touch targets for submit and upvote are at least 44px.

- [x] **4.3 Seed content for an empty launch day**
  - A migration or seed script can populate a handful of realistic sample entries for local/
    preview environments so the wall never demos empty.
  - Seed data is clearly excluded from production writes (documented, not auto-run against the
    real D1 database).

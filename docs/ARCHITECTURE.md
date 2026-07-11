# Architecture — Sestet

## Stack

Next.js 14 App Router (TypeScript), deployed to Cloudflare Pages. API routes run on the
`edge` runtime and talk to two Cloudflare bindings: **D1** (`DB`, SQLite) for prompts/
entries/votes, and **KV** (`VOTES_KV`) for sliding-window rate limits only. No accounts —
identity is a random per-browser token in an HttpOnly cookie (`swl_id`).

## Data flow

```
src/app/page.tsx (client)
  ├─ GET  /api/prompt   → today's prompt text (creates it in D1 if this is the first hit of the day)
  ├─ GET  /api/entries  → the wall for the current prompt, sorted "new" or "top"
  ├─ POST /api/entries  → submit a six-word entry (rate-limited, one per visitor per prompt)
  └─ POST /api/vote     → upvote an entry (rate-limited, one vote per visitor per entry)

src/app/archive/page.tsx (client)         → GET /api/archive       → past days, newest first
src/app/archive/[id]/page.tsx (client)    → GET /api/archive/[id]  → one frozen day, read-only
```

The page polls `GET /api/entries` every 5s (`POLL_INTERVAL_MS` in `page.tsx`) to pick up
entries from other visitors and detect a UTC day rollover (the response's `promptId`
changing mid-session swaps in the new prompt without a full reload). `POST /api/entries`
never takes a client-supplied prompt id — it always resolves the day's prompt from the
server clock, so there's no way to submit against a stale (yesterday's) prompt.

The archive is read-only and has no polling: `GET /api/archive` excludes whatever prompt
id is "current" as of the request and returns each past day with its entry count;
`GET /api/archive/[id]` 404s for an unknown date key and otherwise returns that day's
prompt plus its entries sorted by vote count (ties newest-first), with no
`votedByMe`/`isMine` fields since voting and per-visitor identity are meaningless once a
day is frozen.

## Modules

- `src/lib/prompts.ts` — the prompt bank, deterministic day→prompt mapping
  (`promptTextForDate`), and the six-word validation rule (`isValidSixWordEntry`).
- `src/lib/db.ts` — every D1 query. Nothing outside this file touches `D1Database` directly.
  `insertEntry`/`castVote` lean on real SQL constraints (a unique index on
  `entries(prompt_id, author_token)`, a composite primary key on `votes(entry_id,
  voter_token)`) so "one entry per day" and "one vote per entry" hold even under a race,
  not just in application logic. `castVote` checks the entry exists before writing and
  returns `null` if it doesn't (the route turns that into a 404), since `votes.entry_id`
  is a foreign key and D1 throws on an insert against a missing id rather than no-op'ing.
- `src/lib/kv.ts` — `checkRateLimit`, a sliding-window counter backed by KV.
- `src/lib/identity.ts` — the anonymous visitor token: read/create + cookie header.
- `src/lib/wall.ts` — pure client-side logic for the live wall: `annotateArrivals` diffs a
  poll response against previously-seen entry ids so only genuinely new entries (from other
  visitors) get the arrival animation.
- `src/lib/sound.ts` — synthesized WebAudio SFX (no audio files) with a localStorage-persisted
  mute flag; every function guards `typeof window === "undefined"` so it's safe in tests/SSR.
- `src/lib/format.ts` — `timeAgo`, coarse relative-time labels for entry metadata, and
  `formatArchiveDate`, which renders a prompt id's `YYYY-MM-DD` date key as a full label
  (parsed as UTC explicitly so it can't shift a day under a reader's local timezone).
- `src/components/` — `PromptBanner`, `Composer`, `Wall`, `EntryCard`, `MuteToggle`,
  `Wordmark`, `ArchiveDayCard`, `ArchiveEntryRow`, each with a co-located CSS module.
  `src/app/page.tsx` is the client-side orchestrator that owns all wall/composer state and
  wires them together; the archive pages are simpler client components that own only their
  own fetch/loading state.
- `src/app/fonts.ts` — Fraunces (display) + Inter (UI) via `next/font/google`, matching
  `docs/DESIGN.md`'s type pairing.

## Local development

`next dev` alone can't reach D1/KV — `next.config.mjs` calls
`setupDevPlatform()` (from `@cloudflare/next-on-pages/next-dev`) when `NODE_ENV ===
"development"`, which emulates the bindings declared in `wrangler.toml` against local
storage. Apply the schema once before your first `npm run dev`:

```bash
npm run db:migrate:local
npm run dev
```

Optionally, `npm run db:seed:local` populates today's prompt with four sample entries
(`migrations/seed.sql`) so the wall isn't empty on a fresh checkout. It computes "today"
via SQLite's own `date('now')` rather than a hardcoded date, and only ever targets
`--local` — there is no remote counterpart, and it must never be run against production.

## Testing

`tests/helpers/fakeD1.ts` and `tests/helpers/fakeKv.ts` are dependency-free, hand-written
stand-ins for `D1Database`/`KVNamespace` that model the tables/counters in memory and match
db.ts's/kv.ts's exact query text — no native SQLite bindings, so `npm test` has no
compiled-dependency risk in CI. `tests/setup.ts` polyfills `globalThis.crypto` for Node
versions where it isn't a global (the edge runtime and Node 20+, which CI runs, always have
it).

## Deployment note

Building for Cloudflare Pages (`npm run pages:build`) requires Node ≥ 20 (the
`@cloudflare/next-on-pages`/Vercel build toolchain needs it) — plain `npm run build` works
on Node 18 but only produces a Node server bundle, not the Pages Functions output. Because
the app depends on D1/KV bindings that only exist inside a Cloudflare Pages deployment, it
can't be served as a plain static bundle from a subpath on another host — it needs its own
Cloudflare Pages project (with the `DB`/`VOTES_KV` bindings configured) rather than a copy
under `apps.charliekrug.com/six-words-live/`.

# Sestet

**▶ Live demo: [apps.charliekrug.com/six-words-live](https://apps.charliekrug.com/six-words-live/)**

*One prompt. Six words. Everyone, today.*

[![CI](https://github.com/ctkrug/six-words-live/actions/workflows/ci.yml/badge.svg)](https://github.com/ctkrug/six-words-live/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-c1432c.svg)](LICENSE)

Sestet is a daily six-word story game you play with strangers. Everyone who visits on a
given day gets the exact same prompt. You write six words against it, hit submit, and land
in a live wall of everyone else's take on the same six words. Read them, upvote the ones
that land, and watch the wall grow until midnight closes the day.

Legend has it Hemingway once wrote a whole story in six words: *"For sale: baby shoes,
never worn."* Sestet turns that constraint into a shared daily ritual.

## Who it's for

People who like a small creative habit more than a puzzle. If you keep a Wordle streak but
would rather *write* something than guess it, or you already lurk in r/sixwordstories, this
is that itch with an audience attached. No account, no skill floor. Six words is short
enough that having an idea is the whole task.

## What makes it good

- **One shared prompt a day.** Every visitor on the same UTC day sees byte-identical prompt
  text, so you are all writing against the same six words at the same time.
- **A wall that actually feels live.** Submit and you are in it instantly; entries from
  other people slide in on their own with a soft glow, no refresh, while you read.
- **Voting that resists gaming.** One entry and one vote per browser are enforced by real
  database constraints, not just a check in the UI, so a double-click or a retried request
  cannot stuff the count.
- **A midnight close and an archive.** When the UTC day rolls over the wall freezes, the
  top lines are kept, and a fresh prompt begins. Past days live on in a read-only archive
  sorted by the votes each line earned.
- **Sound and motion you can turn off.** Synthesized WebAudio blips on submit, vote, and
  arrival, with a mute toggle that remembers your choice. All motion respects
  `prefers-reduced-motion`.

## A day on the wall

```
Today's six words are about... the last text you never sent

  "Draft saved. Never sent. Still saved."            ▲ 42
  "Typed goodbye. Deleted it. Called instead."       ▲ 31
  "Sorry sat unsent for three years."                ▲ 27   ← Top
  "Wrote everything. Sent a thumbs up."              ▲ 12
  "You up? became I'm sorry. Unsent."                ▲  6
```

## Stack

- **Next.js** (App Router, TypeScript) for the UI and the API routes, which run on the
  Cloudflare **edge** runtime.
- **Cloudflare D1** (SQLite at the edge) as the system of record for prompts, entries, and
  votes. Unique indexes on `entries(prompt_id, author_token)` and `votes(entry_id,
  voter_token)` are what make "one entry per day" and "one vote per entry" hold under a
  race.
- **Cloudflare KV** for sliding-window rate limits on the write endpoints.
- No login and no tracking beyond a random per-browser token, in an HttpOnly cookie, that
  exists only to stop one browser from submitting or voting twice.

## Local development

```bash
npm install
npm run db:migrate:local   # apply the schema to a local D1 database, once
npm run db:seed:local      # optional: seed today's prompt with a few sample lines
npm run dev
```

`next dev` emulates the D1 and KV bindings locally (via `setupDevPlatform()` in
`next.config.mjs`), so submitting, voting, and the live wall all work against
`npm run dev` with no Cloudflare deploy. Open [http://localhost:3000](http://localhost:3000).

## Tests

```bash
npm test              # run the suite once
npm run test:coverage # run it with a coverage report
```

The core logic in `src/lib` (prompt selection, six-word validation, the vote and entry
writes, the live-wall diff, rate limiting, sound) sits at 100% line and branch coverage,
exercised against dependency-free in-memory stand-ins for D1 and KV so CI needs no native
database.

## Documentation

- [`docs/VISION.md`](docs/VISION.md): the product, and why the wall (not the compose box) is
  the point.
- [`docs/DESIGN.md`](docs/DESIGN.md): the editorial-serif design direction and tokens.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): data flow, modules, and the edge/D1/KV
  wiring.
- [`docs/BACKLOG.md`](docs/BACKLOG.md): the epics and their acceptance criteria.

## License

MIT. See [`LICENSE`](LICENSE).

---

More of Charlie's projects → [apps.charliekrug.com](https://apps.charliekrug.com)

# Six Words Live

Everyone gets the same six-word story prompt today. Write yours, drop it into a live wall
of everyone else's, and upvote the best before midnight.

## What it is

Ernest Hemingway is said to have written a story in six words: *"For sale: baby shoes,
never worn."* **Six Words Live** turns that party trick into a daily shared moment. Once a
day, everyone in the world sees the same prompt. You write a six-word story against it,
submit, and instantly land in a live-scrolling wall of everyone else's take on the exact
same six words. Read, upvote, watch the wall shift in real time. At midnight the day
closes, the best lines are archived, and a new prompt begins.

## Why it's interesting

Most "write a story" toys are private notebooks — you write, you leave. The whole point
here is that everyone is writing against the *identical* prompt on the *identical* day, then
immediately reading and voting on each other. The hard part isn't the writing UI, it's
getting the social loop tight: one prompt, a live feed that actually feels live, voting
that can't be gamed, and no spam drowning out real entries. That's a product-taste exercise,
not a CRUD app.

## The wow moment

You submit your line and instantly land in a live-scrolling wall of everyone else's take on
the exact same six words.

## Planned features

- One shared six-word-story prompt per UTC day, the same for every visitor.
- A live wall of submissions that updates without a manual refresh.
- Upvoting, with abuse prevention so the wall can't be trivially gamed.
- A midnight close: the day's wall freezes, top entries move to an archive, a fresh
  prompt appears.
- An archive of past prompts and their winning six-word stories.

## Stack

- **Next.js** (App Router, TypeScript) for the UI and API routes.
- **Cloudflare Pages** for hosting, with **D1** (SQLite at the edge) as the system of
  record for prompts, entries, and votes, and **KV** for rate-limiting and anonymous-voter
  fingerprints.
- No accounts, no tracking beyond what's needed to stop one person from voting a hundred
  times.

## Status

Early scaffold — see [`docs/VISION.md`](docs/VISION.md) for the full design and
[`docs/BACKLOG.md`](docs/BACKLOG.md) for the build plan.

## Local development

```bash
npm install
npm run dev
```

See [`docs/VISION.md`](docs/VISION.md) and [`docs/DESIGN.md`](docs/DESIGN.md) for the product
and design direction.

## License

MIT — see [`LICENSE`](LICENSE).

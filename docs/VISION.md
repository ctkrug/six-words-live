# Vision — Sestet

## The problem

Writing prompts and "story of the day" toys are usually solitary — you write into a box, hit
submit, and the loop ends. Nothing tells you what anyone else wrote against the same prompt,
so there's no shared moment, no discovery, no reason to come back later the same day. Separately,
sites that DO let strangers post together (comment sections, anonymous boards) usually degrade
into noise because there's no shared constraint and no real anti-spam story.

## Who it's for

Anyone who likes a small daily creative ritual — the Wordle audience, but for writing rather
than guessing. No account, no commitment, no skill floor: six words is short enough that
"having an idea" is the whole task, not "being a good writer."

## The core idea

Legend has it Hemingway wrote a complete story in six words: *"For sale: baby shoes, never
worn."* Sestet turns that into a daily shared prompt: everyone in the world gets the
identical theme on the identical UTC day, writes exactly six words against it, and the moment
they submit they land inside a live wall of everyone else's take on the same six words. Reading
and upvoting each other's lines is as core to the loop as writing your own — the wall, not the
compose box, is the product.

At midnight UTC the day's wall freezes, the highest-voted lines move into a permanent archive
for that prompt, and a new prompt appears for the next day.

## Key design decisions

- **One prompt per UTC day, no user-chosen prompts.** The shared-moment premise depends on
  everyone writing against the same six words at the same time; letting users pick prompts
  would turn this into a private notebook again.
- **No accounts.** An anonymous per-browser token (HttpOnly cookie) is enough to enforce "one
  entry per prompt" and "one vote per entry." Accounts would add friction to the thing that
  has to feel instant — landing in the wall the moment you submit.
- **Exactly six words, enforced server-side.** The constraint is the whole creative game; a
  fuzzy "around six words" rule would dilute it and complicate the wall's visual rhythm (short,
  scannable lines).
- **D1 is the source of truth; KV is only for rate-limiting and anti-abuse.** Vote counts and
  entries live in D1 with real constraints (composite primary key on votes prevents double
  voting at the database level, not just in application code). KV never holds anything that
  would be a correctness bug if it were evicted.
- **"Live" via polling, not WebSockets/Durable Objects.** A few seconds of poll latency is
  invisible for a wall that updates over the course of a day, and it keeps the stack to D1 + KV
  as scoped — no Durable Objects, no persistent connections to manage.
- **Archive, don't delete.** Yesterday's prompt and its wall stay browsable; the value of the
  ritual compounds if there's a growing collection of shared six-word takes on shared themes.

## What "v1 done" looks like

- Visiting the site any time during a UTC day shows the same prompt to every visitor.
- A visitor can write and submit a six-word entry once per day; the entry appears in the live
  wall immediately for them and within a few seconds for everyone else.
- The wall supports sorting by newest and by most-upvoted, and a visitor can upvote any entry
  once.
- Submission and voting are abuse-resistant: the six-word rule is enforced server-side, one
  entry per browser per prompt, one vote per browser per entry, and basic rate limits on both
  write paths.
- When a UTC day ends, that day's wall is frozen and browsable in an archive; a new prompt is
  live for the new day.
- The page matches `docs/DESIGN.md`'s direction end to end (composer, wall, archive, empty/
  loading/error states) on both desktop and phone.

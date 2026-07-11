import type { ArchivedPromptSummary, Entry, Prompt } from "@/types";

export async function getOrCreatePrompt(db: D1Database, dateKey: string, text: string): Promise<Prompt> {
  const existing = await getPromptById(db, dateKey);
  if (existing) return existing;

  const createdAt = Date.now();
  await db
    .prepare("INSERT OR IGNORE INTO prompts (id, text, created_at) VALUES (?, ?, ?)")
    .bind(dateKey, text, createdAt)
    .run();

  return { id: dateKey, text, createdAt };
}

export async function getPromptById(db: D1Database, id: string): Promise<Prompt | null> {
  return db
    .prepare("SELECT id, text, created_at as createdAt FROM prompts WHERE id = ?")
    .bind(id)
    .first<Prompt>();
}

// Past UTC days (any prompt other than the current one), newest first, each
// annotated with how many entries it collected — lets the archive index
// show a day was quiet without a second round-trip per day.
export async function listPastPrompts(
  db: D1Database,
  currentPromptId: string,
  limit = 30,
): Promise<ArchivedPromptSummary[]> {
  const { results } = await db
    .prepare(
      `SELECT p.id as id, p.text as text,
              (SELECT COUNT(*) FROM entries e WHERE e.prompt_id = p.id) as entryCount
       FROM prompts p WHERE p.id != ? ORDER BY p.id DESC LIMIT ?`,
    )
    .bind(currentPromptId, limit)
    .all<ArchivedPromptSummary>();
  return results;
}

type StoredEntry = Omit<Entry, "votedByMe" | "isMine"> & { authorToken: string };

export async function listEntries(
  db: D1Database,
  promptId: string,
  sort: "new" | "top",
  limit = 100,
): Promise<StoredEntry[]> {
  const orderBy = sort === "top" ? "vote_count DESC, created_at DESC" : "created_at DESC";
  const { results } = await db
    .prepare(
      `SELECT id, prompt_id as promptId, body, vote_count as voteCount, created_at as createdAt,
              author_token as authorToken
       FROM entries WHERE prompt_id = ? ORDER BY ${orderBy} LIMIT ?`,
    )
    .bind(promptId, limit)
    .all<StoredEntry>();
  return results;
}

// Returns false (no-op) instead of throwing when the unique
// (prompt_id, author_token) index rejects a duplicate submission, so the
// route can turn a lost race into a clean 409 rather than a 500.
export async function insertEntry(
  db: D1Database,
  entry: { id: string; promptId: string; body: string; authorToken: string; createdAt: number },
): Promise<boolean> {
  const { meta } = await db
    .prepare(
      "INSERT OR IGNORE INTO entries (id, prompt_id, body, author_token, vote_count, created_at) VALUES (?, ?, ?, ?, 0, ?)",
    )
    .bind(entry.id, entry.promptId, entry.body, entry.authorToken, entry.createdAt)
    .run();
  return meta.changes > 0;
}

export async function hasSubmittedToday(db: D1Database, promptId: string, authorToken: string): Promise<boolean> {
  const row = await db
    .prepare("SELECT 1 FROM entries WHERE prompt_id = ? AND author_token = ? LIMIT 1")
    .bind(promptId, authorToken)
    .first();
  return row !== null;
}

export async function getVotedEntryIds(
  db: D1Database,
  entryIds: readonly string[],
  voterToken: string,
): Promise<Set<string>> {
  if (entryIds.length === 0) return new Set();
  const placeholders = entryIds.map(() => "?").join(", ");
  const { results } = await db
    .prepare(`SELECT entry_id as entryId FROM votes WHERE voter_token = ? AND entry_id IN (${placeholders})`)
    .bind(voterToken, ...entryIds)
    .all<{ entryId: string }>();
  return new Set(results.map((row) => row.entryId));
}

// Mirrors insertEntry's INSERT OR IGNORE pattern: a single atomic write
// decides the winner, so two concurrent votes from the same visitor (a
// double-click, a retried request) can't both pass a separate "does a vote
// already exist" check before either has written — only one insert can
// ever succeed against the (entry_id, voter_token) primary key.
//
// Checks the entry exists first: votes.entry_id is a foreign key onto
// entries(id), so voting for an id that doesn't exist (a stale or forged
// client value) would otherwise throw a constraint violation out of the
// insert instead of failing cleanly. Returns null for that case so the
// route can turn it into a 404 rather than a 500.
export async function castVote(
  db: D1Database,
  entryId: string,
  voterToken: string,
): Promise<{ voteCount: number; alreadyVoted: boolean } | null> {
  const entryExists = await db.prepare("SELECT 1 FROM entries WHERE id = ?").bind(entryId).first();
  if (!entryExists) return null;

  const { meta } = await db
    .prepare("INSERT OR IGNORE INTO votes (entry_id, voter_token, created_at) VALUES (?, ?, ?)")
    .bind(entryId, voterToken, Date.now())
    .run();

  if (meta.changes > 0) {
    await db.prepare("UPDATE entries SET vote_count = vote_count + 1 WHERE id = ?").bind(entryId).run();
  }

  const entry = await db.prepare("SELECT vote_count as voteCount FROM entries WHERE id = ?").bind(entryId).first<{
    voteCount: number;
  }>();
  return { voteCount: entry?.voteCount ?? 0, alreadyVoted: meta.changes === 0 };
}

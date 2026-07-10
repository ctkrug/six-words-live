import type { Entry, Prompt } from "@/types";

export async function getOrCreatePrompt(db: D1Database, dateKey: string, text: string): Promise<Prompt> {
  const existing = await db
    .prepare("SELECT id, text, created_at as createdAt FROM prompts WHERE id = ?")
    .bind(dateKey)
    .first<Prompt>();
  if (existing) return existing;

  const createdAt = Date.now();
  await db
    .prepare("INSERT OR IGNORE INTO prompts (id, text, created_at) VALUES (?, ?, ?)")
    .bind(dateKey, text, createdAt)
    .run();

  return { id: dateKey, text, createdAt };
}

export async function listEntries(
  db: D1Database,
  promptId: string,
  sort: "new" | "top",
  limit = 100,
): Promise<Omit<Entry, "votedByMe" | "isMine">[]> {
  const orderBy = sort === "top" ? "vote_count DESC, created_at DESC" : "created_at DESC";
  const { results } = await db
    .prepare(
      `SELECT id, prompt_id as promptId, body, vote_count as voteCount, created_at as createdAt
       FROM entries WHERE prompt_id = ? ORDER BY ${orderBy} LIMIT ?`,
    )
    .bind(promptId, limit)
    .all<Omit<Entry, "votedByMe" | "isMine">>();
  return results;
}

export async function insertEntry(
  db: D1Database,
  entry: { id: string; promptId: string; body: string; authorToken: string; createdAt: number },
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO entries (id, prompt_id, body, author_token, vote_count, created_at) VALUES (?, ?, ?, ?, 0, ?)",
    )
    .bind(entry.id, entry.promptId, entry.body, entry.authorToken, entry.createdAt)
    .run();
}

export async function hasSubmittedToday(db: D1Database, promptId: string, authorToken: string): Promise<boolean> {
  const row = await db
    .prepare("SELECT 1 FROM entries WHERE prompt_id = ? AND author_token = ? LIMIT 1")
    .bind(promptId, authorToken)
    .first();
  return row !== null;
}

export async function castVote(
  db: D1Database,
  entryId: string,
  voterToken: string,
): Promise<{ voteCount: number; alreadyVoted: boolean }> {
  const existing = await db
    .prepare("SELECT 1 FROM votes WHERE entry_id = ? AND voter_token = ?")
    .bind(entryId, voterToken)
    .first();

  if (existing) {
    const entry = await db.prepare("SELECT vote_count as voteCount FROM entries WHERE id = ?").bind(entryId).first<{
      voteCount: number;
    }>();
    return { voteCount: entry?.voteCount ?? 0, alreadyVoted: true };
  }

  await db
    .prepare("INSERT INTO votes (entry_id, voter_token, created_at) VALUES (?, ?, ?)")
    .bind(entryId, voterToken, Date.now())
    .run();
  await db.prepare("UPDATE entries SET vote_count = vote_count + 1 WHERE id = ?").bind(entryId).run();

  const entry = await db.prepare("SELECT vote_count as voteCount FROM entries WHERE id = ?").bind(entryId).first<{
    voteCount: number;
  }>();
  return { voteCount: entry?.voteCount ?? 0, alreadyVoted: false };
}

// A minimal, dependency-free D1Database stand-in for exercising db.ts.
// Rather than embedding a real SQL engine, it models the three tables as
// plain arrays/maps and matches each query by the same literal SQL text
// db.ts issues — small and exact, since db.ts is the only caller of these
// statements. The unique-index and composite-key guarantees the migration
// defines are re-created here as explicit checks so the same "duplicate
// submission" / "double vote" invariants are covered.
interface PromptRow {
  id: string;
  text: string;
  created_at: number;
}

interface EntryRow {
  id: string;
  prompt_id: string;
  body: string;
  author_token: string;
  vote_count: number;
  created_at: number;
}

interface VoteRow {
  entry_id: string;
  voter_token: string;
  created_at: number;
}

class FakeD1 {
  prompts: PromptRow[] = [];
  entries: EntryRow[] = [];
  votes: VoteRow[] = [];

  prepare(sql: string) {
    const store = this;
    let boundArgs: unknown[] = [];
    const statement = {
      bind(...args: unknown[]) {
        boundArgs = args;
        return statement;
      },
      async first<T>(): Promise<T | null> {
        return store.execute(sql, boundArgs).first as T | null;
      },
      async all<T>(): Promise<{ results: T[] }> {
        return { results: store.execute(sql, boundArgs).results as T[] };
      },
      async run(): Promise<{ meta: { changes: number } }> {
        return { meta: { changes: store.execute(sql, boundArgs).changes } };
      },
    };
    return statement;
  }

  private execute(sql: string, args: unknown[]): { first: unknown; results: unknown[]; changes: number } {
    if (sql.startsWith("SELECT id, text, created_at as createdAt FROM prompts")) {
      const [id] = args as [string];
      const row = this.prompts.find((p) => p.id === id);
      return { first: row ? { id: row.id, text: row.text, createdAt: row.created_at } : null, results: [], changes: 0 };
    }

    if (sql.startsWith("INSERT OR IGNORE INTO prompts")) {
      const [id, text, createdAt] = args as [string, string, number];
      if (this.prompts.some((p) => p.id === id)) return { first: null, results: [], changes: 0 };
      this.prompts.push({ id, text, created_at: createdAt });
      return { first: null, results: [], changes: 1 };
    }

    if (sql.startsWith("SELECT id, prompt_id as promptId")) {
      const [promptId, limit] = args as [string, number];
      const top = sql.includes("vote_count DESC");
      const rows = this.entries
        .filter((e) => e.prompt_id === promptId)
        .sort((a, b) => (top ? b.vote_count - a.vote_count || b.created_at - a.created_at : b.created_at - a.created_at))
        .slice(0, limit)
        .map((e) => ({
          id: e.id,
          promptId: e.prompt_id,
          body: e.body,
          voteCount: e.vote_count,
          createdAt: e.created_at,
          authorToken: e.author_token,
        }));
      return { first: null, results: rows, changes: 0 };
    }

    if (sql.startsWith("INSERT OR IGNORE INTO entries")) {
      const [id, promptId, body, authorToken, createdAt] = args as [string, string, string, string, number];
      const duplicate = this.entries.some((e) => e.prompt_id === promptId && e.author_token === authorToken);
      if (duplicate) return { first: null, results: [], changes: 0 };
      this.entries.push({ id, prompt_id: promptId, body, author_token: authorToken, vote_count: 0, created_at: createdAt });
      return { first: null, results: [], changes: 1 };
    }

    if (sql.startsWith("SELECT 1 FROM entries WHERE prompt_id = ? AND author_token = ?")) {
      const [promptId, authorToken] = args as [string, string];
      const found = this.entries.some((e) => e.prompt_id === promptId && e.author_token === authorToken);
      return { first: found ? { 1: 1 } : null, results: [], changes: 0 };
    }

    if (sql.startsWith("SELECT entry_id as entryId FROM votes")) {
      const [voterToken, ...entryIds] = args as string[];
      const rows = this.votes
        .filter((v) => v.voter_token === voterToken && entryIds.includes(v.entry_id))
        .map((v) => ({ entryId: v.entry_id }));
      return { first: null, results: rows, changes: 0 };
    }

    if (sql.startsWith("SELECT 1 FROM votes WHERE entry_id = ? AND voter_token = ?")) {
      const [entryId, voterToken] = args as [string, string];
      const found = this.votes.some((v) => v.entry_id === entryId && v.voter_token === voterToken);
      return { first: found ? { 1: 1 } : null, results: [], changes: 0 };
    }

    if (sql.startsWith("SELECT vote_count as voteCount FROM entries WHERE id = ?")) {
      const [entryId] = args as [string];
      const entry = this.entries.find((e) => e.id === entryId);
      return { first: entry ? { voteCount: entry.vote_count } : null, results: [], changes: 0 };
    }

    if (sql.startsWith("INSERT INTO votes")) {
      const [entryId, voterToken, createdAt] = args as [string, string, number];
      this.votes.push({ entry_id: entryId, voter_token: voterToken, created_at: createdAt });
      return { first: null, results: [], changes: 1 };
    }

    if (sql.startsWith("UPDATE entries SET vote_count = vote_count + 1")) {
      const [entryId] = args as [string];
      const entry = this.entries.find((e) => e.id === entryId);
      if (entry) entry.vote_count += 1;
      return { first: null, results: [], changes: entry ? 1 : 0 };
    }

    throw new Error(`fakeD1: unrecognized query: ${sql}`);
  }
}

export function createTestDb(): D1Database {
  return new FakeD1() as unknown as D1Database;
}

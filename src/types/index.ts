export interface Prompt {
  id: string; // YYYY-MM-DD, UTC
  text: string;
  createdAt: number;
}

export interface Entry {
  id: string;
  promptId: string;
  body: string;
  voteCount: number;
  createdAt: number;
  votedByMe: boolean;
  isMine: boolean;
}

export interface ArchivedPromptSummary {
  id: string;
  text: string;
  entryCount: number;
}

// A frozen entry as shown in the read-only archive detail view — no
// `votedByMe`/`isMine`, since those are meaningless once voting is closed.
export interface ArchivedEntry {
  id: string;
  body: string;
  voteCount: number;
  createdAt: number;
}

export interface CloudflareEnv {
  DB: D1Database;
  VOTES_KV: KVNamespace;
}

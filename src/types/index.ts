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

export interface CloudflareEnv {
  DB: D1Database;
  VOTES_KV: KVNamespace;
}

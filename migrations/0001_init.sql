-- Initial schema: one prompt per UTC day, entries against it, and votes on entries.

CREATE TABLE IF NOT EXISTS prompts (
  id TEXT PRIMARY KEY,          -- YYYY-MM-DD (UTC day the prompt is live)
  text TEXT NOT NULL,           -- the theme/topic everyone writes against
  created_at INTEGER NOT NULL   -- unix ms
);

CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,          -- uuid
  prompt_id TEXT NOT NULL REFERENCES prompts(id),
  body TEXT NOT NULL,           -- exactly six words, validated at write time
  author_token TEXT NOT NULL,   -- anonymous per-browser id, for own-entry UI state only
  vote_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entries_prompt_created
  ON entries(prompt_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_entries_prompt_votes
  ON entries(prompt_id, vote_count DESC);

CREATE TABLE IF NOT EXISTS votes (
  entry_id TEXT NOT NULL REFERENCES entries(id),
  voter_token TEXT NOT NULL,    -- anonymous per-browser id
  created_at INTEGER NOT NULL,
  PRIMARY KEY (entry_id, voter_token)
);

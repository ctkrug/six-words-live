-- Sample data for local/preview demos only, so the wall never shows empty
-- while developing. Run manually via `npm run db:seed:local`, which only
-- ever targets `--local`. There is deliberately no `db:seed:remote` script —
-- this file must never be applied to the production D1 database.

INSERT OR IGNORE INTO prompts (id, text, created_at)
VALUES (strftime('%Y-%m-%d', 'now'), 'the smell of your childhood kitchen', strftime('%s', 'now') * 1000);

INSERT OR IGNORE INTO entries (id, prompt_id, body, author_token, vote_count, created_at) VALUES
  ('seed-entry-1', strftime('%Y-%m-%d', 'now'), 'For sale: baby shoes, never worn.', 'seed-visitor-1', 5, strftime('%s', 'now') * 1000 - 600000),
  ('seed-entry-2', strftime('%Y-%m-%d', 'now'), 'Grandma''s bread, still warm, still hers', 'seed-visitor-2', 3, strftime('%s', 'now') * 1000 - 400000),
  ('seed-entry-3', strftime('%Y-%m-%d', 'now'), 'Burnt toast, love anyway, every morning', 'seed-visitor-3', 1, strftime('%s', 'now') * 1000 - 200000),
  ('seed-entry-4', strftime('%Y-%m-%d', 'now'), 'Onions first, always. Everything after follows', 'seed-visitor-4', 0, strftime('%s', 'now') * 1000 - 60000);

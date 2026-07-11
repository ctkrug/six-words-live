import { beforeEach, describe, expect, it } from "vitest";
import {
  castVote,
  getOrCreatePrompt,
  getVotedEntryIds,
  hasSubmittedToday,
  insertEntry,
  listEntries,
  listPastPrompts,
} from "@/lib/db";
import { createTestDb } from "./helpers/fakeD1";

let db: D1Database;

beforeEach(() => {
  db = createTestDb();
});

describe("getOrCreatePrompt", () => {
  it("creates a prompt on first call", async () => {
    const prompt = await getOrCreatePrompt(db, "2026-03-05", "a door you should have locked");
    expect(prompt).toEqual({ id: "2026-03-05", text: "a door you should have locked", createdAt: expect.any(Number) });
  });

  it("returns the existing prompt text on later calls, ignoring a different text argument", async () => {
    await getOrCreatePrompt(db, "2026-03-05", "first text");
    const second = await getOrCreatePrompt(db, "2026-03-05", "second text");
    expect(second.text).toBe("first text");
  });
});

describe("insertEntry / hasSubmittedToday", () => {
  it("inserts a new entry and reports it as submitted", async () => {
    await getOrCreatePrompt(db, "2026-03-05", "prompt");
    const inserted = await insertEntry(db, {
      id: "e1",
      promptId: "2026-03-05",
      body: "six word entry goes right here",
      authorToken: "visitor-a",
      createdAt: 1,
    });
    expect(inserted).toBe(true);
    expect(await hasSubmittedToday(db, "2026-03-05", "visitor-a")).toBe(true);
    expect(await hasSubmittedToday(db, "2026-03-05", "visitor-b")).toBe(false);
  });

  it("rejects a second entry from the same visitor for the same prompt", async () => {
    await getOrCreatePrompt(db, "2026-03-05", "prompt");
    await insertEntry(db, {
      id: "e1",
      promptId: "2026-03-05",
      body: "first entry from this visitor today",
      authorToken: "visitor-a",
      createdAt: 1,
    });
    const second = await insertEntry(db, {
      id: "e2",
      promptId: "2026-03-05",
      body: "second entry same visitor same day",
      authorToken: "visitor-a",
      createdAt: 2,
    });
    expect(second).toBe(false);
  });

  it("allows the same visitor to submit against a different prompt", async () => {
    await getOrCreatePrompt(db, "2026-03-05", "prompt one");
    await getOrCreatePrompt(db, "2026-03-06", "prompt two");
    await insertEntry(db, {
      id: "e1",
      promptId: "2026-03-05",
      body: "entry for the first day here",
      authorToken: "visitor-a",
      createdAt: 1,
    });
    const secondDay = await insertEntry(db, {
      id: "e2",
      promptId: "2026-03-06",
      body: "entry for the second day here",
      authorToken: "visitor-a",
      createdAt: 2,
    });
    expect(secondDay).toBe(true);
  });

  it("only lets one of two concurrent submissions from the same visitor land", async () => {
    await getOrCreatePrompt(db, "2026-03-05", "prompt");
    const [first, second] = await Promise.all([
      insertEntry(db, { id: "e1", promptId: "2026-03-05", body: "first concurrent entry today here", authorToken: "visitor-a", createdAt: 1 }),
      insertEntry(db, { id: "e2", promptId: "2026-03-05", body: "second concurrent entry today here", authorToken: "visitor-a", createdAt: 2 }),
    ]);
    expect([first, second].filter(Boolean)).toHaveLength(1);
    expect((await listEntries(db, "2026-03-05", "new")).length).toBe(1);
  });
});

describe("listEntries", () => {
  beforeEach(async () => {
    await getOrCreatePrompt(db, "2026-03-05", "prompt");
  });

  it("returns an empty array for a prompt with no entries", async () => {
    expect(await listEntries(db, "2026-03-05", "new")).toEqual([]);
  });

  it("sorts by newest first", async () => {
    await insertEntry(db, { id: "e1", promptId: "2026-03-05", body: "older entry six words long", authorToken: "a", createdAt: 1 });
    await insertEntry(db, { id: "e2", promptId: "2026-03-05", body: "newer entry six words long", authorToken: "b", createdAt: 2 });
    const rows = await listEntries(db, "2026-03-05", "new");
    expect(rows.map((r) => r.id)).toEqual(["e2", "e1"]);
  });

  it("sorts by vote count descending, ties broken by newest", async () => {
    await insertEntry(db, { id: "e1", promptId: "2026-03-05", body: "low vote entry six words", authorToken: "a", createdAt: 1 });
    await insertEntry(db, { id: "e2", promptId: "2026-03-05", body: "high vote entry six words", authorToken: "b", createdAt: 2 });
    await castVote(db, "e2", "voter-1");
    const rows = await listEntries(db, "2026-03-05", "top");
    expect(rows.map((r) => r.id)).toEqual(["e2", "e1"]);
  });
});

describe("castVote", () => {
  beforeEach(async () => {
    await getOrCreatePrompt(db, "2026-03-05", "prompt");
    await insertEntry(db, { id: "e1", promptId: "2026-03-05", body: "entry that gets voted on", authorToken: "a", createdAt: 1 });
  });

  it("increments the vote count on first vote", async () => {
    const result = await castVote(db, "e1", "voter-1");
    expect(result).toEqual({ voteCount: 1, alreadyVoted: false });
  });

  it("does not double-count a second vote from the same voter", async () => {
    await castVote(db, "e1", "voter-1");
    const second = await castVote(db, "e1", "voter-1");
    expect(second).toEqual({ voteCount: 1, alreadyVoted: true });
  });

  it("counts votes from different voters independently", async () => {
    await castVote(db, "e1", "voter-1");
    const result = await castVote(db, "e1", "voter-2");
    expect(result).toEqual({ voteCount: 2, alreadyVoted: false });
  });

  it("does not double-count two concurrent votes from the same voter", async () => {
    const [first, second] = await Promise.all([castVote(db, "e1", "voter-1"), castVote(db, "e1", "voter-1")]);
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    const byVoteCount = [first!, second!].sort((a, b) => a.voteCount - b.voteCount);
    expect(byVoteCount).toEqual([
      { voteCount: 1, alreadyVoted: false },
      { voteCount: 1, alreadyVoted: true },
    ]);
  });

  it("returns null instead of throwing for an unknown entry id", async () => {
    const result = await castVote(db, "does-not-exist", "voter-1");
    expect(result).toBeNull();
  });
});

describe("listPastPrompts", () => {
  it("returns an empty array when only today's prompt exists", async () => {
    await getOrCreatePrompt(db, "2026-03-05", "today");
    expect(await listPastPrompts(db, "2026-03-05")).toEqual([]);
  });

  it("excludes the current prompt and orders past days newest first", async () => {
    await getOrCreatePrompt(db, "2026-03-03", "three days ago");
    await getOrCreatePrompt(db, "2026-03-04", "yesterday");
    await getOrCreatePrompt(db, "2026-03-05", "today");
    const days = await listPastPrompts(db, "2026-03-05");
    expect(days.map((d) => d.id)).toEqual(["2026-03-04", "2026-03-03"]);
  });

  it("annotates each past day with its entry count, including zero", async () => {
    await getOrCreatePrompt(db, "2026-03-04", "yesterday");
    await getOrCreatePrompt(db, "2026-03-05", "today");
    await insertEntry(db, { id: "e1", promptId: "2026-03-04", body: "an entry from yesterday right here", authorToken: "a", createdAt: 1 });
    const days = await listPastPrompts(db, "2026-03-05");
    expect(days).toEqual([{ id: "2026-03-04", text: "yesterday", entryCount: 1 }]);
  });

  it("respects the limit argument", async () => {
    await getOrCreatePrompt(db, "2026-03-01", "day one");
    await getOrCreatePrompt(db, "2026-03-02", "day two");
    await getOrCreatePrompt(db, "2026-03-03", "day three");
    const days = await listPastPrompts(db, "2026-03-05", 2);
    expect(days.map((d) => d.id)).toEqual(["2026-03-03", "2026-03-02"]);
  });
});

describe("getVotedEntryIds", () => {
  beforeEach(async () => {
    await getOrCreatePrompt(db, "2026-03-05", "prompt");
    await insertEntry(db, { id: "e1", promptId: "2026-03-05", body: "first entry six words long", authorToken: "a", createdAt: 1 });
    await insertEntry(db, { id: "e2", promptId: "2026-03-05", body: "second entry six words long", authorToken: "b", createdAt: 2 });
  });

  it("returns an empty set for an empty entryIds list without querying", async () => {
    expect(await getVotedEntryIds(db, [], "voter-1")).toEqual(new Set());
  });

  it("returns only the ids the voter has voted on", async () => {
    await castVote(db, "e1", "voter-1");
    const voted = await getVotedEntryIds(db, ["e1", "e2"], "voter-1");
    expect(voted).toEqual(new Set(["e1"]));
  });

  it("returns an empty set when the voter has voted on none of the given ids", async () => {
    await castVote(db, "e1", "voter-2");
    const voted = await getVotedEntryIds(db, ["e1", "e2"], "voter-1");
    expect(voted).toEqual(new Set());
  });
});

import { describe, expect, it } from "vitest";
import { PROMPT_BANK, countWords, isValidSixWordEntry, promptTextForDate, utcDateKey } from "@/lib/prompts";

describe("promptTextForDate", () => {
  it("returns the same prompt for the same UTC day regardless of time", () => {
    const morning = new Date("2026-03-05T00:05:00Z");
    const night = new Date("2026-03-05T23:55:00Z");
    expect(promptTextForDate(morning)).toBe(promptTextForDate(night));
  });

  it("returns different prompts on different days (within the bank cycle)", () => {
    const day1 = new Date("2026-03-05T12:00:00Z");
    const day2 = new Date("2026-03-06T12:00:00Z");
    expect(promptTextForDate(day1)).not.toBe(promptTextForDate(day2));
  });

  // Pins the exact day->index mapping against independently-reasoned dates
  // (not derived from the implementation) so an off-by-one in the epoch-day
  // arithmetic — which the same-day/different-day checks above can't catch,
  // since a uniform shift still satisfies both — fails a test.
  it("maps the Unix epoch day to the first bank entry", () => {
    expect(promptTextForDate(new Date("1970-01-01T00:00:00Z"))).toBe(PROMPT_BANK[0]);
  });

  it("advances one bank index per day from the epoch", () => {
    expect(promptTextForDate(new Date("1970-01-02T00:00:00Z"))).toBe(PROMPT_BANK[1]);
    expect(promptTextForDate(new Date("1970-01-15T00:00:00Z"))).toBe(PROMPT_BANK[14]);
  });

  it("wraps back to the first entry after a full bank cycle", () => {
    expect(promptTextForDate(new Date("1970-01-16T00:00:00Z"))).toBe(PROMPT_BANK[0]);
  });
});

describe("utcDateKey", () => {
  it("formats as YYYY-MM-DD", () => {
    expect(utcDateKey(new Date("2026-03-05T18:30:00Z"))).toBe("2026-03-05");
  });
});

describe("countWords", () => {
  it("counts whitespace-separated words", () => {
    expect(countWords("For sale: baby shoes, never worn.")).toBe(6);
  });

  it("collapses repeated whitespace", () => {
    expect(countWords("one   two\tthree\nfour five six")).toBe(6);
  });

  it("returns zero for empty or whitespace-only input", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   \t\n")).toBe(0);
  });
});

describe("isValidSixWordEntry", () => {
  it("accepts exactly six words", () => {
    expect(isValidSixWordEntry("For sale: baby shoes, never worn.")).toBe(true);
  });

  it("rejects fewer than six words", () => {
    expect(isValidSixWordEntry("Too short a story here")).toBe(false);
  });

  it("rejects more than six words", () => {
    expect(isValidSixWordEntry("This entry has way too many words")).toBe(false);
  });

  it("rejects empty or whitespace-only input", () => {
    expect(isValidSixWordEntry("   ")).toBe(false);
  });

  it("accepts six emoji as six words", () => {
    expect(isValidSixWordEntry("🎉 🚀 🌊 🔥 ✨ 🎈")).toBe(true);
  });

  it("rejects an entry over 280 characters even if trims to six words", () => {
    const paddedWord = "a".repeat(50);
    const body = Array(6).fill(paddedWord).join(" ");
    expect(body.length).toBeGreaterThan(280);
    expect(isValidSixWordEntry(body)).toBe(false);
  });

  it("trims leading/trailing whitespace before validating", () => {
    expect(isValidSixWordEntry("  For sale: baby shoes, never worn.  ")).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { formatArchiveDate, timeAgo } from "@/lib/format";

describe("timeAgo", () => {
  it("returns 'just now' for anything under a minute", () => {
    expect(timeAgo(1000, 1000)).toBe("just now");
    expect(timeAgo(1000, 1000 + 59_000)).toBe("just now");
  });

  it("formats minutes", () => {
    expect(timeAgo(0, 5 * 60_000)).toBe("5m ago");
  });

  it("formats hours once past 60 minutes", () => {
    expect(timeAgo(0, 90 * 60_000)).toBe("1h ago");
  });

  it("formats days once past 24 hours", () => {
    expect(timeAgo(0, 26 * 60 * 60_000)).toBe("1d ago");
  });

  it("clamps a future createdAt (clock skew) to 'just now' instead of a negative value", () => {
    expect(timeAgo(5000, 1000)).toBe("just now");
  });
});

describe("formatArchiveDate", () => {
  it("renders a date key as a full weekday/month/day/year label", () => {
    expect(formatArchiveDate("2026-03-05")).toBe("Thursday, March 5, 2026");
  });

  it("stays on the same UTC day regardless of local timezone shift", () => {
    // A naive `new Date("2026-01-01")` interpreted in a negative-UTC-offset
    // timezone would render as December 31 — formatArchiveDate must not.
    expect(formatArchiveDate("2026-01-01")).toBe("Thursday, January 1, 2026");
  });

  it("handles a year boundary correctly", () => {
    expect(formatArchiveDate("2025-12-31")).toBe("Wednesday, December 31, 2025");
  });
});

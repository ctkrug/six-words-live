import { describe, expect, it } from "vitest";
import { getOrCreateVisitorToken, visitorCookieHeader } from "@/lib/identity";

describe("getOrCreateVisitorToken", () => {
  it("reuses an existing token from the cookie header", () => {
    const { token, isNew } = getOrCreateVisitorToken("swl_id=abc-123; other=1");
    expect(token).toBe("abc-123");
    expect(isNew).toBe(false);
  });

  it("generates a new token when there is no cookie header", () => {
    const { token, isNew } = getOrCreateVisitorToken(null);
    expect(token).toMatch(/^[0-9a-f-]{36}$/);
    expect(isNew).toBe(true);
  });

  it("generates a new token when the cookie header has no matching cookie", () => {
    const { isNew } = getOrCreateVisitorToken("other=1; another=2");
    expect(isNew).toBe(true);
  });

  it("handles a value containing an '=' (base64-ish tokens)", () => {
    const { token } = getOrCreateVisitorToken("swl_id=abc=123==");
    expect(token).toBe("abc=123==");
  });

  it("generates a new token for an empty cookie value", () => {
    const { isNew } = getOrCreateVisitorToken("swl_id=");
    expect(isNew).toBe(true);
  });

  it("generates a new token for a malformed cookie with no '='", () => {
    const { isNew } = getOrCreateVisitorToken("swl_id");
    expect(isNew).toBe(true);
  });
});

describe("visitorCookieHeader", () => {
  it("includes the token, HttpOnly, and a one-year max-age", () => {
    const header = visitorCookieHeader("abc-123");
    expect(header).toContain("swl_id=abc-123");
    expect(header).toContain("HttpOnly");
    expect(header).toContain("Max-Age=31536000");
  });
});

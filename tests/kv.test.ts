import { describe, expect, it } from "vitest";
import { checkRateLimit } from "@/lib/kv";
import { createTestKv } from "./helpers/fakeKv";

describe("checkRateLimit", () => {
  it("allows requests up to the limit", async () => {
    const kv = createTestKv();
    expect(await checkRateLimit(kv, "submit:a", 3, 60)).toBe(true);
    expect(await checkRateLimit(kv, "submit:a", 3, 60)).toBe(true);
    expect(await checkRateLimit(kv, "submit:a", 3, 60)).toBe(true);
  });

  it("rejects the request that would exceed the limit", async () => {
    const kv = createTestKv();
    await checkRateLimit(kv, "submit:a", 3, 60);
    await checkRateLimit(kv, "submit:a", 3, 60);
    await checkRateLimit(kv, "submit:a", 3, 60);
    expect(await checkRateLimit(kv, "submit:a", 3, 60)).toBe(false);
  });

  it("rejects immediately when limit is zero", async () => {
    const kv = createTestKv();
    expect(await checkRateLimit(kv, "submit:a", 0, 60)).toBe(false);
  });

  it("tracks separate keys independently", async () => {
    const kv = createTestKv();
    await checkRateLimit(kv, "submit:a", 1, 60);
    expect(await checkRateLimit(kv, "submit:a", 1, 60)).toBe(false);
    expect(await checkRateLimit(kv, "submit:b", 1, 60)).toBe(true);
  });
});

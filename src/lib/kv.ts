// Lightweight sliding-window rate limiter backed by KV. Not exact under
// heavy concurrency (KV is eventually consistent), but that's the right
// trade-off here: the D1 unique constraints are the hard guarantees for
// "one entry per prompt" and "one vote per entry"; this just keeps a single
// bad actor from hammering the write endpoints.
export async function checkRateLimit(
  kv: KVNamespace,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const current = await kv.get(key);
  const count = current ? Number.parseInt(current, 10) : 0;

  if (count >= limit) return false;

  await kv.put(key, String(count + 1), { expirationTtl: windowSeconds });
  return true;
}

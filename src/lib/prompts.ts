// The curated bank of daily themes. Everyone visiting on a given UTC day is
// handed the same prompt via `promptForDate`, so the pool only needs to be
// large enough that the cycle isn't noticeable, not infinite.
export const PROMPT_BANK: readonly string[] = [
  "the last text you never sent",
  "a job you quit on day one",
  "the smell of your childhood kitchen",
  "what the mirror didn't tell you",
  "a promise you kept too long",
  "the second chance nobody asked for",
  "what fit in the getaway bag",
  "the lie that aged into truth",
  "a stranger who felt like home",
  "the year everything got returned",
  "what survived the house fire",
  "a door you should have locked",
  "the apology that arrived too late",
  "what the dog knew first",
  "a map with no destination marked",
];

export function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

// Deterministic pick: same UTC day always maps to the same bank entry, on
// any machine, without needing to persist an index anywhere.
export function promptTextForDate(date: Date): string {
  const key = utcDateKey(date);
  const daysSinceEpoch = Math.floor(Date.parse(`${key}T00:00:00Z`) / 86_400_000);
  const index = ((daysSinceEpoch % PROMPT_BANK.length) + PROMPT_BANK.length) % PROMPT_BANK.length;
  return PROMPT_BANK[index]!;
}

const WORD_PATTERN = /\S+/g;

export function countWords(body: string): number {
  return body.trim().match(WORD_PATTERN)?.length ?? 0;
}

export function isValidSixWordEntry(body: string): boolean {
  const trimmed = body.trim();
  if (trimmed.length === 0 || trimmed.length > 280) return false;
  return countWords(trimmed) === 6;
}

import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextRequest, NextResponse } from "next/server";
import { castVote } from "@/lib/db";
import { getOrCreateVisitorToken, visitorCookieHeader } from "@/lib/identity";
import { checkRateLimit } from "@/lib/kv";
import type { CloudflareEnv } from "@/types";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  const { DB, VOTES_KV } = getRequestContext().env as CloudflareEnv;
  const { token, isNew } = getOrCreateVisitorToken(request.headers.get("cookie"));

  const body = (await request.json().catch(() => null)) as { entryId?: string } | null;
  if (!body?.entryId) {
    return NextResponse.json({ error: "Missing entryId." }, { status: 400 });
  }

  const allowed = await checkRateLimit(VOTES_KV, `vote:${token}`, 30, 60);
  if (!allowed) {
    return NextResponse.json({ error: "Too many votes. Slow down." }, { status: 429 });
  }

  const { voteCount, alreadyVoted } = await castVote(DB, body.entryId, token);
  const response = NextResponse.json({ voteCount, alreadyVoted });
  if (isNew) response.headers.set("set-cookie", visitorCookieHeader(token));
  return response;
}

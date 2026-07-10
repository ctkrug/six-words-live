import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getOrCreatePrompt } from "@/lib/db";
import { promptTextForDate, utcDateKey } from "@/lib/prompts";
import type { CloudflareEnv } from "@/types";

export const runtime = "edge";

export async function GET() {
  const { DB } = getRequestContext().env as CloudflareEnv;
  const now = new Date();
  const dateKey = utcDateKey(now);
  const prompt = await getOrCreatePrompt(DB, dateKey, promptTextForDate(now));
  return NextResponse.json({ prompt });
}

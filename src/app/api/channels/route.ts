import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeChannel } from "@/lib/serialize";
import { cacheGet, cacheSet } from "@/lib/cache";
import type { ChannelDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/channels — visible live TV channels, ordered (optional ?category=)
export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category") || "";
  const cacheKey = `channels:${category || "all"}`;
  const cached = cacheGet<{ items: ChannelDTO[] }>(cacheKey);
  if (cached) return NextResponse.json(cached);

  const rows = await db.channel.findMany({
    where: { visible: true, ...(category ? { category } : {}) },
    orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
  });

  const items = rows.map((c) => serializeChannel(c as unknown as Record<string, unknown> & { id: string }));
  const payload = { items };
  cacheSet(cacheKey, payload, 30_000);
  return NextResponse.json(payload);
}

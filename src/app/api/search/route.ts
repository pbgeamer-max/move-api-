import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeChannel, serializeTitle } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < 2) {
    return NextResponse.json({ titles: [], channels: [] });
  }

  const [titles, channels] = await Promise.all([
    db.title.findMany({
      where: {
        visible: true,
        OR: [
          { titleAr: { contains: q } },
          { titleEn: { contains: q } },
          { originalTitle: { contains: q } },
        ],
      },
      orderBy: { rating: "desc" },
      take: 10,
    }),
    db.channel.findMany({
      where: {
        visible: true,
        OR: [
          { nameAr: { contains: q } },
          { nameEn: { contains: q } },
          { code: { contains: q } },
          { category: { contains: q } },
        ],
      },
      orderBy: { sortOrder: "asc" },
      take: 6,
    }),
  ]);

  return NextResponse.json({
    titles: titles.map((t) => serializeTitle(t as unknown as Record<string, unknown> & { id: string })),
    channels: channels.map((c) => serializeChannel(c as unknown as Record<string, unknown> & { id: string })),
  });
}

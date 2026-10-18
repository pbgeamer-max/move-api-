import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { serializeTitle } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const type = req.nextUrl.searchParams.get("type") || undefined;
  const q = req.nextUrl.searchParams.get("q") || undefined;

  const where: Record<string, unknown> = {};
  if (type === "movie" || type === "series") where.type = type;
  if (q) where.OR = [{ titleAr: { contains: q } }, { titleEn: { contains: q } }];

  const rows = await db.title.findMany({
    where,
    orderBy: { sortOrder: "asc" },
    take: 100,
    include: { _count: { select: { seasons: true, episodes: true } } },
  });

  return NextResponse.json({
    items: rows.map((r) => {
      const dto = serializeTitle(r as unknown as Record<string, unknown> & { id: string });
      return { ...dto, visible: r.visible, episodesCount: (r._count as { episodes: number }).episodes };
    }),
  });
}

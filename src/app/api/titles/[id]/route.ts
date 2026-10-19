import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeSeriesDetails, serializeTitle } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const row = await db.title.findFirst({
    where: { OR: [{ id }, { slug: id }], visible: true },
    include: { seasons: { include: { episodes: true } }, _count: { select: { seasons: true } } },
  });
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (row.type === "series") {
    return NextResponse.json(serializeSeriesDetails(row as unknown as Record<string, unknown> & { id: string }));
  }

  // Similar titles by shared genre
  const genres = JSON.parse(row.genres || "[]") as string[];
  const similarRows = genres.length
    ? await db.title.findMany({
        where: { visible: true, id: { not: row.id }, OR: genres.slice(0, 3).map((g) => ({ genres: { contains: g } })) },
        orderBy: { rating: "desc" },
        take: 8,
      })
    : [];

  const dto = serializeTitle(row as unknown as Record<string, unknown> & { id: string });
  return NextResponse.json({
    ...dto,
    similar: similarRows.map((r) => serializeTitle(r as unknown as Record<string, unknown> & { id: string })),
  });
}

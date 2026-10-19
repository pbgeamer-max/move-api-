import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeTitle } from "@/lib/serialize";

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

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const type = sp.get("type") || undefined; // "movie" | "series"
  const genre = sp.get("genre") || undefined;
  const year = sp.get("year") || undefined;
  const sort = sp.get("sort") || "popularity";
  const q = sp.get("q") || undefined;
  const lang = sp.get("lang") === "en" ? "en" : "ar";
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);
  const limit = Math.min(48, Math.max(6, parseInt(sp.get("limit") || "24", 10) || 24));

  const where: Record<string, unknown> = { visible: true };
  if (type === "movie" || type === "series") where.type = type;
  if (genre) where.genres = { contains: genre };
  if (year && /^\d{4}$/.test(year)) where.releaseYear = parseInt(year, 10);
  if (q) {
    where.OR = [
      { titleAr: { contains: q } },
      { titleEn: { contains: q } },
      { originalTitle: { contains: q } },
    ];
  }

  const orderBy = ((): Array<Record<string, "asc" | "desc">> => {
    switch (sort) {
      case "rating":
        return [{ rating: "desc" }];
      case "release":
        return [
          { releaseYear: "desc" },
          { sortOrder: "asc" },
        ];
      case "title":
        return [{ titleEn: "asc" }];
      default:
        return [{ sortOrder: "asc" }];
    }
  })();

  const [rows, total] = await Promise.all([
    db.title.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { seasons: true } } },
    }),
    db.title.count({ where }),
  ]);

  return NextResponse.json({
    items: rows.map((r) => serializeTitle(r as unknown as Record<string, unknown> & { id: string })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    lang,
  });
}

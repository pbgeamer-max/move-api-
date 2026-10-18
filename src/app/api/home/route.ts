import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeSeriesDetails, serializeTitle } from "@/lib/serialize";
import { cacheGet, cacheSet } from "@/lib/cache";
import type { HomePayload } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const cached = cacheGet<HomePayload>("home");
  if (cached) return NextResponse.json(cached);
  const payload = await buildHome();
  cacheSet("home", payload, 60_000);
  return NextResponse.json(payload);
}

async function buildHome(): Promise<HomePayload> {
  const [moviesFeatured, seriesFeatured, trending, featuredAll, newReleases, arabicPicks, topRated, settings] =
    await Promise.all([
      db.title.findMany({ where: { visible: true, type: "movie", featured: true }, orderBy: { sortOrder: "asc" }, take: 3 }),
      db.title.findMany({ where: { visible: true, type: "series", featured: true }, orderBy: { sortOrder: "asc" }, take: 2 }),
      db.title.findMany({ where: { visible: true, trending: true }, orderBy: { sortOrder: "asc" }, take: 12 }),
      db.title.findMany({ where: { visible: true, featured: true }, orderBy: { sortOrder: "asc" }, take: 8 }),
      db.title.findMany({ where: { visible: true, isNew: true }, orderBy: { releaseYear: "desc" }, take: 12 }),
      db.title.findMany({
        where: { visible: true, OR: [{ genres: { contains: "Arabic" } }, { country: { in: ["Iraq", "Arab Region"] } }] },
        orderBy: { rating: "desc" },
        take: 12,
      }),
      db.title.findMany({ where: { visible: true, rating: { not: null } }, orderBy: { rating: "desc" }, take: 12 }),
      db.siteSetting.findUnique({ where: { key: "demoMode" } }),
    ]);

  const demoMode = settings
    ? (JSON.parse(settings.value) as { enabled: boolean; reason: string })
    : { enabled: true, reason: "Demo mode" };

  const ser = (rows: typeof trending) => rows.map((t) => serializeTitle(t as unknown as Record<string, unknown> & { id: string }));

  // Hero slides: alternate movie / series
  const hero: HomePayload["hero"] = [];
  const heroMovies = moviesFeatured.slice(0, 2);
  const heroSeries = seriesFeatured.slice(0, 1);
  if (heroMovies[0]) hero.push({ kind: "movie", title: serializeTitle(heroMovies[0] as unknown as Record<string, unknown> & { id: string }) });
  if (heroSeries[0]) {
    const full = await db.title.findUnique({
      where: { id: heroSeries[0].id },
      include: { seasons: { include: { episodes: { select: { id: true } } } } },
    });
    if (full) hero.push({ kind: "series", title: serializeSeriesDetails(full as unknown as Record<string, unknown> & { id: string }) });
  }
  if (heroMovies[1]) hero.push({ kind: "movie", title: serializeTitle(heroMovies[1] as unknown as Record<string, unknown> & { id: string }) });

  return {
    hero,
    trending: ser(trending),
    featured: ser(featuredAll),
    newReleases: ser(newReleases),
    arabicPicks: ser(arabicPicks),
    topRated: ser(topRated),
    demoMode,
  };
}

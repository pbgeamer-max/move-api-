import { NextRequest, NextResponse } from "next/server";
import { getSeriesDetail } from "@/lib/move-catalog";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const onlyDecoded = searchParams.get("onlyDecoded") === "1";
  const series = getSeriesDetail(slug, onlyDecoded);

  if (!series) {
    return NextResponse.json(
      { status: "error", message: "المسلسل غير موجود" },
      {
        status: 404,
        headers: CORS_HEADERS,
      }
    );
  }

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  // Enrich episodes with direct stream URLs for external players (no 3isk pages or iframes)
  const enrichedSeasons = (series.seasons || []).map((season) => ({
    number: season.number,
    titleAr: season.titleAr,
    titleEn: season.titleEn,
    episodesCount: season.episodesCount,
    episodes: season.episodes.map((ep) => ({
      id: ep.id,
      seasonNumber: ep.seasonNumber,
      number: ep.number,
      titleAr: ep.titleAr,
      titleEn: ep.titleEn,
      synopsisAr: ep.synopsisAr,
      thumbnailUrl: ep.thumbnailUrl,
      runtime: ep.runtime,
      isDecoded: ep.isDecoded ?? false,
      // Direct decoded stream URL ready for <video src="...">, Hls.js, or Plyr on another site
      streamUrl: `${origin}/api/v1/play?id=${encodeURIComponent(ep.id)}`,
      m3u8Url: `${origin}/api/v1/play?id=${encodeURIComponent(ep.id)}`,
      streamApi: `${origin}/api/v1/stream?id=${encodeURIComponent(ep.id)}`,
    })),
  }));

  return NextResponse.json(
    {
      status: "success",
      data: {
        id: series.id,
        slug: series.slug,
        titleAr: series.titleAr,
        titleEn: series.titleEn,
        synopsisAr: series.synopsisAr,
        posterUrl: series.posterUrl,
        backdropUrl: series.backdropUrl,
        releaseYear: series.releaseYear,
        rating: series.rating,
        genres: series.genres,
        seasonsCount: series.seasonsCount,
        totalEpisodes: series.totalEpisodes,
        seasons: enrichedSeasons,
      },
    },
    {
      headers: CORS_HEADERS,
    }
  );
}

import { NextResponse } from "next/server";
import { getCatalogStats } from "@/lib/move-catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  const stats = getCatalogStats();
  return NextResponse.json({
    status: "success",
    data: {
      ...stats,
      version: "1.0.0",
      apiBase: "/api/v1",
      endpoints: {
        series: "/api/v1/series",
        seriesDetails: "/api/v1/series/:slug",
        movies: "/api/v1/movies",
        movieDetails: "/api/v1/movies/:slug",
        stream: "/api/v1/stream?url={playbackUrl}",
      },
    },
  });
}

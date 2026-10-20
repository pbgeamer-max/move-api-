import { NextRequest, NextResponse } from "next/server";
import { getMovieDetail } from "@/lib/move-catalog";

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
  const movie = getMovieDetail(slug);

  if (!movie) {
    return NextResponse.json(
      { status: "error", message: "الفيلم غير موجود" },
      {
        status: 404,
        headers: CORS_HEADERS,
      }
    );
  }

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  return NextResponse.json(
    {
      status: "success",
      data: {
        id: movie.id,
        slug: movie.slug,
        titleAr: movie.titleAr,
        titleEn: movie.titleEn,
        synopsisAr: movie.synopsisAr,
        posterUrl: movie.posterUrl,
        backdropUrl: movie.backdropUrl,
        releaseYear: movie.releaseYear,
        rating: movie.rating,
        genres: movie.genres,
        runtime: movie.runtime,
        // Direct decoded stream URL ready for <video src="...">, Hls.js, or Plyr on another site
        streamUrl: `${origin}/api/v1/play?id=${encodeURIComponent(movie.id)}`,
        m3u8Url: `${origin}/api/v1/play?id=${encodeURIComponent(movie.id)}`,
        streamApi: `${origin}/api/v1/stream?id=${encodeURIComponent(movie.id)}`,
      },
    },
    {
      headers: CORS_HEADERS,
    }
  );
}

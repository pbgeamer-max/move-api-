import { NextRequest, NextResponse } from "next/server";
import { getMovieDetail } from "@/lib/move-catalog";

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
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
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
        ...movie,
        streamApi: movie.playbackUrl ? `${origin}/api/v1/stream?url=${encodeURIComponent(movie.playbackUrl)}` : null,
      },
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    }
  );
}

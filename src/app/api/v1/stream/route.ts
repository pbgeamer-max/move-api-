import { NextRequest, NextResponse } from "next/server";
import { resolveStream } from "@/lib/stream-resolver";
import { getSeriesDetail, getMovieDetail } from "@/lib/move-catalog";

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
  try {
    const { searchParams } = new URL(req.url);
    let targetUrl = searchParams.get("url");
    const episodeId = searchParams.get("episodeId");
    const slug = searchParams.get("slug");

    // Lookup from catalog if no URL provided
    if (!targetUrl && slug) {
      const movie = getMovieDetail(slug);
      if (movie?.playbackUrl) {
        targetUrl = movie.playbackUrl;
      } else {
        const series = getSeriesDetail(slug);
        const firstEp = series?.seasons?.[0]?.episodes?.[0];
        if (firstEp?.playbackUrl) {
          targetUrl = firstEp.playbackUrl;
        }
      }
    }

    if (!targetUrl && episodeId) {
      // Find episode across catalog
      // Could be directly a 3isk episode URL if format is matched
      targetUrl = `https://3iskk.xyz/watch/episodes/${episodeId}/`;
    }

    if (!targetUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "يرجى تزويد الرابط في المعامل ?url= أو ?slug= أو ?episodeId=",
        },
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const bypassCache = searchParams.get("nocache") === "1" || searchParams.get("force") === "1";
    const result = await resolveStream(targetUrl, bypassCache);

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const origin = `${proto}://${host}`;

    // Convert relative proxy paths to absolute URLs
    if (result.streamUrl && result.streamUrl.startsWith("/")) {
      result.streamUrl = `${origin}${result.streamUrl}`;
    }
    if (result.embedUrl && result.embedUrl.startsWith("/")) {
      result.embedUrl = `${origin}${result.embedUrl}`;
    }
    if (result.fallbackEmbed && result.fallbackEmbed.startsWith("/")) {
      result.fallbackEmbed = `${origin}${result.fallbackEmbed}`;
    }

    return NextResponse.json(
      {
        success: result.success,
        type: result.type,
        streamUrl: result.streamUrl || null,
        embedUrl: result.embedUrl || null,
        error: result.error || null,
        cached: Boolean(result.cached),
        title: result.title || null,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Internal resolver error" },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}

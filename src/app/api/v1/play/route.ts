import { NextRequest, NextResponse } from "next/server";
import { resolveStream } from "@/lib/stream-resolver";
import { getWatchUrlForId } from "@/lib/move-catalog";

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

/**
 * GET /api/v1/play?id=<episode_or_movie_id>
 * Direct video stream player endpoint for external websites & players.
 * Resolves 3isk dynamic token redirects to the direct master .m3u8 stream,
 * and redirects the player directly to the playable video stream with universal CORS.
 *
 * Example:
 * <video src="https://domain.com/api/v1/play?id=serie-teskilat-season-1-episode-189" controls />
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") || searchParams.get("episodeId") || searchParams.get("slug");
    const rawUrl = searchParams.get("url");
    const proxyMode = searchParams.get("proxy") === "1";

    let targetUrl = rawUrl;
    if (!targetUrl && id) {
      targetUrl = getWatchUrlForId(id) || undefined;
    }

    if (!targetUrl) {
      return NextResponse.json(
        {
          status: "error",
          message: "يرجى تزويد معرف الحلقة أو الفيلم في ?id=",
        },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const origin = `${proto}://${host}`;

    // Resolve direct stream (.m3u8 / .mp4)
    const result = await resolveStream(targetUrl);

    if (result.success && result.streamUrl) {
      const finalStream = result.streamUrl.startsWith("/")
        ? `${origin}${result.streamUrl}`
        : result.streamUrl;

      if (proxyMode) {
        const proxied = `${origin}/api/stream/vod?url=${encodeURIComponent(finalStream)}`;
        return NextResponse.redirect(proxied, {
          status: 302,
          headers: {
            ...CORS_HEADERS,
            "Cache-Control": "public, max-age=1800",
          },
        });
      }

      return NextResponse.redirect(finalStream, {
        status: 302,
        headers: {
          ...CORS_HEADERS,
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // If stream could not be extracted directly
    return NextResponse.json(
      {
        status: "error",
        message: result.error || "تعذر استخراج رابط البث المباشر للفيديو المطلوب من المصدر.",
        id: id || null,
      },
      {
        status: 502,
        headers: CORS_HEADERS,
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        message: error?.message || "Internal playback error",
      },
      {
        status: 500,
        headers: CORS_HEADERS,
      }
    );
  }
}

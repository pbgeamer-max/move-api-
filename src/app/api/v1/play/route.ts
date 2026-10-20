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
 * Universal video stream playback endpoint for external websites, VLC, and smart players.
 * Resolves 3isk dynamic token redirects to the direct master .m3u8 stream,
 * and routes it through our universal bypass proxy with correct Referer/Origin and CORS headers.
 *
 * Example:
 * <video src="https://domain.com/api/v1/play?id=serie-organize-isler-mudblij-season-1-episode-1" controls />
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") || searchParams.get("episodeId") || searchParams.get("slug");
    const rawUrl = searchParams.get("url");
    const rawMode = searchParams.get("raw") === "1";
    const format = searchParams.get("format");

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

      const proxied = `${origin}/api/stream/vod?url=${encodeURIComponent(finalStream)}`;

      // Return JSON if requested
      if (format === "json") {
        return NextResponse.json(
          {
            status: "success",
            id: id || null,
            streamUrl: proxied,
            rawStreamUrl: finalStream,
          },
          { headers: CORS_HEADERS }
        );
      }

      // If user specifically requested raw unproxied CDN URL
      if (rawMode) {
        return NextResponse.redirect(finalStream, {
          status: 302,
          headers: {
            ...CORS_HEADERS,
            "Cache-Control": "public, max-age=1800",
          },
        });
      }

      // Default: Universal Proxy redirect (bypasses 403s, injects referer, universal CORS)
      return NextResponse.redirect(proxied, {
        status: 302,
        headers: {
          ...CORS_HEADERS,
          "Cache-Control": "public, max-age=1800",
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

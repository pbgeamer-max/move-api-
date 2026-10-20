import { NextRequest, NextResponse } from "next/server";
import { resolveStream, getStoredDecodedStream, invalidateStoredStream } from "@/lib/stream-resolver";
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

    // Fast path: Check pre-decoded offline / database streams (0ms instant bypass)
    let stored = (id && getStoredDecodedStream(id)) || (targetUrl && getStoredDecodedStream(targetUrl));

    if (stored && !searchParams.get("fresh")) {
      // Fast probe to ensure the stored stream is active and not returning 403 Forbidden
      try {
        const probeHeaders: Record<string, string> = {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        };
        if (stored.includes("mwdy")) {
          probeHeaders["Referer"] = "https://mwdy.cc/";
        } else if (stored.includes("grzcdn") || stored.includes("miravd")) {
          probeHeaders["Referer"] = "https://miravd.com/";
        }

        const probeRes = await fetch(stored, {
          method: "HEAD",
          headers: probeHeaders,
          signal: AbortSignal.timeout(1000),
        });

        if (!probeRes.ok && probeRes.status !== 206) {
          // If upstream returns 403, 404, or 5xx, invalidate immediately and re-resolve
          if (id) invalidateStoredStream(id);
          if (targetUrl) invalidateStoredStream(targetUrl);
          stored = null;
        }
      } catch {
        // If probe timed out, fall through
      }
    }

    if (stored) {
      const proxied = `${origin}/api/stream/vod?url=${encodeURIComponent(stored)}`;
      if (format === "json") {
        return NextResponse.json(
          { status: "success", id: id || null, streamUrl: proxied, rawStreamUrl: stored },
          { headers: CORS_HEADERS }
        );
      }
      return NextResponse.redirect(rawMode ? stored : proxied, {
        status: 302,
        headers: {
          ...CORS_HEADERS,
          "Cache-Control": "public, max-age=1800",
        },
      });
    }

    // Resolve direct stream (.m3u8 / .mp4)
    const result = await resolveStream(targetUrl, true);

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

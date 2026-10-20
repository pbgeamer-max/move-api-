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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") || searchParams.get("episodeId") || searchParams.get("slug");
    let targetUrl = searchParams.get("url");

    if (!targetUrl && id) {
      targetUrl = getWatchUrlForId(id) || undefined;
    }

    if (!targetUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "يرجى تزويد معرف الحلقة أو الفيلم في ?id= أو ?episodeId= أو ?slug=",
        },
        {
          status: 400,
          headers: CORS_HEADERS,
        }
      );
    }

    const bypassCache = searchParams.get("nocache") === "1" || searchParams.get("force") === "1";
    const result = await resolveStream(targetUrl, bypassCache);

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const origin = `${proto}://${host}`;

    // Convert relative proxy paths to absolute URLs
    let streamUrl = result.streamUrl;
    if (streamUrl && streamUrl.startsWith("/")) {
      streamUrl = `${origin}${streamUrl}`;
    }

    const playUrl = id
      ? `${origin}/api/v1/play?id=${encodeURIComponent(id)}`
      : streamUrl
      ? `${origin}/api/v1/play?url=${encodeURIComponent(streamUrl)}`
      : null;

    const proxiedStreamUrl = streamUrl
      ? `${origin}/api/stream/vod?url=${encodeURIComponent(streamUrl)}`
      : null;

    return NextResponse.json(
      {
        success: result.success && Boolean(streamUrl),
        type: result.type,
        id: id || null,
        title: result.title || null,
        // DIRECT VIDEO STREAMS ONLY (Bypasses all protections and CORS restrictions)
        streamUrl: proxiedStreamUrl || streamUrl || null,
        rawStreamUrl: streamUrl || null,
        playUrl: playUrl,
        proxiedStreamUrl: proxiedStreamUrl,
        cached: Boolean(result.cached),
        error: !streamUrl ? result.error || "تعذر استخراج رابط البث المباشر للفيديو من المصدر" : null,
      },
      {
        headers: CORS_HEADERS,
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Internal resolver error" },
      {
        status: 500,
        headers: CORS_HEADERS,
      }
    );
  }
}

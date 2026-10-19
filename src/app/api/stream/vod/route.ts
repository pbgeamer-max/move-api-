import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const targetUrl = searchParams.get("url");

  let fetchUrl = "";
  if (targetUrl) {
    fetchUrl = targetUrl;
  } else if (id) {
    fetchUrl = `https://aspreen-tv-production.up.railway.app/api/app/vod/stream?id=${encodeURIComponent(id)}`;
  } else {
    return new NextResponse("Missing id or url parameter", { status: 400 });
  }

  try {
    const res = await fetch(fetchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "*/*",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return new NextResponse(`Upstream returned ${res.status}`, { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("mpegurl") && !contentType.includes("application/x-mpegURL") && !fetchUrl.includes(".m3u8") && !id) {
      // If it's a binary key or TS segment (fallback), stream directly
      const buffer = await res.arrayBuffer();
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": contentType,
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    let playlistText = await res.text();

    // 1. Fix unproxied AES-128 encryption key:
    // Some HLS streams have URI="https://s48.grzcdn.com/.../encryption.key" which blocks external browsers with 400/CORS.
    // Proxying through Aspreen's stream?url= endpoint returns 200 OK.
    playlistText = playlistText.replace(
      /#EXT-X-KEY:METHOD=([A-Z0-9-]+),URI=["'](https?:\/\/[^"']+)["']/g,
      (_match, method, keyUrl) => {
        const proxiedKey = `https://aspreen-tv-production.up.railway.app/api/app/vod/stream?url=${encodeURIComponent(keyUrl)}`;
        return `#EXT-X-KEY:METHOD=${method},URI="${proxiedKey}"`;
      }
    );

    // 2. If it's a master playlist pointing to sub-playlists (e.g. index-v1-a1.m3u8), route sub-playlists through this proxy
    playlistText = playlistText.replace(
      /^(https?:\/\/[^\r\n]+\.m3u8[^\r\n]*)$/gm,
      (subM3u8) => `/api/stream/vod?url=${encodeURIComponent(subM3u8)}`
    );

    return new NextResponse(playlistText, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Proxy error";
    return new NextResponse(`Stream proxy failed: ${msg}`, { status: 502 });
  }
}

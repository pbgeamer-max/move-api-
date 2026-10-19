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

    // 1. If it's a binary file (AES-128 encryption key or TS segment), stream bytes directly
    const isPlaylist =
      contentType.includes("mpegurl") ||
      contentType.includes("application/x-mpegURL") ||
      fetchUrl.includes(".m3u8") ||
      Boolean(id);

    if (!isPlaylist) {
      const buffer = await res.arrayBuffer();
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": contentType || "application/octet-stream",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    // 2. Parse and rewrite M3U8 playlist
    let playlistText = await res.text();

    // 2.1. Rewrite AES-128 encryption keys to pass through our local proxy
    // (Bypasses origin/referer blocking on CDN keys like s*.grzcdn.com)
    playlistText = playlistText.replace(
      /#EXT-X-KEY:METHOD=([^,\r\n]+),URI=["']?([^"'\r\n]+)["']?/g,
      (_match, method, keyUrl) => {
        if (keyUrl.startsWith("/api/stream/vod")) {
          return `#EXT-X-KEY:METHOD=${method},URI="${keyUrl}"`;
        }
        const proxiedKey = `/api/stream/vod?url=${encodeURIComponent(keyUrl)}`;
        return `#EXT-X-KEY:METHOD=${method},URI="${proxiedKey}"`;
      }
    );

    // 2.2. Rewrite master playlist variant sub-playlists to go through /api/stream/vod
    playlistText = playlistText.replace(
      /(#EXT-X-STREAM-INF:[^\r\n]+[\r\n]+)(https?:\/\/[^\r\n]+)/g,
      (_match, tag, uri) => `${tag}/api/stream/vod?url=${encodeURIComponent(uri)}`
    );
    playlistText = playlistText.replace(
      /^(https?:\/\/[^\r\n]+\.m3u8[^\r\n]*)$/gm,
      (uri) => `/api/stream/vod?url=${encodeURIComponent(uri)}`
    );

    // 2.3. If any raw TS segments point directly to unproxied CDNs that block referer, proxy them
    playlistText = playlistText.replace(
      /^(https?:\/\/[^\/]*grzcdn\.com\/[^\r\n]+\.ts[^\r\n]*)$/gm,
      (tsUrl) =>
        `https://aspreen-tv-production.up.railway.app/api/app/vod/stream?url=${encodeURIComponent(tsUrl)}`
    );

    return new NextResponse(playlistText, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Proxy error";
    return new NextResponse(`Stream proxy failed: ${msg}`, { status: 502 });
  }
}

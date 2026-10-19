import { NextRequest, NextResponse } from "next/server";

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
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const targetUrl = searchParams.get("url");

  let fetchUrl = "";
  if (targetUrl) {
    fetchUrl = targetUrl;
  } else if (id) {
    fetchUrl = `https://aspreen-tv-production.up.railway.app/api/app/vod/stream?id=${encodeURIComponent(id)}`;
  } else {
    return new NextResponse("Missing id or url parameter", {
      status: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  try {
    const headers: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
      Accept: "*/*",
    };

    if (fetchUrl.includes("grzcdn.com") || fetchUrl.includes("ukrcdn") || fetchUrl.includes("miravd")) {
      headers["Referer"] = "https://miravd.com/";
      headers["Origin"] = "https://miravd.com";
    } else if (fetchUrl.includes("vidmoly")) {
      headers["Referer"] = "https://vidmoly.to/";
    }

    const res = await fetch(fetchUrl, {
      headers,
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return new NextResponse(`Upstream returned ${res.status}`, {
        status: res.status,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      });
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

    // 2.1. Rewrite AES-128 encryption keys to pass through our local proxy with full absolute URL
    // (Bypasses origin/referer blocking on CDN keys like s*.grzcdn.com)
    playlistText = playlistText.replace(
      /#EXT-X-KEY:METHOD=([^,\r\n]+),URI=["']?([^"'\r\n]+)["']?/g,
      (_match, method, keyUrl) => {
        if (keyUrl.includes("/api/stream/vod")) {
          const fullKey = keyUrl.startsWith("http") ? keyUrl : `${origin}${keyUrl}`;
          return `#EXT-X-KEY:METHOD=${method},URI="${fullKey}"`;
        }
        const proxiedKey = `${origin}/api/stream/vod?url=${encodeURIComponent(keyUrl)}`;
        return `#EXT-X-KEY:METHOD=${method},URI="${proxiedKey}"`;
      }
    );

    // 2.2. Rewrite master playlist variant sub-playlists to go through /api/stream/vod with full absolute URL
    playlistText = playlistText.replace(
      /(#EXT-X-STREAM-INF:[^\r\n]+[\r\n]+)(https?:\/\/[^\r\n]+)/g,
      (_match, tag, uri) => `${tag}${origin}/api/stream/vod?url=${encodeURIComponent(uri)}`
    );
    playlistText = playlistText.replace(
      /^(https?:\/\/[^\r\n]+\.m3u8[^\r\n]*)$/gm,
      (uri) => `${origin}/api/stream/vod?url=${encodeURIComponent(uri)}`
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

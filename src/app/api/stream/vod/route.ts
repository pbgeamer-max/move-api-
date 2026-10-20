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

/**
 * Universal HLS Stream Proxy Engine
 * Bypasses 403 Forbidden, CDN Referer/Origin checks, and ISP blocking.
 * Rewrites M3U8 playlists line-by-line, proxies AES-128 keys and TS segments,
 * and attaches universal CORS headers for VLC, Smart TVs, and external web players.
 */
export async function GET(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return new NextResponse("Missing url parameter", {
      status: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  const fetchUrl = targetUrl.trim();

  try {
    const headers: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
      Accept: "*/*",
    };

    // Forward Range header for player scrubbing / seeking
    const range = req.headers.get("range");
    if (range) {
      headers["Range"] = range;
    }

    // Dynamic Referer & Origin injection tailored to the upstream CDN
    if (fetchUrl.includes("mwdy")) {
      headers["Referer"] = "https://mwdy.cc/";
      headers["Origin"] = "https://mwdy.cc";
    } else if (fetchUrl.includes("grzcdn.com") || fetchUrl.includes("miravd")) {
      headers["Referer"] = "https://miravd.com/";
      headers["Origin"] = "https://miravd.com";
    } else if (fetchUrl.includes("ukrcdn")) {
      headers["Referer"] = "https://3iskk.xyz/";
      headers["Origin"] = "https://3iskk.xyz";
    } else if (fetchUrl.includes("vidmoly")) {
      headers["Referer"] = "https://vidmoly.to/";
      headers["Origin"] = "https://vidmoly.to";
    } else if (fetchUrl.includes("3isk")) {
      headers["Referer"] = "https://aa.3isk.icu/";
      headers["Origin"] = "https://3iskk.xyz";
    }

    const res = await fetch(fetchUrl, {
      headers,
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok && res.status !== 206) {
      return new NextResponse(`Upstream returned ${res.status}`, {
        status: res.status,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const contentType = res.headers.get("content-type") || "";

    // Determine if this is an M3U8 playlist vs a binary segment/key
    const isPlaylist =
      contentType.includes("mpegurl") ||
      contentType.includes("application/x-mpegURL") ||
      fetchUrl.includes(".m3u8");

    // 1. If it's a binary file (AES-128 encryption key or TS segment), stream bytes directly
    if (!isPlaylist) {
      const buffer = await res.arrayBuffer();
      const responseHeaders: Record<string, string> = {
        "Content-Type": contentType || "video/mp2t",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Cache-Control": "public, max-age=86400",
      };

      const cr = res.headers.get("content-range");
      if (cr) responseHeaders["Content-Range"] = cr;
      const cl = res.headers.get("content-length");
      if (cl) responseHeaders["Content-Length"] = cl;
      const ar = res.headers.get("accept-ranges");
      if (ar) responseHeaders["Accept-Ranges"] = ar;

      return new NextResponse(buffer, {
        status: res.status,
        headers: responseHeaders,
      });
    }

    // 2. Parse and rewrite M3U8 playlist line-by-line
    // Guarantees zero double-wrapping and converts all relative paths to absolute proxied URLs
    const playlistText = await res.text();
    const lines = playlistText.split(/\r?\n/);
    const rewrittenLines: string[] = [];
    const base = new URL(fetchUrl);

    for (let line of lines) {
      const trimmed = line.trim();

      // Rewrite AES key URIs
      if (trimmed.startsWith("#EXT-X-KEY:")) {
        line = line.replace(/URI=["']?([^"',\r\n]+)["']?/g, (_match, keyUri) => {
          if (keyUri.includes("/api/stream/vod")) {
            const fullKey = keyUri.startsWith("http") ? keyUri : `${origin}${keyUri}`;
            return `URI="${fullKey}"`;
          }
          const absoluteKey = new URL(keyUri, base).href;
          return `URI="${origin}/api/stream/vod?url=${encodeURIComponent(absoluteKey)}"`;
        });
        rewrittenLines.push(line);
        continue;
      }

      // Preserve tags, comments, and empty lines
      if (trimmed.startsWith("#") || trimmed.length === 0) {
        rewrittenLines.push(line);
        continue;
      }

      // Resolve relative or absolute URI
      const absoluteUri = new URL(trimmed, base).href;

      // Wrap through /api/stream/vod to inject Referer and CORS headers
      rewrittenLines.push(`${origin}/api/stream/vod?url=${encodeURIComponent(absoluteUri)}`);
    }

    const rewrittenPlaylist = rewrittenLines.join("\n");

    return new NextResponse(rewrittenPlaylist, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Cache-Control": "public, max-age=1800",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Proxy error";
    return new NextResponse(`Stream proxy failed: ${msg}`, {
      status: 502,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}

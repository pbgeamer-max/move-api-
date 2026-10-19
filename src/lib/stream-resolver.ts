// TVORA Universal Video Stream Resolver Engine
// Resolves 3isk movies, series, and episodes to direct HLS (.m3u8) streams or clean embed players

export interface ResolvedStream {
  success: boolean;
  type: "hls" | "mp4" | "embed";
  streamUrl?: string;
  embedUrl?: string;
  fallbackEmbed?: string;
  title?: string;
  error?: string;
  cached?: boolean;
}

// In-memory cache with 2-hour TTL to prevent repeated scraping and ensure instant playback
interface CacheEntry {
  data: ResolvedStream;
  expiresAt: number;
}
const resolverCache = new Map<string, CacheEntry>();

function getCached(key: string, bypass = false): ResolvedStream | null {
  if (bypass) return null;
  const entry = resolverCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    resolverCache.delete(key);
    return null;
  }
  // NEVER return cached embed fallback — always attempt fresh direct stream extraction!
  if (entry.data.type === "embed" || !entry.data.streamUrl) {
    resolverCache.delete(key);
    return null;
  }
  return { ...entry.data, cached: true };
}

function setCached(key: string, data: ResolvedStream, ttlMs = 2 * 60 * 60 * 1000) {
  // ONLY cache successful HLS or MP4 streams; NEVER cache fallback embeds
  if (!data.success || data.type === "embed" || !data.streamUrl) return;
  resolverCache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "ar,en-US;q=0.9,en;q=0.8",
};

/**
 * Unpacks Dean Edwards packed JavaScript code (commonly used in movie/series hosters like miravd, upstream, etc.)
 */
function unpackDeanEdwards(packedCode: string): string | null {
  try {
    const match = packedCode.match(
      /eval\s*\(\s*(function\s*\(p,a,c,k,e,[rd]\)[\s\S]*?\.split\(['"]\|['"]\)\s*\))\s*\)/
    );
    if (!match) return null;
    const unpackerCode = "return " + match[1];
    const unpacker = new Function(unpackerCode);
    const result = unpacker();
    return typeof result === "string" ? result : null;
  } catch {
    return null;
  }
}

/**
 * Resolves any video or 3isk page URL to a playable .m3u8 or embed URL
 */
export async function resolveStream(targetUrl: string, bypassCache = false): Promise<ResolvedStream> {
  if (!targetUrl || typeof targetUrl !== "string") {
    return { success: false, type: "embed", error: "رابط التشغيل غير متوفر" };
  }

  const trimmed = targetUrl.trim();

  // 1. Direct stream check
  if (trimmed.includes(".m3u8")) {
    return { success: true, type: "hls", streamUrl: trimmed };
  }
  if (trimmed.includes(".mp4")) {
    return { success: true, type: "mp4", streamUrl: trimmed };
  }
  // Aspreen VOD direct stream or player
  if (trimmed.includes("/vod/stream") || (trimmed.includes("aspreen-tv") && trimmed.includes("/vod/"))) {
    const idMatch = trimmed.match(/[?&]id=([^&]+)/);
    const id = idMatch ? idMatch[1] : "";
    const embedUrl = id
      ? `https://aspreen-tv-production.up.railway.app/api/app/vod/player?id=${id}`
      : (trimmed.includes("/vod/player") ? trimmed : trimmed.replace("/vod/stream", "/vod/player"));
    const streamUrl = id ? `/api/stream/vod?id=${id}` : (trimmed.includes("/vod/player") ? trimmed.replace("/vod/player", "/vod/stream") : trimmed);

    return {
      success: true,
      type: "hls",
      streamUrl,
      embedUrl,
      fallbackEmbed: embedUrl,
    };
  }

  // 2. Check cache
  const cached = getCached(trimmed, bypassCache);
  if (cached) {
    return cached;
  }

  try {
    // Direct embed check (e.g. ukrcdn.club/e/...)
    if (trimmed.includes("ukrcdn.") && trimmed.includes("/e/")) {
      const hls = await resolveUkrcdn(trimmed);
      if (hls.success) {
        setCached(trimmed, hls);
        return hls;
      }
      return { success: true, type: "embed", embedUrl: trimmed };
    }

    if (trimmed.includes("miravd.") && trimmed.includes("embed-")) {
      const hls = await resolveMiravd(trimmed);
      if (hls.success) {
        setCached(trimmed, hls);
        return hls;
      }
      return { success: true, type: "embed", embedUrl: trimmed };
    }

    // 3. Resolve 3isk web page URL (e.g. https://3iskk.xyz/watch/episodes/... or /movies/...)
    if (trimmed.includes("3iskk.xyz") || trimmed.includes("3isk")) {
      const resolved = await resolve3iskPage(trimmed);
      if (resolved.success && resolved.streamUrl) {
        setCached(trimmed, resolved);
      }
      return resolved;
    }

    // 4. Default fallback: only treat as embed if not a raw 3isk page
    if (trimmed.includes("3iskk.xyz") || trimmed.includes("3isk")) {
      return {
        success: false,
        type: "embed",
        error: "رابط الصفحة غير صالح للتشغيل المباشر",
      };
    }

    return {
      success: true,
      type: "embed",
      embedUrl: trimmed,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[TVORA Stream Resolver] Error resolving:", trimmed, msg);
    return {
      success: false,
      type: "embed",
      error: msg,
    };
  }
}

/**
 * 3isk Multi-stage Form & Player Resolver
 * Follows the dynamic redirect chain (Hops 1 to N) until reaching the video host iframe,
 * then extracts the direct CORS-enabled .m3u8 HLS master stream.
 */
async function resolve3iskPage(pageUrl: string): Promise<ResolvedStream> {
  let currentUrl = pageUrl;
  let currentHtml = "";
  let referer = "https://3iskk.xyz/";
  let title: string | undefined;

  // Step 1: Initial GET of the watch page
  try {
    const r = await fetch(pageUrl, {
      headers: { ...BROWSER_HEADERS, Referer: referer },
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) {
      return { success: false, type: "embed", error: `HTTP ${r.status} from 3isk` };
    }
    currentHtml = await r.text();

    const titleMatch = currentHtml.match(/<h1[^>]*class=["']title["'][^>]*>([\s\S]*?)<\/h1>/i) ||
      currentHtml.match(/<title>([\s\S]*?)<\/title>/i);
    title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : undefined;
  } catch (err: any) {
    return { success: false, type: "embed", error: err?.message || String(err), title };
  }

  // Step 2: Follow form hops (2-4 hops through aa.3isk.icu)
  for (let hop = 0; hop < 6; hop++) {
    // Check if current HTML already contains the 3isk embed player or video CDN iframe
    const embed3iskMatch = currentHtml.match(/<iframe[^>]+src=["'](https:\/\/3iskk\.xyz\/embed\/[^"']+)["']/i);
    const directCdnMatch = currentHtml.match(/<iframe[^>]+src=["'](https:\/\/[^"']*(?:miravd|ukrcdn|grzcdn|upstream)[^"']*)["']/i);

    if (embed3iskMatch) {
      const baseEmbedUrl = embed3iskMatch[1];
      for (let s = 1; s <= 6; s++) {
        const sUrl = baseEmbedUrl.replace(/\/embed\/\d+\//, `/embed/${s}/`);
        try {
          const rEmbed = await fetch(sUrl, {
            headers: { ...BROWSER_HEADERS, Referer: currentUrl },
            signal: AbortSignal.timeout(8000),
          });
          const embedHtml = await rEmbed.text();
          const hostMatch = embedHtml.match(/<iframe[^>]+src=["'](https:\/\/[^"']+)["']/i);
          if (hostMatch) {
            const hostUrl = hostMatch[1];
            if (hostUrl.includes("miravd.") || hostUrl.includes("grzcdn.")) {
              const res = await resolveMiravd(hostUrl);
              if (res.success && res.streamUrl) return { ...res, title };
            }
            if (hostUrl.includes("ukrcdn.")) {
              const res = await resolveUkrcdn(hostUrl);
              if (res.success && res.streamUrl) return { ...res, title };
            }
          }
        } catch {}
      }
    }

    if (directCdnMatch) {
      const cdnUrl = directCdnMatch[1];
      if (cdnUrl.includes("miravd.")) {
        const res = await resolveMiravd(cdnUrl);
        if (res.success && res.streamUrl) return { ...res, title };
      }
      if (cdnUrl.includes("ukrcdn.")) {
        const res = await resolveUkrcdn(cdnUrl);
        if (res.success && res.streamUrl) return { ...res, title };
      }
      return { success: true, type: "embed", embedUrl: cdnUrl, title };
    }

    // Look for form or JavaScript action + token for the next hop
    let nextPostUrl: string | null = null;
    let nextToken: string | null = null;

    const formActionMatch = currentHtml.match(/<form[^>]+action=["'](https:\/\/[^"']+\.php)["'][^>]*>/i);
    const formTokenMatch = currentHtml.match(/name=["']news["']\s+value=["']([^"']+)["']/i);

    if (formActionMatch && formTokenMatch) {
      nextPostUrl = formActionMatch[1];
      nextToken = formTokenMatch[1];
    } else {
      const jsActionMatch = currentHtml.match(/myForm\.action\s*=\s*["']([^"']+)["']/i) ||
        currentHtml.match(/var\s+myUrl\s*=\s*["']([^"']+)["']/i);
      const jsTokenMatch = currentHtml.match(/myInput\.value\s*=\s*["']([^"']+)["']/i) ||
        currentHtml.match(/value\s*=\s*["'](UHRINkt[^"']+)["']/i);

      if (jsActionMatch && jsTokenMatch) {
        nextPostUrl = jsActionMatch[1];
        nextToken = jsTokenMatch[1];
      }
    }

    if (!nextPostUrl || !nextToken) {
      break;
    }

    try {
      const body = new URLSearchParams();
      body.append("news", nextToken);
      body.append("u", "");
      body.append("submit", "submit");

      const rPost = await fetch(nextPostUrl, {
        method: "POST",
        headers: {
          ...BROWSER_HEADERS,
          "Content-Type": "application/x-www-form-urlencoded",
          Referer: currentUrl,
          Origin: new URL(currentUrl).origin,
        },
        body: body.toString(),
        signal: AbortSignal.timeout(10000),
      });

      if (!rPost.ok) break;

      referer = currentUrl;
      currentUrl = nextPostUrl;
      currentHtml = await rPost.text();
    } catch {
      break;
    }
  }

  // Never return raw 3isk landing page as embedUrl
  return {
    success: false,
    type: "embed",
    error: "تعذر استخراج رابط البث المباشر للفيديو من المصدر.",
    title,
  };
}

/**
 * UkrCDN HLS Resolver: extracts playback JSON API and returns direct .m3u8
 */
async function resolveUkrcdn(cdnUrl: string): Promise<ResolvedStream> {
  const r = await fetch(cdnUrl, {
    headers: { ...BROWSER_HEADERS, Referer: "https://3iskk.xyz/" },
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) {
    return { success: true, type: "embed", embedUrl: cdnUrl };
  }
  const html = await r.text();
  const unescaped = html.replace(/\\\//g, "/");
  const playbackMatch = unescaped.match(/https?:\/\/[^\s"'<>]+\/api\/videos\/[^\s"'<>]+\/playback[^\s"'<>]*/i);

  if (!playbackMatch) {
    return { success: true, type: "embed", embedUrl: cdnUrl };
  }

  const playbackApiUrl = playbackMatch[0];
  const rApi = await fetch(playbackApiUrl, {
    headers: {
      Accept: "application/json",
      Referer: cdnUrl,
      "User-Agent": BROWSER_HEADERS["User-Agent"],
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!rApi.ok) {
    return { success: true, type: "embed", embedUrl: cdnUrl };
  }

  const data = (await rApi.json()) as { url?: string };
  if (data && data.url) {
    return {
      success: true,
      type: "hls",
      streamUrl: data.url,
      embedUrl: cdnUrl,
    };
  }

  return { success: true, type: "embed", embedUrl: cdnUrl };
}

/**
 * Miravd / GRZCDN Dean Edwards Packer Resolver: extracts direct .m3u8 from unpacked jwplayer setup
 */
async function resolveMiravd(miraUrl: string): Promise<ResolvedStream> {
  const r = await fetch(miraUrl, {
    headers: { ...BROWSER_HEADERS, Referer: "https://3iskk.xyz/" },
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) {
    return { success: true, type: "embed", embedUrl: miraUrl };
  }
  const html = await r.text();
  const unpacked = unpackDeanEdwards(html);

  if (unpacked) {
    const m3u8Match = unpacked.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/i);
    if (m3u8Match) {
      return {
        success: true,
        type: "hls",
        streamUrl: m3u8Match[0],
        embedUrl: miraUrl,
      };
    }
  }

  return { success: true, type: "embed", embedUrl: miraUrl };
}

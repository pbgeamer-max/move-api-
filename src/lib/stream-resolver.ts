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

function getCached(key: string): ResolvedStream | null {
  const entry = resolverCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    resolverCache.delete(key);
    return null;
  }
  return { ...entry.data, cached: true };
}

function setCached(key: string, data: ResolvedStream, ttlMs = 2 * 60 * 60 * 1000) {
  if (!data.success) return;
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
    const fnMatch = packedCode.match(/eval\((function\(p,a,c,k,e,d\)[\s\S]*?\.split\('\|'\)\))\)/);
    if (!fnMatch) return null;
    const fn = new Function("return " + fnMatch[1]);
    return fn() as string;
  } catch {
    return null;
  }
}

/**
 * Resolves any video or 3isk page URL to a playable .m3u8 or embed URL
 */
export async function resolveStream(targetUrl: string): Promise<ResolvedStream> {
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

  // 2. Check cache
  const cached = getCached(trimmed);
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
      if (resolved.success) {
        setCached(trimmed, resolved);
      }
      return resolved;
    }

    // 4. Default fallback: treat as external embed player
    return {
      success: true,
      type: "embed",
      embedUrl: trimmed,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[TVORA Stream Resolver] Error resolving:", trimmed, msg);
    // Return clean fallback embed so video player does not crash
    return {
      success: true,
      type: "embed",
      embedUrl: trimmed,
      error: msg,
    };
  }
}

/**
 * 3isk Multi-stage Form & Player Resolver
 */
async function resolve3iskPage(pageUrl: string): Promise<ResolvedStream> {
  // Step 1: Fetch 3isk page
  const r1 = await fetch(pageUrl, {
    headers: { ...BROWSER_HEADERS, Referer: "https://3iskk.xyz/" },
    signal: AbortSignal.timeout(10000),
  });

  if (!r1.ok) {
    return { success: false, type: "embed", error: `HTTP ${r1.status} from 3isk` };
  }

  const html1 = await r1.text();

  // Extract page title
  const titleMatch = html1.match(/<h1[^>]*class=["']title["'][^>]*>([\s\S]*?)<\/h1>/i) ||
    html1.match(/<title>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : undefined;

  // Check for post token
  const formMatch = html1.match(/<form[^>]+action=["'](https:\/\/[^"']+\.php)["'][^>]*>([\s\S]*?)<\/form>/i);
  const tokenMatch = html1.match(/name=["']news["']\s+value=["']([^"']+)["']/i);

  if (!formMatch || !tokenMatch) {
    // Check for embedURL meta tag fallback
    const metaEmbed = html1.match(/<meta[^>]+itemprop=["']embedURL["'][^>]+content=["']([^"']+)["']/i);
    if (metaEmbed) {
      return { success: true, type: "embed", embedUrl: metaEmbed[1], title };
    }
    return { success: true, type: "embed", embedUrl: pageUrl, title };
  }

  const postUrl1 = formMatch[1];
  const token1 = tokenMatch[1];

  // Step 2: POST Stage 1 form (aa.3isk.icu/3isk301111.php)
  const body1 = new URLSearchParams();
  body1.append("news", token1);
  body1.append("u", "");
  body1.append("submit", "submit");

  const r2 = await fetch(postUrl1, {
    method: "POST",
    headers: {
      ...BROWSER_HEADERS,
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: pageUrl,
    },
    body: body1.toString(),
    signal: AbortSignal.timeout(10000),
  });

  if (!r2.ok) {
    return { success: true, type: "embed", embedUrl: pageUrl, title };
  }

  const html2 = await r2.text();

  // Step 3: Extract stage 2 action and token
  const stage2ActionMatch = html2.match(/myForm\.action\s*=\s*["']([^"']+)["']/i) ||
    html2.match(/var\s+myUrl\s*=\s*["']([^"']+)["']/i);
  const stage2TokenMatch = html2.match(/myInput\.value\s*=\s*["']([^"']+)["']/i);

  if (!stage2ActionMatch || !stage2TokenMatch) {
    return { success: true, type: "embed", embedUrl: pageUrl, title };
  }

  const postUrl2 = stage2ActionMatch[1];
  const token2 = stage2TokenMatch[1];

  // Step 4: POST Stage 2 form (aa.3isk.icu/3isk490929.php)
  const body2 = new URLSearchParams();
  body2.append("news", token2);
  body2.append("u", "");
  body2.append("submit", "submit");

  const r3 = await fetch(postUrl2, {
    method: "POST",
    headers: {
      ...BROWSER_HEADERS,
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: postUrl1,
    },
    body: body2.toString(),
    signal: AbortSignal.timeout(10000),
  });

  if (!r3.ok) {
    return { success: true, type: "embed", embedUrl: pageUrl, title };
  }

  const html3 = await r3.text();

  // Step 5: Extract 3isk embed player URL (e.g. https://3iskk.xyz/embed/1/267361/2/)
  const embed3iskMatch = html3.match(/<iframe[^>]+src=["'](https:\/\/3iskk\.xyz\/embed\/[^"']+)["']/i) ||
    html3.match(/<iframe[^>]+src=["']([^"']+)["']/i);

  if (!embed3iskMatch) {
    return { success: true, type: "embed", embedUrl: pageUrl, title };
  }

  const embed3iskUrl = embed3iskMatch[1];

  // Step 6: Fetch 3isk embed iframe
  const r4 = await fetch(embed3iskUrl, {
    headers: { ...BROWSER_HEADERS, Referer: postUrl2 },
    signal: AbortSignal.timeout(10000),
  });
  const html4 = await r4.text();

  // Step 7: Extract video host iframe (ukrcdn, miravd, etc.)
  const cdnIframeMatch = html4.match(/<iframe[^>]+src=["'](https:\/\/[^"']+\/(?:e|embed)[^"']*)["']/i) ||
    html4.match(/<iframe[^>]+src=["']([^"']+)["']/i);

  if (!cdnIframeMatch) {
    return { success: true, type: "embed", embedUrl: embed3iskUrl, title };
  }

  const cdnUrl = cdnIframeMatch[1];

  // Step 8: Resolve specific video host (ukrcdn or miravd or generic)
  if (cdnUrl.includes("ukrcdn.")) {
    const ukrResult = await resolveUkrcdn(cdnUrl);
    if (ukrResult.success) {
      return { ...ukrResult, fallbackEmbed: embed3iskUrl, title };
    }
  } else if (cdnUrl.includes("miravd.")) {
    const miraResult = await resolveMiravd(cdnUrl);
    if (miraResult.success) {
      return { ...miraResult, fallbackEmbed: embed3iskUrl, title };
    }
  }

  return {
    success: true,
    type: "embed",
    embedUrl: cdnUrl,
    fallbackEmbed: embed3iskUrl,
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

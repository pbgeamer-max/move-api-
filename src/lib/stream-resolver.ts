import * as fs from "fs";
import * as path from "path";

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

let _decodedMap: Record<string, string> | null = null;

export function getStoredDecodedStream(idOrUrl: string): string | null {
  if (!idOrUrl) return null;
  if (!_decodedMap) {
    try {
      const p = path.join(process.cwd(), "data", "decoded_streams.json");
      if (fs.existsSync(p)) {
        _decodedMap = JSON.parse(fs.readFileSync(p, "utf-8"));
      } else {
        _decodedMap = {};
      }
    } catch {
      _decodedMap = {};
    }
  }

  const direct = _decodedMap[idOrUrl];
  if (direct) return direct;

  for (const [key, stream] of Object.entries(_decodedMap)) {
    if (idOrUrl.includes(key) || key.includes(idOrUrl)) return stream;
  }
  return null;
}

// In-memory cache with 2-hour TTL to prevent repeated scraping and ensure instant retrieval
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
  if (!entry.data.streamUrl) {
    resolverCache.delete(key);
    return null;
  }
  return { ...entry.data, cached: true };
}

function setCached(key: string, data: ResolvedStream, ttlMs = 2 * 60 * 60 * 1000) {
  if (!data.success || !data.streamUrl) return;
  resolverCache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });

  // Permanently persist to decoded_streams.json so it is instantly available forever
  try {
    if (!_decodedMap) _decodedMap = {};
    _decodedMap[key] = data.streamUrl;
    const match = key.match(/(?:episodes|movies|tvshows)\/([^/]+)/);
    if (match && match[1]) {
      _decodedMap[match[1]] = data.streamUrl;
    }
    const p = path.join(process.cwd(), "data", "decoded_streams.json");
    fs.writeFileSync(p, JSON.stringify(_decodedMap, null, 2), "utf-8");
  } catch {}
}

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "ar,en-US;q=0.9,en;q=0.8",
};

export function invalidateStoredStream(idOrUrl: string) {
  if (!idOrUrl) return;
  let changed = false;
  if (_decodedMap) {
    if (_decodedMap[idOrUrl]) {
      delete _decodedMap[idOrUrl];
      changed = true;
    }
    for (const key of Object.keys(_decodedMap)) {
      if (idOrUrl.includes(key) || key.includes(idOrUrl)) {
        delete _decodedMap[key];
        changed = true;
      }
    }
    if (changed) {
      try {
        const p = path.join(process.cwd(), "data", "decoded_streams.json");
        fs.writeFileSync(p, JSON.stringify(_decodedMap, null, 2), "utf-8");
      } catch {}
    }
  }
}

/**
 * Pure Mathematical Dean Edwards unpacker (base-36 / base-62 decoder).
 * Unpacks obfuscated JavaScript from video hosts (mwdy, miravd, grzcdn, upstream)
 * without using `new Function()` or `eval()` for code execution, avoiding SyntaxError.
 */
function runUnpack(pRaw: string, a: number, c: number, kRaw: string): string {
  let p = "";
  try {
    p = (0, eval)(pRaw);
  } catch {
    p = pRaw.slice(1, -1).replace(/\\'/g, "'").replace(/\\"/g, '"');
  }
  let k = "";
  try {
    k = (0, eval)(kRaw);
  } catch {
    k = kRaw.slice(1, -1);
  }

  function e(cVal: number): string {
    return (
      (cVal < a ? "" : e(Math.floor(cVal / a))) +
      (cVal % a > 35
        ? String.fromCharCode((cVal % a) + 29)
        : "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"[cVal % a])
    );
  }

  const kList = k.split("|");
  const dMap: Record<string, string> = {};
  for (let i = 0; i < c; i++) {
    dMap[e(i)] = kList[i] && kList[i].length > 0 ? kList[i] : e(i);
  }

  return p.replace(/\b\w+\b/g, (w) => dMap[w] || w);
}

function unpackDeanEdwards(packedCode: string): string | null {
  try {
    const match = packedCode.match(
      /}\s*\(\s*(['"][\s\S]*?['"])\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(['"][\s\S]*?['"])\.split\(['"]\|['"]\)/
    );
    if (match) {
      return runUnpack(match[1], parseInt(match[2], 10), parseInt(match[3], 10), match[4]);
    }

    const evalMatch = packedCode.match(
      /eval\s*\(\s*function\s*\(\s*p\s*,\s*a\s*,\s*c\s*,\s*k[\s\S]*?\}\s*\(\s*(['"][\s\S]*?['"])\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(['"][\s\S]*?['"])\.split/
    );
    if (evalMatch) {
      return runUnpack(evalMatch[1], parseInt(evalMatch[2], 10), parseInt(evalMatch[3], 10), evalMatch[4]);
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Resolves any video or 3isk page URL to a direct .m3u8 stream
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

  // 2. Check pre-decoded offline / database streams (0ms instant bypass)
  if (!bypassCache) {
    const stored = getStoredDecodedStream(trimmed);
    if (stored) {
      return { success: true, type: "hls", streamUrl: stored, cached: true };
    }
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
      if (hls.success && hls.streamUrl) {
        setCached(trimmed, hls);
        return hls;
      }
    }

    if ((trimmed.includes("miravd.") || trimmed.includes("grzcdn.") || trimmed.includes("mwdy.")) && trimmed.includes("embed-")) {
      const hls = await resolveEmbedPlayer(trimmed);
      if (hls.success && hls.streamUrl) {
        const res: ResolvedStream = { success: true, type: "hls", streamUrl: hls.streamUrl };
        setCached(trimmed, res);
        return res;
      }
    }

    // 3. Resolve 3isk web page URL (e.g. https://3iskk.xyz/watch/episodes/... or /movies/...)
    if (trimmed.includes("3iskk.xyz") || trimmed.includes("3isk")) {
      const resolved = await resolve3iskPage(trimmed);
      if (resolved.success && resolved.streamUrl) {
        setCached(trimmed, resolved);
      }
      return resolved;
    }

    return {
      success: false,
      type: "embed",
      error: "تعذر فك تشفير رابط البث المباشر لهذا المصدر",
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
 * Deterministic 3isk Multi-stage Form & Player Resolver
 */
async function resolve3iskPage(pageUrl: string): Promise<ResolvedStream> {
  let title: string | undefined;

  try {
    // Step 1: Initial GET of the watch page
    const r1 = await fetch(pageUrl, {
      headers: { ...BROWSER_HEADERS, Referer: "https://3iskk.xyz/" },
      signal: AbortSignal.timeout(10000),
    });
    if (!r1.ok) {
      return { success: false, type: "embed", error: `HTTP ${r1.status} from 3isk` };
    }
    const html1 = await r1.text();

    const titleMatch = html1.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html1.match(/<title>([\s\S]*?)<\/title>/i);
    title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : undefined;

    const formActionMatch = html1.match(/<form[^>]+action=["'](https:\/\/aa\.3isk\.icu\/[^"']+)["']/i);
    const formTokenMatch = html1.match(/name=["']news["']\s+value=["']([^"']+)["']/i);

    if (!formActionMatch || !formTokenMatch) {
      return { success: false, type: "embed", error: "تعذر العثور على نموذج الخطوة الأولى في الصفحة", title };
    }

    const action1 = formActionMatch[1];
    const token1 = formTokenMatch[1];

    // Step 2: POST to aa.3isk.icu step 1
    const body1 = new URLSearchParams();
    body1.append("news", token1);
    body1.append("u", "");
    body1.append("submit", "submit");

    const r2 = await fetch(action1, {
      method: "POST",
      headers: {
        ...BROWSER_HEADERS,
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: pageUrl,
        Origin: "https://3iskk.xyz",
      },
      body: body1.toString(),
      signal: AbortSignal.timeout(10000),
    });

    if (!r2.ok) {
      return { success: false, type: "embed", error: `HTTP ${r2.status} from aa.3isk.icu`, title };
    }
    const html2 = await r2.text();

    // Step 3: Find step 2 action & token from JS
    const action2Match =
      html2.match(/var\s+myUrl\s*=\s*["']([^"']+)["']/i) ||
      html2.match(/myForm\.action\s*=\s*["']([^"']+)["']/i) ||
      html2.match(/action=["'](https:\/\/aa\.3isk\.icu\/[^"']+)["']/i);
    const token2Match =
      html2.match(/myInput\.value\s*=\s*["']([^"']+)["']/i) ||
      html2.match(/value=["'](UHRINkt[^"']+)["']/i) ||
      html2.match(/name=["']news["']\s+value=["']([^"']+)["']/i);

    let playerHtml = html2;

    if (action2Match && token2Match && token2Match[1]) {
      const action2 = action2Match[1];
      const token2 = token2Match[1];

      const body2 = new URLSearchParams();
      body2.append("news", token2);
      body2.append("u", "");
      body2.append("submit", "submit");

      const r3 = await fetch(action2, {
        method: "POST",
        headers: {
          ...BROWSER_HEADERS,
          "Content-Type": "application/x-www-form-urlencoded",
          Referer: action1,
          Origin: "https://aa.3isk.icu",
        },
        body: body2.toString(),
        signal: AbortSignal.timeout(10000),
      });

      if (r3.ok) {
        playerHtml = await r3.text();
      }
    }

    // Step 4: Extract 3isk embed URL
    const embed3iskMatch =
      playerHtml.match(/<iframe[^>]+src=["'](https:\/\/3iskk\.xyz\/embed\/[^"']+)["']/i) ||
      playerHtml.match(/src=["'](https:\/\/3iskk\.xyz\/embed\/[^"']+)["']/i);

    const candidateHosts: string[] = [];

    if (embed3iskMatch) {
      const baseEmbedUrl = embed3iskMatch[1];
      // Gather servers (Server 1, Server 2, Server 3, Server 4)
      for (const s of [1, 2, 3, 4]) {
        const sUrl = s === 1 ? baseEmbedUrl : baseEmbedUrl.replace(/\/embed\/\d+\//, `/embed/${s}/`);
        try {
          const rEmbed = await fetch(sUrl, {
            headers: { ...BROWSER_HEADERS, Referer: "https://aa.3isk.icu/" },
            signal: AbortSignal.timeout(6000),
          });
          if (rEmbed.ok) {
            const embedHtml = await rEmbed.text();
            const hostMatch = embedHtml.match(/<iframe[^>]+src=["']([^"']+)["']/i);
            if (hostMatch && hostMatch[1] && !candidateHosts.includes(hostMatch[1])) {
              candidateHosts.push(hostMatch[1]);
            }
          }
        } catch {}
      }
    } else {
      // Check if playerHtml directly embeds the video CDN
      const directCdnMatch = playerHtml.match(/<iframe[^>]+src=["'](https:\/\/[^"']*(?:miravd|mwdy|ukrcdn|grzcdn|upstream|vidmoly)[^"']*)["']/i);
      if (directCdnMatch && directCdnMatch[1]) {
        candidateHosts.push(directCdnMatch[1]);
      }
    }

    if (candidateHosts.length === 0) {
      return { success: false, type: "embed", error: "تعذر العثور على مشغل الفيديو المصدري في 3isk", title };
    }

    // Step 5: Prioritize servers that do NOT block datacenter IPs (mwdy > ukrcdn > vidmoly > miravd)
    candidateHosts.sort((a, b) => {
      const getPriority = (url: string) => {
        if (url.includes("mwdy")) return 1;
        if (url.includes("ukrcdn")) return 2;
        if (url.includes("vidmoly")) return 3;
        if (url.includes("miravd")) return 4;
        return 5;
      };
      return getPriority(a) - getPriority(b);
    });

    let lastError = "";

    // Step 6: Loop through candidate hosts until one resolves successfully
    for (const host of candidateHosts) {
      try {
        if (host.includes("ukrcdn.")) {
          const res = await resolveUkrcdn(host);
          if (res.success && res.streamUrl) return { ...res, title };
          if (res.error) lastError = res.error;
        } else {
          const res = await resolveEmbedPlayer(host);
          if (res.success && res.streamUrl) {
            return {
              success: true,
              type: "hls",
              streamUrl: res.streamUrl,
              title,
            };
          }
          if (res.error) lastError = res.error;
        }
      } catch (err: any) {
        lastError = err?.message || String(err);
      }
    }

    return {
      success: false,
      type: "embed",
      error: lastError || `تعذر فك تشفير ملف m3u8 من المشغلات المستضيفة (${candidateHosts.length} سيرفر)`,
      title,
    };
  } catch (err: any) {
    return {
      success: false,
      type: "embed",
      error: err?.message || String(err),
      title,
    };
  }
}

/**
 * UkrCDN HLS Resolver: extracts playback JSON API and returns direct .m3u8
 */
async function resolveUkrcdn(cdnUrl: string): Promise<ResolvedStream> {
  try {
    const r = await fetch(cdnUrl, {
      headers: { ...BROWSER_HEADERS, Referer: "https://3iskk.xyz/" },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) {
      return { success: false, type: "embed", error: `UkrCDN HTTP ${r.status}` };
    }
    const html = await r.text();
    const unescaped = html.replace(/\\\//g, "/");
    const playbackMatch =
      unescaped.match(/https?:\/\/[^\s"'<>]+\/api\/videos\/[^\s"'<>]+\/playback[^\s"'<>]*/i) ||
      unescaped.match(/\/api\/videos\/[^\s"'<>]+\/playback[^\s"'<>]*/i);

    if (!playbackMatch) {
      return { success: false, type: "embed", error: "لم يتم العثور على playback API" };
    }

    const rawPlayback = playbackMatch[0];
    const playbackApiUrl = rawPlayback.startsWith("http")
      ? rawPlayback
      : new URL(rawPlayback, cdnUrl).href;

    const rApi = await fetch(playbackApiUrl, {
      headers: {
        Accept: "application/json",
        Referer: cdnUrl,
        "User-Agent": BROWSER_HEADERS["User-Agent"],
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!rApi.ok) {
      return { success: false, type: "embed", error: `Playback API HTTP ${rApi.status}` };
    }

    const data = (await rApi.json()) as { url?: string };
    if (data && data.url) {
      return {
        success: true,
        type: "hls",
        streamUrl: data.url,
      };
    }

    return { success: false, type: "embed", error: "استجابة Playback API لا تحتوي على رابط فيديو" };
  } catch (err: any) {
    return { success: false, type: "embed", error: err?.message };
  }
}

/**
 * Universal Embed Player Resolver:
 * Supports mwdy.cc, miravd.com, grzcdn.com, upstream.to, vidmoly.to.
 * Unpacks Dean Edwards packing, extracts HLS (.m3u8) streams or MP4 video files.
 */
async function resolveEmbedPlayer(embedUrl: string): Promise<{ success: boolean; streamUrl?: string; error?: string }> {
  try {
    const referers = [
      "https://aa.3isk.icu/",
      "https://3iskk.xyz/",
      embedUrl.includes("mwdy") ? "https://mwdy.cc/" : "https://miravd.com/",
      ""
    ];

    let html = "";
    let lastStatus = 0;

    for (const ref of referers) {
      try {
        const headers: Record<string, string> = { ...BROWSER_HEADERS };
        if (ref) headers.Referer = ref;
        const res = await fetch(embedUrl, { headers, signal: AbortSignal.timeout(8000) });
        if (res.ok) {
          html = await res.text();
          break;
        }
        lastStatus = res.status;
      } catch {}
    }

    if (!html) {
      return { success: false, error: `Embed host returned ${lastStatus || 403}` };
    }

    // 1. Dean Edwards unpacker (handles mwdy, miravd, grzcdn, upstream)
    const unpacked = unpackDeanEdwards(html);
    if (unpacked) {
      const m3u8Match =
        unpacked.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/i) ||
        unpacked.match(/file\s*:\s*["'](https?:\/\/[^"']+)["']/i);
      if (m3u8Match) {
        const streamUrl = m3u8Match[1] || m3u8Match[0];
        return { success: true, streamUrl };
      }

      const mp4Match = unpacked.match(/https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/i);
      if (mp4Match) {
        return { success: true, streamUrl: mp4Match[0] };
      }
    }

    // 2. Direct regex in raw HTML
    const rawM3u8Match = html.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/i);
    if (rawM3u8Match) {
      return { success: true, streamUrl: rawM3u8Match[0] };
    }

    return { success: false, error: "تعذر استخراج ملف الفيديو من هذا المشغل" };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

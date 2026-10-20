// TVORA Ultra High-Speed 24/7 Multi-Worker Engine & Telegram Bot
import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8937658776:AAExk0dpO9vIC52-HeCezsHGbn5HI5GomE0";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const CONCURRENCY = parseInt(process.env.DECODE_CONCURRENCY || "6", 10); // 6 simultaneous workers

const dataDir = path.join(process.cwd(), "data");
const decodedPath = path.join(dataDir, "decoded_streams.json");
const failedPath = path.join(dataDir, "failed_items.json");
const subscribersPath = path.join(dataDir, "telegram_subscribers.json");
const catalogGzPath = path.join(dataDir, "3isk_catalog.json.gz");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Global in-memory state
let decodedStore = {};
let failedStore = {};
let subscribers = [];
let workerState = {
  status: "جاري العمل بكامل الطاقة",
  activeWorkers: 0,
  currentlyProcessing: [],
  lastDecoded: "لا يوجد",
  totalNewDiscovered: 0,
  startedAt: new Date().toISOString(),
  sessionDecodedCount: 0,
};

function loadDecodedStore() {
  if (fs.existsSync(decodedPath)) {
    try {
      decodedStore = JSON.parse(fs.readFileSync(decodedPath, "utf-8"));
    } catch {
      decodedStore = {};
    }
  } else {
    decodedStore = {};
  }
  return decodedStore;
}

let lastSaveTime = 0;
function saveDecodedStore(force = false) {
  const now = Date.now();
  if (!force && now - lastSaveTime < 3000) return; // Batch write to save disk I/O
  try {
    fs.writeFileSync(decodedPath, JSON.stringify(decodedStore, null, 2), "utf-8");
    lastSaveTime = now;
  } catch (e) {
    console.error("[TVORA Engine] Error saving decoded_streams.json:", e.message);
  }
}

function loadFailedStore() {
  if (fs.existsSync(failedPath)) {
    try {
      failedStore = JSON.parse(fs.readFileSync(failedPath, "utf-8"));
    } catch {
      failedStore = {};
    }
  }
  return failedStore;
}

function markItemFailed(key, reason) {
  failedStore[key] = {
    failedAt: Date.now(),
    reason: reason || "No player",
  };
  try {
    fs.writeFileSync(failedPath, JSON.stringify(failedStore, null, 2), "utf-8");
  } catch {}
}

function isItemFailed(key) {
  const item = failedStore[key];
  if (!item) return false;
  // Expire failure after 12 hours
  if (Date.now() - item.failedAt > 12 * 60 * 60 * 1000) {
    delete failedStore[key];
    return false;
  }
  return true;
}

function loadSubscribers() {
  if (fs.existsSync(subscribersPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(subscribersPath, "utf-8"));
      if (Array.isArray(data)) subscribers = data;
    } catch {}
  }
  return subscribers;
}

function addSubscriber(chatId) {
  loadSubscribers();
  if (!subscribers.includes(chatId)) {
    subscribers.push(chatId);
    fs.writeFileSync(subscribersPath, JSON.stringify(subscribers, null, 2), "utf-8");
    console.log(`[Telegram] Registered new subscriber chat: ${chatId}`);
    return true;
  }
  return false;
}

async function sendTelegram(chatId, text, replyMarkup = null) {
  try {
    const body = {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    };
    if (replyMarkup) body.reply_markup = replyMarkup;

    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (e) {
    console.error(`[Telegram] Error sending to ${chatId}:`, e.message);
    return null;
  }
}

async function broadcastAlert(text) {
  loadSubscribers();
  for (const chatId of subscribers) {
    await sendTelegram(chatId, text);
  }
}

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "ar,en-US;q=0.9,en;q=0.8",
};

/**
 * Unpacks Dean Edwards packed JavaScript code (mwdy, miravd, grzcdn, upstream)
 */
function unpackDeanEdwards(packedCode) {
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
 * Resolve direct .m3u8 from ukrcdn
 */
async function resolveUkrcdn(cdnUrl) {
  try {
    const r = await fetch(cdnUrl, {
      headers: { ...BROWSER_HEADERS, Referer: "https://3iskk.xyz/" },
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return { success: false, error: `UkrCDN HTTP ${r.status}` };
    const html = await r.text();
    const unescaped = html.replace(/\\\//g, "/");
    const playbackMatch =
      unescaped.match(/https?:\/\/[^\s"'<>]+\/api\/videos\/[^\s"'<>]+\/playback[^\s"'<>]*/i) ||
      unescaped.match(/\/api\/videos\/[^\s"'<>]+\/playback[^\s"'<>]*/i);

    if (!playbackMatch) return { success: false, error: "لم يتم العثور على playback API" };

    const playbackApiUrl = playbackMatch[0].startsWith("http")
      ? playbackMatch[0]
      : new URL(playbackMatch[0], cdnUrl).href;

    const rApi = await fetch(playbackApiUrl, {
      headers: {
        Accept: "application/json",
        Referer: cdnUrl,
        "User-Agent": BROWSER_HEADERS["User-Agent"],
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!rApi.ok) return { success: false, error: `Playback API HTTP ${rApi.status}` };

    const data = await rApi.json();
    if (data && data.url) {
      return { success: true, streamUrl: data.url };
    }
    return { success: false, error: "استجابة لا تحتوي على رابط فيديو" };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Resolve direct .m3u8 from embed hosts (mwdy, miravd, grzcdn, vidmoly)
 */
async function resolveEmbedPlayer(embedUrl) {
  try {
    const referers = [
      "https://aa.3isk.icu/",
      "https://3iskk.xyz/",
      embedUrl.includes("mwdy") ? "https://mwdy.cc/" : "https://miravd.com/",
      ""
    ];

    let html = "";
    for (const ref of referers) {
      try {
        const headers = { ...BROWSER_HEADERS };
        if (ref) headers.Referer = ref;
        const res = await fetch(embedUrl, { headers, signal: AbortSignal.timeout(6000) });
        if (res.ok) {
          html = await res.text();
          break;
        }
      } catch {}
    }

    if (!html) return { success: false, error: "فشل الاتصال بالمشغل المصدري" };

    const unpacked = unpackDeanEdwards(html);
    if (unpacked) {
      const m3u8Match =
        unpacked.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/i) ||
        unpacked.match(/file\s*:\s*["'](https?:\/\/[^"']+)["']/i);
      if (m3u8Match) {
        return { success: true, streamUrl: m3u8Match[1] || m3u8Match[0] };
      }

      const mp4Match = unpacked.match(/https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/i);
      if (mp4Match) {
        return { success: true, streamUrl: mp4Match[0] };
      }
    }

    const rawM3u8Match = html.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/i);
    if (rawM3u8Match) return { success: true, streamUrl: rawM3u8Match[0] };

    const packerMatch = html.match(
      /}\s*\(\s*(['"][\s\S]*?['"])\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(['"][\s\S]*?['"])\.split\(['"]\|['"]\)/
    );
    if (packerMatch) {
      const keywords = packerMatch[4].slice(1, -1).split("|");
      const server = keywords.find((w) => /^s\d+$/.test(w));
      const hash = keywords.find((w) => w.length > 40 && !w.includes("/") && !w.includes("."));
      const cdn = keywords.find((w) => w.includes("mwdy") || w.includes("grzcdn")) || (embedUrl.includes("mwdy") ? "mwdy.club" : "grzcdn.com");
      const domain = cdn.includes(".") ? cdn : `${cdn}.com`;

      if (server && hash) {
        return { success: true, streamUrl: `https://${server}.${domain}/hls/,${hash},.urlset/master.m3u8` };
      }
    }

    return { success: false, error: "تعذر فك تشفير الرابط" };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * High-Speed Multi-stage 3isk web page to direct HLS .m3u8 with Parallel Server Probing
 */
async function resolve3iskWatchUrl(pageUrl) {
  try {
    const r1 = await fetch(pageUrl, {
      headers: { ...BROWSER_HEADERS, Referer: "https://3iskk.xyz/" },
      signal: AbortSignal.timeout(8000),
    });
    if (!r1.ok) return { success: false, error: `HTTP ${r1.status} from 3isk` };
    const html1 = await r1.text();

    const titleMatch = html1.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html1.match(/<title>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "";

    const formActionMatch = html1.match(/<form[^>]+action=["'](https:\/\/aa\.3isk\.icu\/[^"']+)["']/i);
    const formTokenMatch = html1.match(/name=["']news["']\s+value=["']([^"']+)["']/i);

    if (!formActionMatch || !formTokenMatch) {
      return { success: false, error: "تعذر العثور على نموذج الخطوة الأولى في 3isk" };
    }

    const action1 = formActionMatch[1];
    const token1 = formTokenMatch[1];

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
      signal: AbortSignal.timeout(8000),
    });

    if (!r2.ok) return { success: false, error: `HTTP ${r2.status} from aa.3isk.icu step 1` };
    const html2 = await r2.text();

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
        signal: AbortSignal.timeout(8000),
      });

      if (r3.ok) {
        playerHtml = await r3.text();
      }
    }

    const embed3iskMatch =
      playerHtml.match(/<iframe[^>]+src=["'](https:\/\/3iskk\.xyz\/embed\/[^"']+)["']/i) ||
      playerHtml.match(/src=["'](https:\/\/3iskk\.xyz\/embed\/[^"']+)["']/i);

    const candidateHosts = [];

    if (embed3iskMatch) {
      const baseEmbedUrl = embed3iskMatch[1];
      // Parallel server probes (Server 1, 2, 3, 4)
      const probePromises = [1, 2, 3, 4].map(async (s) => {
        const sUrl = s === 1 ? baseEmbedUrl : baseEmbedUrl.replace(/\/embed\/\d+\//, `/embed/${s}/`);
        try {
          const rEmbed = await fetch(sUrl, {
            headers: { ...BROWSER_HEADERS, Referer: "https://aa.3isk.icu/" },
            signal: AbortSignal.timeout(5000),
          });
          if (rEmbed.ok) {
            const embedHtml = await rEmbed.text();
            const hostMatch = embedHtml.match(/<iframe[^>]+src=["']([^"']+)["']/i);
            if (hostMatch && hostMatch[1]) {
              return hostMatch[1];
            }
          }
        } catch {}
        return null;
      });

      const probed = await Promise.all(probePromises);
      for (const h of probed) {
        if (h && !candidateHosts.includes(h)) candidateHosts.push(h);
      }
    } else {
      const directCdnMatch = playerHtml.match(/<iframe[^>]+src=["'](https:\/\/[^"']*(?:miravd|mwdy|ukrcdn|grzcdn|upstream|vidmoly)[^"']*)["']/i);
      if (directCdnMatch && directCdnMatch[1]) {
        candidateHosts.push(directCdnMatch[1]);
      }
    }

    if (candidateHosts.length === 0) {
      return { success: false, error: "لم يتم العثور على سيرفرات المشغل المصدري", title };
    }

    // Server priority
    candidateHosts.sort((a, b) => {
      const getPriority = (url) => {
        if (url.includes("mwdy")) return 1;
        if (url.includes("ukrcdn")) return 2;
        if (url.includes("vidmoly")) return 3;
        if (url.includes("miravd")) return 4;
        return 5;
      };
      return getPriority(a) - getPriority(b);
    });

    for (const host of candidateHosts) {
      try {
        if (host.includes("ukrcdn.")) {
          const res = await resolveUkrcdn(host);
          if (res.success && res.streamUrl) return { ...res, title };
        } else {
          const res = await resolveEmbedPlayer(host);
          if (res.success && res.streamUrl) return { ...res, title };
        }
      } catch {}
    }

    return { success: false, error: "تعذر استخراج m3u8 من أي سيرفر", title };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Validate that an .m3u8 stream returns HTTP 200
 */
async function verifyM3u8Stream(streamUrl) {
  try {
    const res = await fetch(streamUrl, {
      method: "GET",
      headers: {
        ...BROWSER_HEADERS,
        Referer: streamUrl.includes("mwdy") ? "https://mwdy.cc/" : "https://miravd.com/",
        Range: "bytes=0-1024",
      },
      signal: AbortSignal.timeout(5000),
    });
    return res.status === 200 || res.status === 206;
  } catch {
    return false;
  }
}

/**
 * Rapid Parallel Concurrent Item Processor
 */
async function processItem(item) {
  const { id, slug, title, url, type } = item;
  const key = slug || id;

  if (decodedStore[key] || isItemFailed(key)) {
    return { success: false, skipped: true };
  }

  workerState.currentlyProcessing.push(title || key);
  if (workerState.currentlyProcessing.length > 8) {
    workerState.currentlyProcessing.shift();
  }

  try {
    const res = await resolve3iskWatchUrl(url);
    if (res.success && res.streamUrl) {
      const ok = await verifyM3u8Stream(res.streamUrl);
      if (ok) {
        decodedStore[key] = res.streamUrl;
        if (id && id !== key) decodedStore[id] = res.streamUrl;
        saveDecodedStore();
        workerState.lastDecoded = title || key;
        workerState.sessionDecodedCount++;

        const isMovie = type === "movie" || url.includes("/movies/");
        console.log(`✅ [WORKER] DECODED: ${title || key} -> ${res.streamUrl.slice(0, 45)}...`);

        // Milestone notification every 25 decoded items
        if (workerState.sessionDecodedCount % 25 === 0) {
          const totalNow = Object.keys(decodedStore).length;
          await broadcastAlert(`
⚡ <b>إنجاز جديد: تم فك تشفير 25 حلقة وفيلم جديدة!</b>
📊 <b>إجمالي المكتبة المفكوكة والجاهزة الآن:</b> ${totalNow}
🎬 <b>آخر ما تم فكه:</b> ${title || key}
          `.trim());
        }

        return { success: true, key, streamUrl: res.streamUrl };
      }
    }

    markItemFailed(key, res.error || "Verification failed");
  } catch (e) {
    markItemFailed(key, e.message);
  } finally {
    workerState.currentlyProcessing = workerState.currentlyProcessing.filter((t) => t !== (title || key));
  }

  return { success: false };
}

/**
 * Parallel Concurrency Pool Runner
 */
async function runConcurrentPool(items, concurrency, onProgress) {
  let index = 0;
  let completed = 0;
  const total = items.length;

  const workers = Array.from({ length: concurrency }, async (_, workerId) => {
    while (index < items.length) {
      const current = items[index++];
      workerState.activeWorkers++;
      await processItem(current);
      workerState.activeWorkers = Math.max(0, workerState.activeWorkers - 1);
      completed++;

      if (onProgress && completed % 10 === 0) {
        onProgress(completed, total);
      }

      // Small jitter between parallel worker requests to prevent network choke
      await new Promise((r) => setTimeout(r, 150));
    }
  });

  await Promise.all(workers);
  saveDecodedStore(true);
}

/**
 * Check and decode new releases from 3isk
 */
async function checkNewReleases() {
  console.log(`[${new Date().toLocaleTimeString()}] 🔍 Scanning 3isk for new releases...`);
  workerState.status = "فحص الحلقات والأفلام الجديدة";

  const sources = [
    "https://3iskk.xyz/",
    "https://3iskk.xyz/genre/esheeqnew-46/",
    "https://3iskk.xyz/genre/esheeqnew-46/page/2/",
    "https://3iskk.xyz/movies/",
  ];

  loadDecodedStore();
  loadFailedStore();

  const newItems = [];
  const seenUrls = new Set();

  for (const src of sources) {
    try {
      const res = await fetch(src, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const html = await res.text();

      const epMatches = Array.from(
        html.matchAll(/<a[^>]+href=["'](https:\/\/3iskk\.xyz\/watch\/(?:episodes|movies)\/([^"'/]+)\/?)["'][^>]*>([\s\S]*?)<\/a>/gi)
      );

      for (const m of epMatches) {
        const fullUrl = m[1];
        const slug = m[2];
        const rawTitle = m[3].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

        if (decodedStore[slug] || isItemFailed(slug) || seenUrls.has(fullUrl)) {
          continue;
        }

        seenUrls.add(fullUrl);
        newItems.push({
          id: slug,
          slug,
          title: rawTitle,
          url: fullUrl,
          type: fullUrl.includes("/movies/") ? "movie" : "episode",
        });
      }
    } catch {}
  }

  if (newItems.length > 0) {
    console.log(`🚀 Found ${newItems.length} fresh items to decode in parallel!`);
    await runConcurrentPool(newItems, Math.min(CONCURRENCY, 6));
  }
}

/**
 * High-Speed Catalog Decoder
 */
async function decodeEntireCatalog() {
  if (!fs.existsSync(catalogGzPath)) return;

  let catalog = null;
  try {
    const buf = fs.readFileSync(catalogGzPath);
    const decompressed = zlib.gunzipSync(buf).toString("utf-8");
    catalog = JSON.parse(decompressed);
  } catch {
    return;
  }

  loadDecodedStore();
  loadFailedStore();

  // Build prioritized queue
  const queue = [];

  // 1. Trending Series Episodes (First priority!)
  const seriesList = Object.values(catalog.series || {});
  for (const s of seriesList) {
    const slug = s.slug || s.id;
    if (!slug) continue;
    const seasons = s.seasons || [];
    for (const sn of seasons) {
      for (const ep of sn.episodes || []) {
        const epId = ep.id || `${slug}-s${sn.number}-e${ep.number}`;
        if (!decodedStore[epId] && !isItemFailed(epId)) {
          queue.push({
            id: epId,
            slug: epId,
            title: `${s.titleAr || slug} - حلقة ${ep.number}`,
            url: `https://3iskk.xyz/watch/episodes/${epId}/`,
            type: "episode",
          });
        }
      }
    }
  }

  // 2. Movies
  const movies = Object.values(catalog.movies || {});
  for (const m of movies) {
    const slug = m.slug || m.id;
    if (!slug) continue;
    if (!decodedStore[slug] && !isItemFailed(slug)) {
      queue.push({
        id: m.id || slug,
        slug,
        title: m.titleAr || slug,
        url: `https://3iskk.xyz/watch/movies/${slug}/`,
        type: "movie",
      });
    }
  }

  console.log(`\n======================================================`);
  console.log(`⚡ TURBO CATALOG DECODER QUEUE: ${queue.length} items remaining.`);
  console.log(`⚡ Concurrency Level: ${CONCURRENCY} parallel workers.`);
  console.log(`======================================================\n`);

  if (queue.length === 0) {
    workerState.status = "المكتبة مكتملة بالكامل 100%";
    return;
  }

  workerState.status = `فك تشفير المكتبة (${queue.length} متبقي) بـ ${CONCURRENCY} عمال متوازيين`;

  await runConcurrentPool(queue, CONCURRENCY, (done, total) => {
    console.log(`[PROGRESS] Processed ${done}/${total} items in catalog.`);
  });
}

/**
 * Independent Telegram Poller (Always instant and non-blocking)
 */
let telegramUpdateOffset = 0;

async function startTelegramPoller() {
  console.log("[Telegram] Poller started (independent async thread).");
  while (true) {
    try {
      const url = `${TELEGRAM_API}/getUpdates?offset=${telegramUpdateOffset}&timeout=5`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            telegramUpdateOffset = update.update_id + 1;
            const msg = update.message;
            if (!msg || !msg.text) continue;

            const chatId = msg.chat.id;
            const text = msg.text.trim();
            addSubscriber(chatId);

            loadDecodedStore();
            const decodedCount = Object.keys(decodedStore).length;

            if (text.startsWith("/start") || text === "بدء") {
              const welcome = [
                `👋 <b>أهلاً بك في بوت إدارة منصة TVORA</b> (@f1iq_bot)`,
                ``,
                `🚀 <b>محرك فك التشفير فائق السرعة يعمل الآن بـ ${CONCURRENCY} مسارات متوازية!</b>`,
                ``,
                `📊 <b>الإحصائيات الحالية:</b>`,
                `• الروابط المفكوكة والجاهزة: <b>${decodedCount}</b>`,
                `• حالة المحرك: <b>${workerState.status}</b>`,
                `• المسارات النشطة: <b>${workerState.activeWorkers} عمال متوازيين</b>`,
                `• قيد الفك الآن: <i>${workerState.currentlyProcessing.slice(0, 3).join(", ") || "جاهز"}</i>`,
                ``,
                `📌 <b>الأوامر السريعة:</b>`,
                `/status - الحالة اللحظية والإحصائيات`,
                `/latest - آخر 5 روابط مفكوكة`,
                `/check - فحص فوري للموقع لاكتشاف الجديد`,
                `/decode [رابط] - فك تشفير رابط محدد فوراً`,
              ].join("\n");

              const keyboard = {
                keyboard: [
                  [{ text: "📊 الحالة والإحصائيات" }, { text: "🎬 آخر الإضافات" }],
                  [{ text: "🔍 فحص الجديد الآن" }, { text: "⚡ تشغيل تجريبي" }],
                ],
                resize_keyboard: true,
              };

              await sendTelegram(chatId, welcome, keyboard);
            } else if (text.startsWith("/status") || text.includes("الحالة") || text.includes("الإحصائيات")) {
              const statusMsg = [
                `📊 <b>حالة محرك TVORA فائق السرعة (Turbo 24/7):</b>`,
                ``,
                `✅ <b>الروابط المفكوكة في قاعدة البيانات:</b> ${decodedCount}`,
                `⚡ <b>قوة المعالجة:</b> ${CONCURRENCY} مسارات معالجة متوازية`,
                `⚙️ <b>النشاط الحالي:</b> ${workerState.status}`,
                `⏳ <b>قيد المعالجة الآن:</b> <code>${workerState.currentlyProcessing.slice(0, 3).join(" | ") || "لا يوجد"}</code>`,
                `🎬 <b>آخر ما تم فكه:</b> ${workerState.lastDecoded}`,
                `🔥 <b>تم فكه في هذه الجلسة:</b> ${workerState.sessionDecodedCount}`,
                ``,
                `🌐 <b>رابط الـ API الحي المفلتر:</b>`,
                `<code>https://move-api-production-a427.up.railway.app/api/v1/movies</code>`,
              ].join("\n");

              await sendTelegram(chatId, statusMsg);
            } else if (text.startsWith("/latest") || text.includes("آخر الإضافات")) {
              const keys = Object.keys(decodedStore).filter((k) => !k.startsWith("http")).slice(-5).reverse();
              if (keys.length === 0) {
                await sendTelegram(chatId, "لا توجد عناصر مفكوكة بعد.");
              } else {
                const list = keys.map((k, i) => {
                  const playUrl = `https://move-api-production-a427.up.railway.app/api/v1/play?id=${encodeURIComponent(k)}`;
                  return `${i + 1}. <b>${k}</b>\n🔗 <code>${playUrl}</code>`;
                }).join("\n\n");

                await sendTelegram(chatId, `🎬 <b>آخر 5 عناصر تم فك تشفيرها وجاهزة للتشغيل:</b>\n\n${list}`);
              }
            } else if (text.startsWith("/check") || text.includes("فحص الجديد")) {
              await sendTelegram(chatId, "🔍 جاري فحص https://3iskk.xyz/ بحثاً عن أي حلقات أو أفلام جديدة بالمسارات المتوازية...");
              await checkNewReleases();
              await sendTelegram(chatId, `✅ تم الفحص! إجمالي الروابط المفكوكة الآن: ${Object.keys(decodedStore).length}`);
            } else if (text.startsWith("/decode")) {
              const parts = text.split(" ");
              const target = parts[1];
              if (!target) {
                await sendTelegram(chatId, "⚠️ يرجى إرسال الرابط أو المعرف بعد الأمر:\nمثال:\n<code>/decode serie-organize-isler-mudblij-season-1-episode-1</code>");
              } else {
                await sendTelegram(chatId, `⏳ جاري فك تشفير: <code>${target}</code>...`);
                const watchUrl = target.startsWith("http") ? target : `https://3iskk.xyz/watch/episodes/${target}/`;
                const res = await resolve3iskWatchUrl(watchUrl);
                if (res.success && res.streamUrl) {
                  decodedStore[target] = res.streamUrl;
                  saveDecodedStore(true);
                  const playUrl = `https://move-api-production-a427.up.railway.app/api/v1/play?id=${encodeURIComponent(target)}`;
                  await sendTelegram(chatId, `✅ <b>تم فك التشفير بنجاح!</b>\n\n⚡ <b>رابط التشغيل المباشر:</b>\n<code>${playUrl}</code>\n\n📹 <b>البث الأصلي:</b>\n<code>${res.streamUrl}</code>`);
                } else {
                  await sendTelegram(chatId, `❌ تعذر فك تشفير هذا الرابط: ${res.error || "سيرفر غير متاح"}`);
                }
              }
            }
          }
        }
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
}

/**
 * Main Turbo Daemon
 */
async function main() {
  console.log(`
======================================================
🚀 TVORA ULTRA HIGH-SPEED CONCURRENT ENGINE STARTED
⚡ Workers: ${CONCURRENCY} parallel pipelines
🤖 Telegram Bot: @f1iq_bot (Instant responder)
📁 Storage: ${decodedPath}
======================================================
  `);

  loadDecodedStore();
  loadFailedStore();
  loadSubscribers();

  console.log(`[Init] Loaded ${Object.keys(decodedStore).length} decoded streams.`);
  console.log(`[Init] Loaded ${Object.keys(failedStore).length} failed items cache.`);
  console.log(`[Init] Loaded ${subscribers.length} registered Telegram subscribers.`);

  // 1. Launch instant Telegram polling in background
  startTelegramPoller();

  // 2. Infinite scanning and catalog decoding loop
  while (true) {
    try {
      // Step A: Instant check for new releases
      await checkNewReleases();

      // Step B: Decode whole catalog with parallel workers
      await decodeEntireCatalog();

      // Sleep 5 minutes before next full cycle
      console.log(`[Cycle Complete] Sleeping 5 minutes before next sweep...`);
      await new Promise((r) => setTimeout(r, 5 * 60 * 1000));
    } catch (e) {
      console.error("[TVORA Loop Error]:", e.message);
      await new Promise((r) => setTimeout(r, 10000));
    }
  }
}

main().catch(console.error);

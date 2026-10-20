// TVORA 24/7 Background Sync & Decoder Daemon with Telegram Bot
import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8937658776:AAExk0dpO9vIC52-HeCezsHGbn5HI5GomE0";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const dataDir = path.join(process.cwd(), "data");
const decodedPath = path.join(dataDir, "decoded_streams.json");
const subscribersPath = path.join(dataDir, "telegram_subscribers.json");
const catalogGzPath = path.join(dataDir, "3isk_catalog.json.gz");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Global in-memory state
let decodedStore = {};
let subscribers = [];
let workerState = {
  status: "بدء التشغيل",
  currentlyProcessing: "لا يوجد",
  lastDecoded: "لا يوجد",
  totalNewDiscovered: 0,
  startedAt: new Date().toISOString(),
};

// Load saved data
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

function saveDecodedStore() {
  try {
    fs.writeFileSync(decodedPath, JSON.stringify(decodedStore, null, 2), "utf-8");
  } catch (e) {
    console.error("[TVORA Daemon] Error saving decoded_streams.json:", e.message);
  }
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

// Telegram helpers
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
      signal: AbortSignal.timeout(8000),
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
      signal: AbortSignal.timeout(8000),
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
        const res = await fetch(embedUrl, { headers, signal: AbortSignal.timeout(8000) });
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
 * Multi-stage 3isk web page to direct HLS .m3u8
 */
async function resolve3iskWatchUrl(pageUrl) {
  try {
    const r1 = await fetch(pageUrl, {
      headers: { ...BROWSER_HEADERS, Referer: "https://3iskk.xyz/" },
      signal: AbortSignal.timeout(10000),
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
      signal: AbortSignal.timeout(10000),
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
        signal: AbortSignal.timeout(10000),
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
      const directCdnMatch = playerHtml.match(/<iframe[^>]+src=["'](https:\/\/[^"']*(?:miravd|mwdy|ukrcdn|grzcdn|upstream|vidmoly)[^"']*)["']/i);
      if (directCdnMatch && directCdnMatch[1]) {
        candidateHosts.push(directCdnMatch[1]);
      }
    }

    if (candidateHosts.length === 0) {
      return { success: false, error: "لم يتم العثور على سيرفرات المشغل المصدري", title };
    }

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
      signal: AbortSignal.timeout(6000),
    });
    return res.status === 200 || res.status === 206;
  } catch {
    return false;
  }
}

/**
 * Discover new episodes from 3isk homepage and latest pages
 */
async function checkNewReleases() {
  console.log(`[${new Date().toLocaleTimeString()}] 🔍 Checking 3isk for new releases...`);
  workerState.status = "فحص الحلقات والأفلام الجديدة";

  const sources = [
    "https://3iskk.xyz/",
    "https://3iskk.xyz/genre/esheeqnew-46/",
    "https://3iskk.xyz/genre/esheeqnew-46/page/2/",
    "https://3iskk.xyz/movies/",
  ];

  loadDecodedStore();
  let newFound = 0;

  for (const src of sources) {
    try {
      const res = await fetch(src, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(10000) });
      if (!res.ok) continue;
      const html = await res.text();

      // Find episode links
      const epMatches = Array.from(
        html.matchAll(/<a[^>]+href=["'](https:\/\/3iskk\.xyz\/watch\/(?:episodes|movies)\/([^"'/]+)\/?)["'][^>]*>([\s\S]*?)<\/a>/gi)
      );

      for (const m of epMatches) {
        const fullUrl = m[1];
        const slug = m[2];
        const rawTitle = m[3].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

        if (decodedStore[slug] || decodedStore[fullUrl]) {
          continue; // Already decoded!
        }

        console.log(`✨ DISCOVERED NEW ITEM: ${slug} (${rawTitle})`);
        workerState.currentlyProcessing = `فك تشفير: ${rawTitle || slug}`;

        const resolved = await resolve3iskWatchUrl(fullUrl);
        if (resolved.success && resolved.streamUrl) {
          const isValid = await verifyM3u8Stream(resolved.streamUrl);
          if (isValid) {
            decodedStore[slug] = resolved.streamUrl;
            decodedStore[fullUrl] = resolved.streamUrl;
            saveDecodedStore();
            newFound++;
            workerState.totalNewDiscovered++;
            workerState.lastDecoded = rawTitle || slug;

            const isMovie = fullUrl.includes("/movies/");
            const cleanTitle = (rawTitle || slug)
              .replace(/موقع\s*قصة\s*عشق.*$/gi, "")
              .replace(/قصة\s*عشق/gi, "")
              .trim();

            const playUrl = `https://move-api-production-a427.up.railway.app/api/v1/play?id=${encodeURIComponent(slug)}`;

            const alertMsg = [
              `🎬 <b>تم اكتشاف وفك تشفير ${isMovie ? "فيلم" : "حلقة"} جديد فوراً!</b>`,
              ``,
              `📌 <b>العنوان:</b> ${cleanTitle}`,
              `🆔 <b>المعرّف:</b> <code>${slug}</code>`,
              ``,
              `⚡ <b>رابط التشغيل المباشر لجميع المشغلات:</b>`,
              `<code>${playUrl}</code>`,
              ``,
              `✅ متاح الآن في الـ API ومفكوك التشفير 100%!`,
            ].join("\n");

            console.log(`✅ SUCCESSFULLY DECODED & VERIFIED: ${slug}`);
            await broadcastAlert(alertMsg);
          }
        }

        // Small pause between fetches
        await new Promise((r) => setTimeout(r, 600));
      }
    } catch (e) {
      console.error(`[TVORA Daemon] Error scraping ${src}:`, e.message);
    }
  }

  console.log(`[${new Date().toLocaleTimeString()}] ✅ Finished new releases check. Found & decoded: ${newFound}`);
}

/**
 * Background catalog-wide decoder loop
 */
async function catalogDecoderStep() {
  workerState.status = "فك تشفير مكتبة المسلسلات والأفلام المتبقية";

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

  // 1. Process movies first
  const movies = Object.values(catalog.movies || {});
  for (const m of movies) {
    const slug = m.slug || m.id;
    if (!slug) continue;
    if (decodedStore[slug] || decodedStore[m.id]) continue;

    const watchUrl = `https://3iskk.xyz/watch/movies/${slug}/`;
    workerState.currentlyProcessing = `فيلم: ${m.titleAr || slug}`;

    try {
      const res = await resolve3iskWatchUrl(watchUrl);
      if (res.success && res.streamUrl) {
        const ok = await verifyM3u8Stream(res.streamUrl);
        if (ok) {
          decodedStore[slug] = res.streamUrl;
          if (m.id) decodedStore[m.id] = res.streamUrl;
          saveDecodedStore();
          workerState.lastDecoded = m.titleAr || slug;
          console.log(`🎬 DECODED MOVIE: ${m.titleAr || slug}`);
        }
      }
    } catch {}

    await new Promise((r) => setTimeout(r, 800));
    return; // Do one item per step so event loop and telegram polling are never blocked
  }

  // 2. Process series episodes
  const seriesList = Object.values(catalog.series || {});
  for (const s of seriesList) {
    const slug = s.slug || s.id;
    if (!slug) continue;

    const seasons = s.seasons || [];
    for (const sn of seasons) {
      for (const ep of sn.episodes || []) {
        const epId = ep.id || `${slug}-s${sn.number}-e${ep.number}`;
        if (decodedStore[epId]) continue;

        const epWatchUrl = `https://3iskk.xyz/watch/episodes/${epId}/`;
        workerState.currentlyProcessing = `مسلسل: ${s.titleAr || slug} - حلقة ${ep.number}`;

        try {
          const res = await resolve3iskWatchUrl(epWatchUrl);
          if (res.success && res.streamUrl) {
            const ok = await verifyM3u8Stream(res.streamUrl);
            if (ok) {
              decodedStore[epId] = res.streamUrl;
              saveDecodedStore();
              workerState.lastDecoded = `${s.titleAr} - حلقة ${ep.number}`;
              console.log(`📺 DECODED EPISODE: ${s.titleAr} - حلقة ${ep.number} (${epId})`);
            }
          }
        } catch {}

        await new Promise((r) => setTimeout(r, 800));
        return; // Do one item per step
      }
    }
  }
}

/**
 * Telegram Long-polling handler
 */
let telegramUpdateOffset = 0;

async function pollTelegramUpdates() {
  try {
    const url = `${TELEGRAM_API}/getUpdates?offset=${telegramUpdateOffset}&timeout=5`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return;

    const data = await res.json();
    if (!data.ok || !Array.isArray(data.result)) return;

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
          `🤖 <b>نظام فك التشفير التلقائي يعمل الآن 24/7 على مدار الساعة بدون توقف.</b>`,
          `يتم فحص مكتبة https://3iskk.xyz/ تلقائياً وفك تشفير جميع الأفلام والمسلسلات لتصبح جاهزة للتشغيل على أي مشغل بالعالم!`,
          ``,
          `📊 <b>الإحصائيات الحالية:</b>`,
          `• الروابط المفكوكة والجاهزة: <b>${decodedCount}</b>`,
          `• حالة السكربت: <b>${workerState.status}</b>`,
          `• قيد المعالجة الآن: <i>${workerState.currentlyProcessing}</i>`,
          ``,
          `📌 <b>الأوامر المتاحة:</b>`,
          `/status - حالة السكربت وعدد الأفلام والمسلسلات`,
          `/latest - آخر الإضافات المفكوكة بروابط التشغيل`,
          `/check - فحص فوري للموقع لاكتشاف الجديد الآن`,
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
          `📊 <b>حالة نظام TVORA التلقائي (24/7):</b>`,
          ``,
          `✅ <b>الروابط المفكوكة في قاعدة البيانات:</b> ${decodedCount}`,
          `⚙️ <b>النشاط الحالي:</b> ${workerState.status}`,
          `⏳ <b>جاري فك:</b> <code>${workerState.currentlyProcessing}</code>`,
          `⚡ <b>آخر ما تم فكه:</b> ${workerState.lastDecoded}`,
          `🆕 <b>الجديد المكتشف تلقائياً:</b> ${workerState.totalNewDiscovered}`,
          `🕒 <b>يعمل منذ:</b> ${new Date(workerState.startedAt).toLocaleString("ar")}`,
          ``,
          `🌐 <b>رابط الـ API الحي:</b>`,
          `<code>https://move-api-production-a427.up.railway.app/api/v1/movies</code>`,
        ].join("\n");

        await sendTelegram(chatId, statusMsg);
      } else if (text.startsWith("/latest") || text.includes("آخر الإضافات")) {
        const keys = Object.keys(decodedStore).filter(k => !k.startsWith("http")).slice(-5).reverse();
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
        await sendTelegram(chatId, "🔍 جاري فحص https://3iskk.xyz/ بحثاً عن أي حلقات أو أفلام جديدة...");
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
            saveDecodedStore();
            const playUrl = `https://move-api-production-a427.up.railway.app/api/v1/play?id=${encodeURIComponent(target)}`;
            await sendTelegram(chatId, `✅ <b>تم فك التشفير بنجاح!</b>\n\n⚡ <b>رابط التشغيل:</b>\n<code>${playUrl}</code>\n\n📹 <b>رابط البث الأصلي:</b>\n<code>${res.streamUrl}</code>`);
          } else {
            await sendTelegram(chatId, `❌ تعذر فك تشفير هذا الرابط: ${res.error || "سيرفر غير متاح"}`);
          }
        }
      }
    }
  } catch (err) {
    // Silently ignore telegram network hiccups
  }
}

/**
 * Main 24/7 Daemon Loop
 */
async function main() {
  console.log(`
======================================================
🚀 TVORA 24/7 BACKGROUND AUTOMATED ENGINE STARTED
🤖 Telegram Bot: @f1iq_bot
📁 Storage: ${decodedPath}
======================================================
  `);

  loadDecodedStore();
  loadSubscribers();
  console.log(`[Init] Loaded ${Object.keys(decodedStore).length} decoded streams.`);
  console.log(`[Init] Loaded ${subscribers.length} registered Telegram subscribers.`);

  // Notify subscribers system is online
  await broadcastAlert(`
🚀 <b>تم تشغيل سكربت TVORA التلقائي (24/7) بنجاح!</b>

✅ السكربت يراقب موقع 3isk بدون توقف.
✅ فك تشفير أي حلقة أو فيلم ينزل فوراً.
✅ إرسال إشعار فوري هنا عند إضافة أي جديد.
  `.trim());

  let lastNewCheck = 0;
  const NEW_CHECK_INTERVAL_MS = 3 * 60 * 1000; // Check 3isk for new items every 3 minutes

  while (true) {
    const now = Date.now();

    // 1. Check for new releases on 3isk
    if (now - lastNewCheck > NEW_CHECK_INTERVAL_MS) {
      await checkNewReleases();
      lastNewCheck = Date.now();
    }

    // 2. Decode next undecoded item from the catalog
    await catalogDecoderStep();

    // 3. Process telegram updates
    await pollTelegramUpdates();

    // Small delay to prevent tight loop
    await new Promise((r) => setTimeout(r, 400));
  }
}

main().catch((err) => {
  console.error("FATAL DAEMON CRASH:", err);
});

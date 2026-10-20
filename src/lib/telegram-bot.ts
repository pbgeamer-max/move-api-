import * as fs from "fs";
import * as path from "path";

export const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8937658776:AAExk0dpO9vIC52-HeCezsHGbn5HI5GomE0";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const subscribersPath = path.join(process.cwd(), "data", "telegram_subscribers.json");

export function getSubscribers(): number[] {
  try {
    if (fs.existsSync(subscribersPath)) {
      const data = JSON.parse(fs.readFileSync(subscribersPath, "utf-8"));
      if (Array.isArray(data)) return data;
    }
  } catch {}
  return [];
}

export function addSubscriber(chatId: number): boolean {
  try {
    const list = getSubscribers();
    if (!list.includes(chatId)) {
      list.push(chatId);
      fs.writeFileSync(subscribersPath, JSON.stringify(list, null, 2), "utf-8");
      return true;
    }
  } catch {}
  return false;
}

export async function sendTelegramMessage(chatId: number | string, text: string, parseMode: "HTML" | "Markdown" = "HTML") {
  try {
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }),
    });
    return await res.json();
  } catch (err: any) {
    console.error(`[Telegram] Error sending message to ${chatId}:`, err.message);
    return null;
  }
}

export async function broadcastTelegramAlert(text: string, parseMode: "HTML" | "Markdown" = "HTML") {
  const subs = getSubscribers();
  if (subs.length === 0) {
    console.log("[Telegram] No subscribers registered yet. Message logged.");
    return;
  }

  for (const chatId of subs) {
    await sendTelegramMessage(chatId, text, parseMode);
  }
}

export async function notifyNewEpisodeDecoded(info: {
  seriesTitle: string;
  seasonNumber: number;
  episodeNumber: number;
  episodeId: string;
  streamUrl: string;
  playUrl: string;
}) {
  const msg = [
    '🎬 <b>تم فك تشفير وإضافة حلقة جديدة تلقائياً!</b>',
    '',
    `📺 <b>المسلسل:</b> ${info.seriesTitle}`,
    `📌 <b>الموسم:</b> ${info.seasonNumber} | <b>الحلقة:</b> ${info.episodeNumber}`,
    `🆔 <b>المعرّف:</b> <code>${info.episodeId}</code>`,
    '',
    '⚡ <b>رابط التشغيل المباشر لجميع المشغلات:</b>',
    `<code>${info.playUrl}</code>`,
    '',
    '✅ جاهز الآن في مكتبة الـ API بدون تشفير!'
  ].join('\n');

  await broadcastTelegramAlert(msg, "HTML");
}

export async function notifyNewMovieDecoded(info: {
  title: string;
  movieId: string;
  streamUrl: string;
  playUrl: string;
  year?: number;
}) {
  const yearText = info.year ? ` (${info.year})` : '';
  const msg = [
    '🎥 <b>تم فك تشفير وإضافة فيلم جديد تلقائياً!</b>',
    '',
    `🎬 <b>الفيلم:</b> ${info.title}${yearText}`,
    `🆔 <b>المعرّف:</b> <code>${info.movieId}</code>`,
    '',
    '⚡ <b>رابط التشغيل المباشر لجميع المشغلات:</b>',
    `<code>${info.playUrl}</code>`,
    '',
    '✅ مفكوك التشفير بنسبة 100% وجاهز على أي مشغل بالعالم!'
  ].join('\n');

  await broadcastTelegramAlert(msg, "HTML");
}

export async function notifyProgressReport(stats: {
  totalMoviesDecoded: number;
  totalEpisodesDecoded: number;
  activeStatus: string;
  recentlyDecodedTitle?: string;
}) {
  const recentText = stats.recentlyDecodedTitle ? `⚡ <b>آخر ما تم فكه:</b> ${stats.recentlyDecodedTitle}` : '';
  const msg = [
    '📊 <b>تقرير الإنجاز التلقائي للنظام (24/7)</b>',
    '',
    `🎥 <b>الأفلام المفكوكة بالكامل:</b> ${stats.totalMoviesDecoded}`,
    `📺 <b>الحلقات المفكوكة بالكامل:</b> ${stats.totalEpisodesDecoded}`,
    `⚙️ <b>حالة السكربت:</b> ${stats.activeStatus}`,
    recentText,
    '',
    '🕒 <i>النظام يعمل على مدار الساعة لاكتشاف وفك أي محتوى جديد فوراً</i>'
  ].filter(Boolean).join('\n');

  await broadcastTelegramAlert(msg, "HTML");
}

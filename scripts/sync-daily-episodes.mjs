// TVORA Daily Episodes Synchronizer
// Automatically fetches newly released episodes from 3isk and upserts them into Supabase/PostgreSQL
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "ar,en-US;q=0.9,en;q=0.8",
};

export function parseEpisodeInfo(url, rawTitle) {
  const p1 = url.match(
    /\/watch\/episodes\/(?:serie-)?([a-z0-9-]+?)(?:-season-(\d+))?-episode-(\d+)(?:-[a-z0-9]+)?\/?$/i
  );
  let seriesSlug = "";
  let seasonNumber = 1;
  let episodeNumber = 1;

  if (p1) {
    seriesSlug = "serie-" + p1[1].replace(/^serie-/, "");
    seasonNumber = p1[2] ? parseInt(p1[2], 10) : 1;
    episodeNumber = parseInt(p1[3], 10);
  } else {
    const epMatch = url.match(/episode-(\d+)/i);
    if (epMatch) episodeNumber = parseInt(epMatch[1], 10);
    const seMatch = url.match(/season-(\d+)/i);
    if (seMatch) seasonNumber = parseInt(seMatch[1], 10);
    const slugMatch = url.match(/\/watch\/episodes\/([a-z0-9-]+?)(?:-season|-episode|\/?$)/i);
    if (slugMatch) seriesSlug = slugMatch[1];
  }

  // Clean title for Arabic display
  let cleanTitle = (rawTitle || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/حلقة\s+\d+/g, "")
    .replace(/الحلقة\s+\d+/g, "")
    .replace(/مترجمة?/g, "")
    .replace(/مدبلجة?/g, "")
    .replace(/قصة عشق/g, "")
    .replace(/الموسم\s+[^\s]+/g, "")
    .replace(/مسلسل\s+/g, "")
    .replace(/الاخيرة/g, "")
    .trim();

  // Remove trailing "ال" artifact if any
  cleanTitle = cleanTitle.replace(/\s+ال$/, "").trim();

  return {
    url,
    seriesSlug,
    seasonNumber,
    episodeNumber,
    seriesTitleAr: cleanTitle || seriesSlug,
  };
}

async function fetchPage(url) {
  try {
    const r = await fetch(url, { headers: BROWSER_HEADERS });
    if (!r.ok) return "";
    return await r.text();
  } catch (err) {
    console.error(`Failed to fetch ${url}:`, err.message);
    return "";
  }
}

async function scrapeShowInfo(seriesSlug) {
  const url = `https://3iskk.xyz/watch/tvshows/${seriesSlug}/`;
  const html = await fetchPage(url);
  if (!html) return null;

  const titleMatch = html.match(/<h1[^>]*class=["']title["'][^>]*>([\s\S]*?)<\/h1>/i);
  const posterMatch = html.match(/<div class=["']poster-wrapper["'][^>]*>\s*<img[^>]+src=["']([^"']+)["']/i);
  const backdropMatch = html.match(/class=["']single-background["'][^>]*style=["'][^"']*url\(([^)]+)\)/i);
  const synopsisMatch = html.match(/<p class=["']description["'][^>]*>([\s\S]*?)<\/p>/i);

  const titleAr = titleMatch
    ? titleMatch[1].replace(/<[^>]+>/g, "").replace(/مترجم.*$/i, "").trim()
    : seriesSlug;

  const posterUrl = posterMatch ? posterMatch[1] : null;
  const backdropUrl = backdropMatch ? backdropMatch[1].replace(/['"]/g, "") : posterUrl;
  const synopsisAr = synopsisMatch
    ? synopsisMatch[1].replace(/<[^>]+>/g, "").trim()
    : `مسلسل درامي تركي ${titleAr}`;

  return {
    titleAr,
    titleEn: seriesSlug.replace(/^serie-/, "").replace(/-/g, " "),
    posterUrl,
    backdropUrl,
    synopsisAr,
  };
}

export async function syncDailyEpisodes() {
  console.log("=== [TVORA Daily Episode Synchronizer] Starting ===");
  const sources = [
    "https://3iskk.xyz/",
    "https://3iskk.xyz/genre/esheeqnew-46/",
    "https://3iskk.xyz/genre/esheeqnew-46/page/2/",
  ];

  const seen = new Set();
  const episodesToProcess = [];

  for (const src of sources) {
    console.log(`Scraping latest updates from: ${src}`);
    const html = await fetchPage(src);
    if (!html) continue;

    const regex = /<a[^>]+href=["'](https:\/\/3iskk\.xyz\/watch\/episodes\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    const matches = Array.from(html.matchAll(regex));

    for (const m of matches) {
      const epUrl = m[1];
      if (seen.has(epUrl)) continue;
      seen.add(epUrl);
      const parsed = parseEpisodeInfo(epUrl, m[2]);
      if (parsed.seriesSlug) {
        episodesToProcess.push(parsed);
      }
    }
  }

  console.log(`Discovered ${episodesToProcess.length} newly released episode links.`);

  let addedCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < episodesToProcess.length; i++) {
    const ep = episodesToProcess[i];
    try {
      // 1. Check if series exists
      let titleRecord = await prisma.title.findFirst({
        where: {
          OR: [{ slug: ep.seriesSlug }, { id: `ser_${ep.seriesSlug}` }],
        },
      });

      // If series does not exist, fetch its details and create it
      if (!titleRecord) {
        console.log(`Series ${ep.seriesSlug} not found in DB. Fetching show metadata...`);
        const showInfo = await scrapeShowInfo(ep.seriesSlug);
        const titleId = `ser_${ep.seriesSlug}`;
        titleRecord = await prisma.title.create({
          data: {
            id: titleId,
            slug: ep.seriesSlug,
            type: "series",
            titleAr: showInfo?.titleAr || ep.seriesTitleAr,
            titleEn: showInfo?.titleEn || ep.seriesSlug,
            synopsisAr: showInfo?.synopsisAr || "",
            synopsisEn: `Turkish drama series: ${showInfo?.titleEn || ep.seriesSlug}.`,
            posterUrl: showInfo?.posterUrl || null,
            backdropUrl: showInfo?.backdropUrl || null,
            releaseYear: new Date().getFullYear(),
            genres: JSON.stringify(["مسلسلات تركية", "جديد الحلقات"]),
            rating: 8.8,
            featured: false,
            trending: true,
            isNew: true,
            country: "Turkey",
            contentLang: "tr",
          },
        });
        console.log(`Created new series in DB: ${titleRecord.titleAr} (${titleRecord.slug})`);
      } else {
        // Mark existing series as trending & isNew since a new episode just dropped!
        await prisma.title.update({
          where: { id: titleRecord.id },
          data: {
            trending: true,
            isNew: true,
            updatedAt: new Date(),
          },
        });
      }

      // 2. Upsert Season
      const seasonRecord = await prisma.season.upsert({
        where: {
          titleId_number: {
            titleId: titleRecord.id,
            number: ep.seasonNumber,
          },
        },
        update: {},
        create: {
          id: `sea_${ep.seriesSlug}_s${ep.seasonNumber}`,
          titleId: titleRecord.id,
          number: ep.seasonNumber,
          titleAr: `الموسم ${ep.seasonNumber}`,
          titleEn: `Season ${ep.seasonNumber}`,
        },
      });

      // 3. Upsert Episode
      const epId = `ep_${ep.seriesSlug}_s${ep.seasonNumber}_e${ep.episodeNumber}`;
      const existingEp = await prisma.episode.findUnique({
        where: {
          seasonId_number: {
            seasonId: seasonRecord.id,
            number: ep.episodeNumber,
          },
        },
      });

      if (!existingEp) {
        await prisma.episode.create({
          data: {
            id: epId,
            seasonId: seasonRecord.id,
            titleId: titleRecord.id,
            number: ep.episodeNumber,
            titleAr: `مسلسل ${titleRecord.titleAr} الحلقة ${ep.episodeNumber}`,
            titleEn: `Episode ${ep.episodeNumber}`,
            synopsisAr: `الحلقة ${ep.episodeNumber} من مسلسل ${titleRecord.titleAr}.`,
            synopsisEn: `Episode ${ep.episodeNumber} of ${titleRecord.titleEn || titleRecord.titleAr}.`,
            playbackUrl: ep.url,
            playbackType: "url",
            runtime: 45,
          },
        });
        addedCount++;
        console.log(`+ [NEW EPISODE] Added: ${titleRecord.titleAr} — الحلقة ${ep.episodeNumber}`);
      } else {
        // Ensure playbackUrl is up-to-date
        await prisma.episode.update({
          where: { id: existingEp.id },
          data: {
            playbackUrl: ep.url,
            playbackType: "url",
            updatedAt: new Date(),
          },
        });
        updatedCount++;
      }
    } catch (err) {
      console.error(`Error processing ${ep.url}:`, err.message);
    }
  }

  console.log(`=== Synchronization complete: ${addedCount} added, ${updatedCount} updated. ===`);
  return {
    success: true,
    totalDiscovered: episodesToProcess.length,
    addedCount,
    updatedCount,
  };
}

if (process.argv[1]?.endsWith("sync-daily-episodes.mjs")) {
  syncDailyEpisodes()
    .then((r) => {
      console.log("Result:", r);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Fatal:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

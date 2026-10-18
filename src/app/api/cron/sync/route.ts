import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60s execution

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "ar,en-US;q=0.9,en;q=0.8",
};

function parseEpisodeInfo(url: string, rawTitle: string) {
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

  cleanTitle = cleanTitle.replace(/\s+ال$/, "").trim();

  return {
    url,
    seriesSlug,
    seasonNumber,
    episodeNumber,
    seriesTitleAr: cleanTitle || seriesSlug,
  };
}

async function fetchPage(url: string) {
  try {
    const r = await fetch(url, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(10000) });
    if (!r.ok) return "";
    return await r.text();
  } catch {
    return "";
  }
}

export async function GET(req: NextRequest) {
  return handleSync(req);
}

export async function POST(req: NextRequest) {
  return handleSync(req);
}

async function handleSync(req: NextRequest) {
  // Authorization check if CRON_SECRET is defined in environment
  const authHeader = req.headers.get("authorization");
  const secretParam = req.nextUrl.searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && secretParam !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sources = [
      "https://3iskk.xyz/",
      "https://3iskk.xyz/genre/esheeqnew-46/",
    ];

    const seen = new Set<string>();
    const episodesToProcess: Array<ReturnType<typeof parseEpisodeInfo>> = [];

    for (const src of sources) {
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

    let addedCount = 0;
    let updatedCount = 0;

    for (const ep of episodesToProcess) {
      try {
        let titleRecord = await prisma.title.findFirst({
          where: {
            OR: [{ slug: ep.seriesSlug }, { id: `ser_${ep.seriesSlug}` }],
          },
        });

        if (!titleRecord) {
          titleRecord = await prisma.title.create({
            data: {
              id: `ser_${ep.seriesSlug}`,
              slug: ep.seriesSlug,
              type: "series",
              titleAr: ep.seriesTitleAr,
              titleEn: ep.seriesSlug.replace(/^serie-/, "").replace(/-/g, " "),
              synopsisAr: `مسلسل تركي جديد: ${ep.seriesTitleAr}`,
              synopsisEn: `Turkish drama series: ${ep.seriesSlug}.`,
              releaseYear: new Date().getFullYear(),
              genres: JSON.stringify(["مسلسلات تركية", "جديد الحلقات"]),
              rating: 8.8,
              trending: true,
              isNew: true,
              country: "Turkey",
              contentLang: "tr",
            },
          });
        } else {
          await prisma.title.update({
            where: { id: titleRecord.id },
            data: { trending: true, isNew: true, updatedAt: new Date() },
          });
        }

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
              synopsisEn: `Episode ${ep.episodeNumber}.`,
              playbackUrl: ep.url,
              playbackType: "url",
              runtime: 45,
            },
          });
          addedCount++;
        } else {
          await prisma.episode.update({
            where: { id: existingEp.id },
            data: { playbackUrl: ep.url, updatedAt: new Date() },
          });
          updatedCount++;
        }
      } catch (e: unknown) {
        console.error("Episode sync error:", e);
      }
    }

    return NextResponse.json({
      success: true,
      message: `تمت مزامنة الحلقات بنجاح. تم إضافة ${addedCount} حلقة جديدة، وتحديث ${updatedCount} حلقة.`,
      totalDiscovered: episodesToProcess.length,
      addedCount,
      updatedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

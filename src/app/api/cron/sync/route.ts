import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ASPREEN_VOD_CONFIG, fetchAspreenVodPage, cleanTitle, extractYear, slugToTitle, buildGenres } from "@/lib/aspreen-vod";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60s execution

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
    // 1. Fetch latest VOD items from Aspreen API (pages 1 and 2 = latest 48 items)
    let addedCount = 0;
    let updatedCount = 0;
    let episodesProcessed = 0;

    for (const pageNum of [1, 2]) {
      const resp = await fetchAspreenVodPage(pageNum, 24);
      if (!resp?.data || !Array.isArray(resp.data)) continue;

      for (const item of resp.data) {
        try {
          const isMovie = item.type === "movie";
          const releaseYear = extractYear(item.title, item.overview);
          const titleEn = slugToTitle(item.slug);
          const genres = buildGenres(item);
          const synopsis = (item.overview || "").replace(/<[^>]+>/g, "").trim();

          // Upsert Title
          const titleRecord = await prisma.title.upsert({
            where: { slug: item.slug },
            update: {
              titleAr: item.title,
              titleEn,
              synopsisAr: synopsis,
              posterUrl: item.poster || undefined,
              backdropUrl: item.poster || undefined,
              playbackUrl: isMovie ? (item.stream_url || item.player_url) : undefined,
              updatedAt: new Date(),
            },
            create: {
              id: item.id,
              slug: item.slug,
              type: isMovie ? "movie" : "series",
              titleAr: item.title,
              titleEn,
              originalTitle: cleanTitle(item.title),
              synopsisAr: synopsis,
              synopsisEn: titleEn,
              posterUrl: item.poster || null,
              backdropUrl: item.poster || null,
              releaseYear,
              releaseDate: `${releaseYear}-01-01`,
              genres: JSON.stringify(genres),
              runtime: isMovie ? 115 : 45,
              rating: 8.8,
              ratingSource: "TVORA Editorial",
              featured: false,
              trending: true,
              isNew: true,
              visible: true,
              country: "تركيا",
              contentLang: item.is_dubbed ? "ar" : "tr",
              playbackType: "hls",
              playbackUrl: isMovie ? (item.stream_url || item.player_url) : null,
            },
          });

          if (!isMovie && Array.isArray(item.seasons)) {
            for (const s of item.seasons) {
              const seasonNum = s.season_number || 1;
              const seasonRecord = await prisma.season.upsert({
                where: {
                  titleId_number: {
                    titleId: titleRecord.id,
                    number: seasonNum,
                  },
                },
                update: {},
                create: {
                  id: `${titleRecord.id}-season-${seasonNum}`,
                  titleId: titleRecord.id,
                  number: seasonNum,
                  titleAr: `الموسم ${seasonNum}`,
                  titleEn: `Season ${seasonNum}`,
                },
              });

              if (Array.isArray(s.episodes)) {
                for (const ep of s.episodes) {
                  const epNum = ep.episode_number || 1;
                  const epId = ep.id || `${seasonRecord.id}-ep-${epNum}`;

                  const existingEp = await prisma.episode.findUnique({
                    where: {
                      seasonId_number: {
                        seasonId: seasonRecord.id,
                        number: epNum,
                      },
                    },
                  });

                  if (!existingEp) {
                    await prisma.episode.create({
                      data: {
                        id: epId,
                        seasonId: seasonRecord.id,
                        titleId: titleRecord.id,
                        number: epNum,
                        titleAr: ep.title || `الحلقة ${epNum}`,
                        titleEn: `Episode ${epNum}`,
                        synopsisAr: synopsis,
                        synopsisEn: "",
                        runtime: 45,
                        playbackType: "hls",
                        playbackUrl: ep.stream_url || ep.player_url || null,
                        stillSeed: `${item.slug}-${seasonNum}-${epNum}`,
                      },
                    });
                    addedCount++;
                  } else {
                    await prisma.episode.update({
                      where: { id: existingEp.id },
                      data: {
                        playbackUrl: ep.stream_url || ep.player_url || existingEp.playbackUrl,
                        updatedAt: new Date(),
                      },
                    });
                    updatedCount++;
                  }
                  episodesProcessed++;
                }
              }
            }
          }
        } catch (itemErr) {
          console.error(`[Sync] Error syncing item ${item.slug}:`, itemErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      source: "Aspreen TV VOD API",
      message: `تمت مزامنة المحتوى بنجاح من مكتبة Aspreen TV. تمت معالجة ${episodesProcessed} حلقة (إضافة ${addedCount} وتحديث ${updatedCount}).`,
      addedCount,
      updatedCount,
      episodesProcessed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

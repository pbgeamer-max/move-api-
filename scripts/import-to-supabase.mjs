// TVORA Supabase / PostgreSQL Importer
// Imports channels, site settings, and all 1,222 series, 423 movies, and 65,158 episodes into Supabase
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";

const prisma = new PrismaClient();

const DEFAULT_CHANNELS = [
  {
    code: "TVORA-SPORTS-1",
    nameAr: "تڤورا سبورت 1",
    nameEn: "TVORA Sports 1",
    category: "sports",
    colorA: "#C8A24B",
    colorB: "#151310",
    quality: "4K",
    descriptionAr: "القناة الرياضية الأولى — أبرز المباريات والبطولات على مدار الساعة.",
    descriptionEn: "The flagship sports channel — top matches and tournaments around the clock.",
    nowPlayingAr: "ملخص الجولة الكبرى — تحليل واستوديو",
    nowPlayingEn: "Round of the week — highlights & studio analysis",
    streamType: "demo",
    streamUrl: "/media/demo-match.mp4",
    visible: true,
    sortOrder: 1,
  },
  {
    code: "TVORA-SPORTS-2",
    nameAr: "تڤورا سبورت 2",
    nameEn: "TVORA Sports 2",
    category: "sports",
    colorA: "#D97742",
    colorB: "#171009",
    quality: "HD",
    descriptionAr: "البطولات القارية والاستوديوهات التحليلية الليلية.",
    descriptionEn: "Continental tournaments and late-night analysis studios.",
    nowPlayingAr: "استوديو ما قبل المباراة",
    nowPlayingEn: "Pre-match studio",
    streamType: "demo",
    streamUrl: "/media/demo-match.mp4",
    visible: true,
    sortOrder: 2,
  },
  {
    code: "TVORA-SPORTS-IQ",
    nameAr: "تڤورا سبورت العراق",
    nameEn: "TVORA Sports Iraq",
    category: "sports",
    colorA: "#4E9B6F",
    colorB: "#0B120E",
    quality: "HD",
    descriptionAr: "الكرة العراقية أولاً — الدوري المحلي والمنتخب.",
    descriptionEn: "Iraqi football first — the local league and the national team.",
    nowPlayingAr: "أهداف الدوري العراقي — الموسم الحالي",
    nowPlayingEn: "Iraq Stars League goals — current season",
    streamType: "demo",
    streamUrl: "/media/demo-match.mp4",
    visible: true,
    sortOrder: 3,
  },
  {
    code: "TVORA-CINEMA",
    nameAr: "تڤورا سينما",
    nameEn: "TVORA Cinema",
    category: "movies",
    colorA: "#9A8FC2",
    colorB: "#0F0E14",
    quality: "4K",
    descriptionAr: "أفلام العالم الأولى — عروض أولى كل ليلة.",
    descriptionEn: "World cinema premieres — a new first-run film every night.",
    nowPlayingAr: "فيلم الليلة: ملحمة الصحراء",
    nowPlayingEn: "Tonight: Sands of the Epic",
    streamType: "demo",
    streamUrl: "/media/demo-film.mp4",
    visible: true,
    sortOrder: 4,
  },
  {
    code: "TVORA-ACTION",
    nameAr: "تڤورا أكشن",
    nameEn: "TVORA Action",
    category: "movies",
    colorA: "#C25B5B",
    colorB: "#150C0C",
    quality: "HD",
    descriptionAr: "أكشن لا يتوقف — مطاردات وانفجارات وقصص انتقام.",
    descriptionEn: "Non-stop action — chases, explosions and revenge stories.",
    nowPlayingAr: "ماراثون الأكشن — أربع أفلام متتالية",
    nowPlayingEn: "Action marathon — four films back to back",
    streamType: "demo",
    streamUrl: "/media/demo-film.mp4",
    visible: true,
    sortOrder: 5,
  },
  {
    code: "TVORA-CLASSICS",
    nameAr: "تڤورا كلاسيك",
    nameEn: "TVORA Classics",
    category: "movies",
    colorA: "#B08A50",
    colorB: "#131009",
    quality: "HD",
    descriptionAr: "الكنوز السينمائية من كل العصور، مُرممة بجودة عالية.",
    descriptionEn: "Cinematic treasures from every era, remastered in high quality.",
    nowPlayingAr: "كلاسيكيات الأربعينيات",
    nowPlayingEn: "Forties classics",
    streamType: "demo",
    streamUrl: "/media/demo-film.mp4",
    visible: true,
    sortOrder: 6,
  },
  {
    code: "TVORA-DRAMA",
    nameAr: "تڤورا دراما",
    nameEn: "TVORA Drama",
    category: "series",
    colorA: "#8FB8D8",
    colorB: "#0C1014",
    quality: "HD",
    descriptionAr: "مسلسلات درامية عالمية بترجمة احترافية وحلقات أولاً بأول.",
    descriptionEn: "Global drama series with professional subtitles and weekly episodes.",
    nowPlayingAr: "الموسم الجديد: أزقة الأندلس",
    nowPlayingEn: "New season: Alleys of Andalus",
    streamType: "demo",
    streamUrl: "/media/demo-film.mp4",
    visible: true,
    sortOrder: 7,
  },
  {
    code: "TVORA-TURKISH",
    nameAr: "تڤورا تركي",
    nameEn: "TVORA Turkish",
    category: "series",
    colorA: "#B04A4A",
    colorB: "#140B0B",
    quality: "HD",
    descriptionAr: "أشهر المسلسلات التركية المدبلجة والمترجمة.",
    descriptionEn: "The most beloved Turkish series, dubbed and subtitled.",
    nowPlayingAr: "حكاية البوسفور — الحلقة 14",
    nowPlayingEn: "Bosphorus Tale — Episode 14",
    streamType: "demo",
    streamUrl: "/media/demo-film.mp4",
    visible: true,
    sortOrder: 8,
  },
  {
    code: "TVORA-KOREAN",
    nameAr: "تڤورا كوري",
    nameEn: "TVORA Korean",
    category: "series",
    colorA: "#7FB09E",
    colorB: "#0B1210",
    quality: "HD",
    descriptionAr: "موجة الكوريين — رومانسي وإثارة ودراما ملكية.",
    descriptionEn: "The Korean wave — romance, thrillers and royal dramas.",
    nowPlayingAr: "ماراثون نهاية الأسبوع",
    nowPlayingEn: "Weekend binge marathon",
    streamType: "demo",
    streamUrl: "/media/demo-film.mp4",
    visible: true,
    sortOrder: 9,
  },
  {
    code: "TVORA-KIDS",
    nameAr: "تڤورا كيدز",
    nameEn: "TVORA Kids",
    category: "kids",
    colorA: "#D8A24B",
    colorB: "#151007",
    quality: "HD",
    descriptionAr: "رسوم متحركة وبرامج آمنة ومرحة لكل الأعمار.",
    descriptionEn: "Safe, joyful animation and shows for every age.",
    nowPlayingAr: "سلسلة مغامرات الفضاء",
    nowPlayingEn: "Space adventures series",
    streamType: "demo",
    streamUrl: "/media/demo-film.mp4",
    visible: true,
    sortOrder: 10,
  },
  {
    code: "TVORA-DOCU",
    nameAr: "تڤورا وثائقي",
    nameEn: "TVORA Docu",
    category: "documentary",
    colorA: "#9FB7CB",
    colorB: "#0C0F12",
    quality: "4K",
    descriptionAr: "وثائقيات تاريخ وعلوم وحضارات بجودة فائقة.",
    descriptionEn: "History, science and civilizations documentaries in ultra HD.",
    nowPlayingAr: "أسرار المحيط العميق",
    nowPlayingEn: "Secrets of the deep ocean",
    streamType: "demo",
    streamUrl: "/media/demo-film.mp4",
    visible: true,
    sortOrder: 11,
  },
  {
    code: "TVORA-NEWS",
    nameAr: "تڤورا نيوز",
    nameEn: "TVORA News",
    category: "news",
    colorA: "#B8B8BE",
    colorB: "#101012",
    quality: "HD",
    descriptionAr: "أخبار العالم والعربية كل ساعة، بلا توقف.",
    descriptionEn: "World and Arab news every hour, around the clock.",
    nowPlayingAr: "نشرة الأخبار الرئيسية",
    nowPlayingEn: "Main evening bulletin",
    streamType: "demo",
    streamUrl: "/media/demo-film.mp4",
    visible: true,
    sortOrder: 12,
  },
  {
    code: "TVORA-MUSIC",
    nameAr: "تڤورا ميوزك",
    nameEn: "TVORA Music",
    category: "music",
    colorA: "#C98FB8",
    colorB: "#130E12",
    quality: "HD",
    descriptionAr: "أغاني عربية وعالمية وكليبات حصرية.",
    descriptionEn: "Arabic and global hits with exclusive videos.",
    nowPlayingAr: "قائمة الأكثر طلباً",
    nowPlayingEn: "Most-requested playlist",
    streamType: "demo",
    streamUrl: "/media/demo-film.mp4",
    visible: true,
    sortOrder: 13,
  },
  {
    code: "TVORA-ONE",
    nameAr: "تڤورا ون",
    nameEn: "TVORA One",
    category: "general",
    colorA: "#D8C9A3",
    colorB: "#131009",
    quality: "HD",
    descriptionAr: "القناة العامة — ترفيه وحوارات وبرامج فعليات.",
    descriptionEn: "The general channel — entertainment, talk shows and events.",
    nowPlayingAr: "برنامج الضيف — لقاء حصري",
    nowPlayingEn: "The Guest — exclusive interview",
    streamType: "demo",
    streamUrl: "/media/demo-film.mp4",
    visible: true,
    sortOrder: 14,
  },
];

async function main() {
  console.log("=== TVORA Supabase Data Importer ===");

  // 1. Seed Site Settings
  console.log("Seeding site settings...");
  const settings = [
    { key: "branding", value: JSON.stringify({ name: "TVORA", tagline: "Cinema. Series. Live TV Channels." }) },
    { key: "demoMode", value: JSON.stringify({ enabled: false, reason: "", tmdbConfigured: true }) },
    { key: "homepageSections", value: JSON.stringify(["hero", "trending", "featured", "new", "arabic", "channels", "topRated"]) },
    { key: "maintenanceMode", value: JSON.stringify({ enabled: false }) },
  ];
  for (const s of settings) {
    await prisma.siteSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }

  // 2. Seed Channels
  console.log("Seeding TV channels...");
  for (const ch of DEFAULT_CHANNELS) {
    await prisma.channel.upsert({
      where: { code: ch.code },
      update: ch,
      create: ch,
    });
  }

  // 3. Load 3isk Catalog
  console.log("Loading 3isk catalog...");
  const rawPath = path.join(process.cwd(), "data", "3isk_catalog.json");
  const gzPath = path.join(process.cwd(), "data", "3isk_catalog.json.gz");
  let jsonStr = "";
  if (fs.existsSync(rawPath)) {
    jsonStr = fs.readFileSync(rawPath, "utf-8");
  } else if (fs.existsSync(gzPath)) {
    jsonStr = zlib.gunzipSync(fs.readFileSync(gzPath)).toString("utf-8");
  }

  if (!jsonStr) {
    console.error("No catalog file found in data/");
    return;
  }

  const catalog = JSON.parse(jsonStr);
  const movies = Object.values(catalog.movies || {});
  const seriesList = Object.values(catalog.series || {});

  console.log(`Found ${movies.length} movies and ${seriesList.length} series to import.`);

  // 4. Import Movies
  console.log("Importing movies...");
  for (let i = 0; i < movies.length; i++) {
    const m = movies[i];
    await prisma.title.upsert({
      where: { slug: m.slug },
      update: {
        titleAr: m.titleAr,
        titleEn: m.titleEn,
        originalTitle: m.originalTitle || null,
        synopsisAr: m.synopsisAr || "",
        synopsisEn: m.synopsisEn || "",
        posterUrl: m.posterUrl || null,
        backdropUrl: m.backdropUrl || null,
        releaseYear: m.releaseYear || 2024,
        genres: typeof m.genres === "string" ? m.genres : JSON.stringify(m.genres || ["أفلام تركية"]),
        rating: m.rating || 8.0,
        featured: Boolean(m.featured),
        trending: Boolean(m.trending),
        isNew: Boolean(m.isNew),
        country: m.country || "Turkey",
        contentLang: m.contentLang || "tr",
        playbackType: m.playbackType || "demo",
        playbackUrl: m.playbackUrl || null,
      },
      create: {
        id: m.id,
        slug: m.slug,
        type: "movie",
        titleAr: m.titleAr,
        titleEn: m.titleEn,
        originalTitle: m.originalTitle || null,
        synopsisAr: m.synopsisAr || "",
        synopsisEn: m.synopsisEn || "",
        posterUrl: m.posterUrl || null,
        backdropUrl: m.backdropUrl || null,
        releaseYear: m.releaseYear || 2024,
        genres: typeof m.genres === "string" ? m.genres : JSON.stringify(m.genres || ["أفلام تركية"]),
        rating: m.rating || 8.0,
        featured: Boolean(m.featured),
        trending: Boolean(m.trending),
        isNew: Boolean(m.isNew),
        country: m.country || "Turkey",
        contentLang: m.contentLang || "tr",
        playbackType: m.playbackType || "demo",
        playbackUrl: m.playbackUrl || null,
      },
    });
    if ((i + 1) % 50 === 0 || i === movies.length - 1) {
      console.log(`Movies: ${i + 1}/${movies.length}`);
    }
  }

  // 5. Import Series, Seasons, and Episodes
  console.log("Importing series and episodes...");
  for (let i = 0; i < seriesList.length; i++) {
    const s = seriesList[i];
    const titleRecord = await prisma.title.upsert({
      where: { slug: s.slug },
      update: {
        titleAr: s.titleAr,
        titleEn: s.titleEn,
        originalTitle: s.originalTitle || null,
        synopsisAr: s.synopsisAr || "",
        synopsisEn: s.synopsisEn || "",
        posterUrl: s.posterUrl || null,
        backdropUrl: s.backdropUrl || null,
        releaseYear: s.releaseYear || 2024,
        genres: typeof s.genres === "string" ? s.genres : JSON.stringify(s.genres || ["مسلسلات تركية"]),
        rating: s.rating || 8.5,
        featured: Boolean(s.featured),
        trending: Boolean(s.trending),
        isNew: Boolean(s.isNew),
        country: s.country || "Turkey",
        contentLang: s.contentLang || "tr",
      },
      create: {
        id: s.id,
        slug: s.slug,
        type: "series",
        titleAr: s.titleAr,
        titleEn: s.titleEn,
        originalTitle: s.originalTitle || null,
        synopsisAr: s.synopsisAr || "",
        synopsisEn: s.synopsisEn || "",
        posterUrl: s.posterUrl || null,
        backdropUrl: s.backdropUrl || null,
        releaseYear: s.releaseYear || 2024,
        genres: typeof s.genres === "string" ? s.genres : JSON.stringify(s.genres || ["مسلسلات تركية"]),
        rating: s.rating || 8.5,
        featured: Boolean(s.featured),
        trending: Boolean(s.trending),
        isNew: Boolean(s.isNew),
        country: s.country || "Turkey",
        contentLang: s.contentLang || "tr",
      },
    });

    // Seasons & Episodes
    if (Array.isArray(s.seasons)) {
      for (const season of s.seasons) {
        const seasonRecord = await prisma.season.upsert({
          where: {
            titleId_number: {
              titleId: titleRecord.id,
              number: season.number || 1,
            },
          },
          update: {
            titleAr: season.titleAr || `الموسم ${season.number || 1}`,
            titleEn: season.titleEn || `Season ${season.number || 1}`,
          },
          create: {
            id: season.id,
            titleId: titleRecord.id,
            number: season.number || 1,
            titleAr: season.titleAr || `الموسم ${season.number || 1}`,
            titleEn: season.titleEn || `Season ${season.number || 1}`,
          },
        });

        if (Array.isArray(season.episodes) && season.episodes.length > 0) {
          for (const ep of season.episodes) {
            await prisma.episode.upsert({
              where: {
                seasonId_number: {
                  seasonId: seasonRecord.id,
                  number: ep.number,
                },
              },
              update: {
                titleAr: ep.titleAr,
                titleEn: ep.titleEn,
                synopsisAr: ep.synopsisAr || "",
                synopsisEn: ep.synopsisEn || "",
                playbackUrl: ep.playbackUrl || null,
                playbackType: ep.playbackType || "demo",
                runtime: ep.runtime || 45,
              },
              create: {
                id: ep.id,
                seasonId: seasonRecord.id,
                titleId: titleRecord.id,
                number: ep.number,
                titleAr: ep.titleAr,
                titleEn: ep.titleEn,
                synopsisAr: ep.synopsisAr || "",
                synopsisEn: ep.synopsisEn || "",
                playbackUrl: ep.playbackUrl || null,
                playbackType: ep.playbackType || "demo",
                runtime: ep.runtime || 45,
              },
            });
          }
        }
      }
    }

    if ((i + 1) % 25 === 0 || i === seriesList.length - 1) {
      console.log(`Series: ${i + 1}/${seriesList.length}`);
    }
  }

  console.log("=== All data successfully imported into Supabase / PostgreSQL! ===");
}

main()
  .catch((e) => {
    console.error("Import error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

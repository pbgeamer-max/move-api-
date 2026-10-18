// TVORA Shared Catalog Loader & Defaults
// Loads the 1,222 Turkish series, 423 movies, and 65,158 episodes from local gzip/json
import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";

type Dict = Record<string, any>;

export const DEFAULT_CHANNELS: Dict[] = [
  {
    id: "ch-sports-1",
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
    id: "ch-sports-2",
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
    id: "ch-sports-iq",
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
    id: "ch-cinema",
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
    id: "ch-action",
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
    id: "ch-classics",
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
    id: "ch-drama",
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
    id: "ch-turkish",
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
    id: "ch-korean",
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
    id: "ch-kids",
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
    id: "ch-docu",
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
    id: "ch-news",
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
    id: "ch-music",
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
    id: "ch-one",
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

export const DEFAULT_SETTINGS: Record<string, string> = {
  branding: JSON.stringify({ name: "TVORA", tagline: "Cinema. Series. Live TV Channels." }),
  demoMode: JSON.stringify({ enabled: false, reason: "", tmdbConfigured: true }),
  homepageSections: JSON.stringify(["hero", "trending", "featured", "new", "arabic", "channels", "topRated"]),
  maintenanceMode: JSON.stringify({ enabled: false }),
};

let _catalogCache: Dict[] | null = null;

export function getLocalCatalog(): Dict[] {
  if (_catalogCache) return _catalogCache;
  try {
    const rawPath = path.join(process.cwd(), "data", "3isk_catalog.json");
    const gzPath = path.join(process.cwd(), "data", "3isk_catalog.json.gz");
    let jsonStr = "";
    if (fs.existsSync(rawPath)) {
      jsonStr = fs.readFileSync(rawPath, "utf-8");
    } else if (fs.existsSync(gzPath)) {
      const buffer = fs.readFileSync(gzPath);
      jsonStr = zlib.gunzipSync(buffer).toString("utf-8");
    }

    if (jsonStr) {
      const raw = JSON.parse(jsonStr);
      const list: Dict[] = [];
      for (const m of Object.values(raw.movies || {})) {
        const movie = m as Dict;
        list.push({
          ...movie,
          genres: typeof movie.genres === "string" ? movie.genres : JSON.stringify(movie.genres || ["أفلام تركية"]),
        });
      }
      for (const s of Object.values(raw.series || {})) {
        const ser = s as Dict;
        list.push({
          ...ser,
          genres: typeof ser.genres === "string" ? ser.genres : JSON.stringify(ser.genres || ["مسلسلات تركية"]),
        });
      }
      _catalogCache = list;
      return list;
    }
  } catch (err) {
    console.error("[TVORA Catalog] Error loading local catalog fallback:", err);
  }
  return [];
}

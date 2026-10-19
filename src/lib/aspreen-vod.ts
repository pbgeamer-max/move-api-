// TVORA - Aspreen VOD Integration Service
// Connects TVORA directly to Aspreen TV VOD API for movies, series, posters, overviews, seasons, and episodes

export const ASPREEN_VOD_CONFIG = {
  apiKey: "aspr_sec_efg45ap8h1e0112d",
  baseUrl: "https://aspreen-tv-production.up.railway.app/api/app/vod",
  allEndpoint: "https://aspreen-tv-production.up.railway.app/api/app/vod/all",
  streamEndpoint: "https://aspreen-tv-production.up.railway.app/api/app/vod/stream",
  playerEndpoint: "https://aspreen-tv-production.up.railway.app/api/app/vod/player",
};

export interface AspreenRawEpisode {
  id: string;
  episode_number: number;
  title: string;
  stream_url: string;
  player_url: string;
  embed_code: string;
}

export interface AspreenRawSeason {
  season_number: number;
  episodes_count: number;
  episodes: AspreenRawEpisode[];
}

export interface AspreenRawItem {
  id: string;
  slug: string;
  title: string;
  type: "movie" | "series";
  is_dubbed: boolean;
  is_subbed: boolean;
  poster: string;
  overview: string;
  seasons_count?: number;
  total_episodes?: number;
  stream_url?: string;
  player_url?: string;
  embed_code?: string;
  seasons?: AspreenRawSeason[];
}

export interface AspreenApiResponse {
  success: boolean;
  server: string;
  total_items: number;
  total_series: number;
  total_movies: number;
  page: number;
  limit: number;
  total_pages: number;
  data: AspreenRawItem[];
}

/**
 * Clean Arabic title by removing redundant prefixes
 */
export function cleanTitle(rawTitle = ""): string {
  return rawTitle
    .replace(/^(?:فيلم|مسلسل)\s+/i, "")
    .replace(/\s+(?:مترجم|مدبلج).*$/i, "")
    .replace(/\s+\d{4}\b/g, "")
    .trim();
}

/**
 * Extract release year from title or overview
 */
export function extractYear(title = "", overview = ""): number {
  const match = `${title} ${overview}`.match(/\b(19\d\d|20\d\d)\b/);
  return match ? parseInt(match[1], 10) : 2023;
}

/**
 * Convert slug to readable English/transliterated title
 */
export function slugToTitle(slug = ""): string {
  return slug
    .replace(/^(?:serie-|movie-)/, "")
    .replace(/-1oct\d+$/, "")
    .replace(/-season-\d+.*$/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Build rich genre tags
 */
export function buildGenres(item: AspreenRawItem): string[] {
  const isMovie = item.type === "movie";
  const genres = isMovie
    ? ["Turkish Movies", "أفلام تركية", "Drama", "دراما"]
    : ["Turkish Series", "مسلسلات تركية", "Drama", "دراما"];

  if (item.is_dubbed) {
    genres.push("مدبلج", "Dubbed", "أعمال مدبلجة");
  }
  if (item.is_subbed) {
    genres.push("مترجم", "Subtitled", "أعمال مترجمة");
  }

  const text = `${item.title || ""} ${item.overview || ""} ${item.slug || ""}`.toLowerCase();
  const GENRE_RULES: Array<{ genre: string; ar: string; keywords: string[] }> = [
    { genre: "Action", ar: "أكشن", keywords: ["اكشن", "أكشن", "قتال", "مواجهة", "عصابات", "صراع", "معارك", "انتقام", "سلاح", "مطاردة", "action"] },
    { genre: "Crime", ar: "جريمة", keywords: ["جريمة", "عصابة", "عصابات", "مافيا", "مخدرات", "شرطة", "تحقيق", "سجن", "قتل", "crime", "gang"] },
    { genre: "Comedy", ar: "كوميديا", keywords: ["كوميد", "مضحك", "فكاه", "مرح", "سخرية", "طريف", "ضحك", "comedy"] },
    { genre: "Romance", ar: "رومانسي", keywords: ["رومانس", "حب", "عاطف", "عشق", "غرام", "حبيب", "زواج", "romance", "love"] },
    { genre: "Horror", ar: "رعب", keywords: ["رعب", "جن", "سحر", "شيطان", "لعنة", "مخيف", "ارواح", "أرواح", "siccin", "horror"] },
    { genre: "Mystery", ar: "غموض", keywords: ["غموض", "سر", "اسرار", "أسرار", "لغز", "مجهول", "اختفاء", "مريب", "تحري", "mystery", "thriller"] },
    { genre: "History", ar: "تاريخي", keywords: ["تاريخ", "عثمان", "ارطغرل", "أرطغرل", "سلطان", "دولة", "قرن", "قديم", "تاريخي", "history", "historical"] },
    { genre: "Family", ar: "عائلي", keywords: ["عائل", "اسر", "أسري", "اطفال", "أطفال", "ابناء", "أبناء", "ام", "أم", "اب", "أب", "اخوة", "أخوة", "family"] },
    { genre: "Adventure", ar: "مغامرة", keywords: ["مغامر", "رحلة", "استكشاف", "خطر", "سفر", "adventure"] },
    { genre: "Animation", ar: "رسوم متحركة", keywords: ["رسوم", "كرتون", "انيميشن", "انمي", "تحريك", "animation"] },
    { genre: "Fantasy", ar: "فانتازيا", keywords: ["فانتازيا", "خيال", "اسطورة", "أسطورة", "قوى", "سحر", "fantasy"] },
    { genre: "War", ar: "حرب", keywords: ["حرب", "معركة", "جيش", "جنود", "قتال", "دفاع", "وطن", "شهيد", "war"] },
    { genre: "Drama", ar: "دراما", keywords: ["دراما", "صدمة", "حزن", "معاناة", "مأساة", "حياة", "قصة", "drama"] },
  ];

  for (const rule of GENRE_RULES) {
    if (rule.keywords.some((kw) => text.includes(kw))) {
      genres.push(rule.genre);
      genres.push(rule.ar);
    }
  }

  return Array.from(new Set(genres));
}

/**
 * Fetch a paginated list of items from Aspreen VOD
 */
export async function fetchAspreenVodPage(
  page = 1,
  limit = 24,
  search?: string
): Promise<AspreenApiResponse | null> {
  try {
    const sp = new URLSearchParams();
    sp.set("page", String(page));
    sp.set("limit", String(limit));
    sp.set("api_key", ASPREEN_VOD_CONFIG.apiKey);
    if (search) sp.set("search", search);

    const res = await fetch(`${ASPREEN_VOD_CONFIG.allEndpoint}?${sp.toString()}`, {
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 300 }, // 5-minute cache
    });

    if (!res.ok) return null;
    return (await res.json()) as AspreenApiResponse;
  } catch (err) {
    console.warn("[Aspreen VOD] fetch error:", err);
    return null;
  }
}

/**
 * Search Aspreen VOD for titles
 */
export async function searchAspreenVod(query: string): Promise<AspreenRawItem[]> {
  const resp = await fetchAspreenVodPage(1, 24, query);
  return resp?.data || [];
}

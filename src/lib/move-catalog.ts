import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";

export interface EpisodeItem {
  id: string;
  seasonNumber: number;
  number: number;
  titleAr: string;
  titleEn?: string;
  synopsisAr?: string;
  thumbnailUrl?: string;
  runtime?: number;
  streamUrl?: string;
  streamApi?: string;
  playbackUrl?: string; // Internal/compat fallback
}

export interface SeasonItem {
  number: number;
  titleAr?: string;
  titleEn?: string;
  episodesCount: number;
  episodes: EpisodeItem[];
}

export interface SeriesItem {
  id: string;
  slug: string;
  titleAr: string;
  titleEn?: string;
  synopsisAr?: string;
  posterUrl?: string;
  backdropUrl?: string;
  releaseYear?: number;
  rating?: number;
  genres: string[];
  seasonsCount: number;
  totalEpisodes: number;
  seasons?: SeasonItem[];
}

export interface MovieItem {
  id: string;
  slug: string;
  titleAr: string;
  titleEn?: string;
  synopsisAr?: string;
  posterUrl?: string;
  backdropUrl?: string;
  releaseYear?: number;
  rating?: number;
  genres: string[];
  runtime?: number;
  streamUrl?: string;
  streamApi?: string;
  playbackUrl?: string; // Internal/compat fallback
}

interface CatalogData {
  series: SeriesItem[];
  seriesBySlug: Map<string, SeriesItem>;
  movies: MovieItem[];
  moviesBySlug: Map<string, MovieItem>;
  watchUrlsById: Map<string, string>;
  totalEpisodes: number;
}

let _cache: CatalogData | null = null;

/**
 * Remove all "قصة عشق", "3isk", and SEO spam from story text
 */
export function cleanSynopsis(text = ""): string {
  if (!text) return "";
  let t = text
    .replace(/<[^>]+>/g, " ")
    .replace(/موقع\s*قصة\s*عشق(?:\s*الاصلي|\s*الأصلي)?/gi, "")
    .replace(/قصة\s*عشق(?:\s*الاصلي|\s*الأصلي)?/gi, "")
    .replace(/3isk(?:\.xyz|\.icu|\.net|\.vip|\.video)?/gi, "")
    .replace(/مشاهدة\s*وتحميل\s*(?:حصري[ااً])?\s*(?:علي|على)?\s*/gi, "")
    .replace(/مشاهدة\s*حصري[ااً]\s*(?:علي|على)?\s*/gi, "")
    .replace(/بجودة\s*عالية\s*(?:HD|720p|1080p|4k)?/gi, "")
    .replace(/كامل\s*مترجم\s*/gi, " ")
    .replace(/كامل\s*مدبلج\s*/gi, " ")
    .replace(/اون\s*لاين\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  // If initial sentence was SEO boilerplate
  if (t.includes(".")) {
    const parts = t.split(".");
    if (
      parts[0] &&
      (parts[0].includes("مسلسل") || parts[0].includes("فيلم") || parts[0].includes("مترجم") || parts[0].includes("مدبلج")) &&
      parts.slice(1).join(".").trim().length > 20
    ) {
      t = parts.slice(1).join(".").trim();
    }
  }

  // Anchor to narrative onset
  const storyMatch = t.match(/(يروي|تدور\s*أحداث|تدور\s*احداث|في\s*إطار|في\s*اطار|حول\s+|قصة\s+|تبدأ\s+|يحكي|تنقلب|تُطلق|تطلق|حين\s+|عندما\s+)/);
  if (storyMatch && storyMatch.index !== undefined && storyMatch.index < 70) {
    t = t.slice(storyMatch.index);
  }

  return t.replace(/\s+/g, " ").trim();
}

/**
 * Unwrap proxy wrappers to direct clean CDN/host image URLs
 */
export function cleanImageUrl(url = ""): string {
  if (!url) return "";
  if (url.includes("image-proxy?url=")) {
    try {
      const param = url.split("image-proxy?url=")[1];
      if (param) {
        return decodeURIComponent(param);
      }
    } catch {}
  }
  return url;
}

let _decodedCache: Record<string, string> | null = null;
let _decodedCacheTime = 0;

export function getDecodedStore(): Record<string, string> {
  const now = Date.now();
  if (_decodedCache && now - _decodedCacheTime < 5000) {
    return _decodedCache;
  }
  try {
    const p = path.join(process.cwd(), "data", "decoded_streams.json");
    if (fs.existsSync(p)) {
      _decodedCache = JSON.parse(fs.readFileSync(p, "utf-8"));
      _decodedCacheTime = now;
      return _decodedCache || {};
    }
  } catch {}
  return {};
}

export function isItemDecoded(idOrSlug: string): boolean {
  if (!idOrSlug) return false;
  const store = getDecodedStore();
  if (store[idOrSlug]) return true;
  for (const k of Object.keys(store)) {
    if (k.includes(idOrSlug) || idOrSlug.includes(k)) return true;
  }
  return false;
}

    } catch {}
  }
  return url;
}

export function loadCatalog(): CatalogData {
  if (_cache) return _cache;

  const catalogGzPath = path.join(process.cwd(), "data", "3isk_catalog.json.gz");
  const vodSeriesPath = path.join(process.cwd(), "data", "vod_series.json");
  const vodMoviesPath = path.join(process.cwd(), "data", "vod_movies.json");

  let rawMovies: Record<string, any> = {};
  let rawSeries: Record<string, any> = {};

  if (fs.existsSync(catalogGzPath)) {
    try {
      const buffer = fs.readFileSync(catalogGzPath);
      const decompressed = zlib.gunzipSync(buffer).toString("utf-8");
      const parsed = JSON.parse(decompressed);
      rawMovies = parsed.movies || {};
      rawSeries = parsed.series || {};
    } catch (e) {
      console.error("[MoveAPI Catalog] Error reading 3isk_catalog.json.gz:", e);
    }
  }

  // Load enriched series overviews
  const cleanSeriesOverviews: Map<string, string> = new Map();
  if (fs.existsSync(vodSeriesPath)) {
    try {
      const list = JSON.parse(fs.readFileSync(vodSeriesPath, "utf-8"));
      if (Array.isArray(list)) {
        for (const item of list) {
          if (item.slug && item.overview) {
            cleanSeriesOverviews.set(item.slug, cleanSynopsis(item.overview));
          }
        }
      }
    } catch {}
  }

  // Load enriched movies overviews & posters
  const cleanMovieData: Map<string, { overview?: string; posterUrl?: string }> = new Map();
  if (fs.existsSync(vodMoviesPath)) {
    try {
      const list = JSON.parse(fs.readFileSync(vodMoviesPath, "utf-8"));
      if (Array.isArray(list)) {
        for (const item of list) {
          if (item.slug) {
            cleanMovieData.set(item.slug, {
              overview: cleanSynopsis(item.overview || ""),
              posterUrl: cleanImageUrl(item.posterUrl || ""),
            });
          }
        }
      }
    } catch {}
  }

  const seriesList: SeriesItem[] = [];
  const seriesBySlug = new Map<string, SeriesItem>();
  const watchUrlsById = new Map<string, string>();
  let totalEpisodes = 0;

  for (const s of Object.values(rawSeries)) {
    const slug = s.slug || s.id;
    if (!slug) continue;

    let seasons: SeasonItem[] = [];
    let countEps = 0;

    if (Array.isArray(s.seasons)) {
      seasons = s.seasons.map((sn: any) => {
        const episodes: EpisodeItem[] = (sn.episodes || []).map((ep: any) => {
          const epId = ep.id || `${slug}-s${sn.number}-e${ep.number}`;
          // Record internal watch url for direct stream resolution
          const epWatchUrl = `https://3iskk.xyz/watch/episodes/${epId}/`;
          watchUrlsById.set(epId, epWatchUrl);

          return {
            id: epId,
            seasonNumber: sn.number || 1,
            number: ep.number || 1,
            titleAr: ep.titleAr || `الحلقة ${ep.number || 1}`,
            titleEn: ep.titleEn || `Episode ${ep.number || 1}`,
            synopsisAr: cleanSynopsis(ep.synopsisAr) || `الحلقة ${ep.number || 1} من مسلسل ${s.titleAr || slug}.`,
            thumbnailUrl: cleanImageUrl(ep.thumbnailUrl || s.backdropUrl || s.posterUrl || ""),
            runtime: ep.runtime || 45,
            playbackUrl: epWatchUrl,
          };
        });

        countEps += episodes.length;
        return {
          number: sn.number || 1,
          titleAr: sn.titleAr || `الموسم ${sn.number || 1}`,
          titleEn: sn.titleEn || `Season ${sn.number || 1}`,
          episodesCount: episodes.length,
          episodes,
        };
      });
    }

    totalEpisodes += countEps;

    // Genres parsing
    let genresArr: string[] = [];
    if (typeof s.genres === "string") {
      try {
        genresArr = JSON.parse(s.genres);
      } catch {
        genresArr = [s.genres];
      }
    } else if (Array.isArray(s.genres)) {
      genresArr = s.genres;
    }

    const cleanStory = cleanSeriesOverviews.get(slug) || cleanSynopsis(s.synopsisAr) || "";
    const cleanPoster = cleanImageUrl(s.posterUrl || "");
    const cleanBackdrop = cleanImageUrl(s.backdropUrl || cleanPoster);

    const item: SeriesItem = {
      id: s.id || slug,
      slug,
      titleAr: s.titleAr || slug,
      titleEn: s.titleEn || "",
      synopsisAr: cleanStory,
      posterUrl: cleanPoster,
      backdropUrl: cleanBackdrop,
      releaseYear: s.releaseYear || 2024,
      rating: s.rating || 8.8,
      genres: genresArr,
      seasonsCount: seasons.length || s.seasonsCount || 1,
      totalEpisodes: countEps,
      seasons,
    };

    seriesList.push(item);
    seriesBySlug.set(slug, item);
    seriesBySlug.set(item.id, item);
    watchUrlsById.set(slug, `https://3iskk.xyz/watch/tvshows/${slug}/`);
    watchUrlsById.set(item.id, `https://3iskk.xyz/watch/tvshows/${slug}/`);
  }

  // Movies
  const moviesList: MovieItem[] = [];
  const moviesBySlug = new Map<string, MovieItem>();

  for (const m of Object.values(rawMovies)) {
    const slug = m.slug || m.id;
    if (!slug) continue;

    let genresArr: string[] = [];
    if (typeof m.genres === "string") {
      try {
        genresArr = JSON.parse(m.genres);
      } catch {
        genresArr = [m.genres];
      }
    } else if (Array.isArray(m.genres)) {
      genresArr = m.genres;
    }

    const enrichedMovie = cleanMovieData.get(slug);
    const cleanStory = enrichedMovie?.overview || cleanSynopsis(m.synopsisAr) || "";
    const cleanPoster = enrichedMovie?.posterUrl || cleanImageUrl(m.posterUrl || "");
    const cleanBackdrop = cleanImageUrl(m.backdropUrl || cleanPoster);
    const movieWatchUrl = `https://3iskk.xyz/watch/movies/${slug}/`;

    const item: MovieItem = {
      id: m.id || slug,
      slug,
      titleAr: m.titleAr || slug,
      titleEn: m.titleEn || "",
      synopsisAr: cleanStory,
      posterUrl: cleanPoster,
      backdropUrl: cleanBackdrop,
      releaseYear: m.releaseYear || 2024,
      rating: m.rating || 8.5,
      genres: genresArr,
      runtime: m.runtime || 110,
      playbackUrl: movieWatchUrl,
    };

    moviesList.push(item);
    moviesBySlug.set(slug, item);
    moviesBySlug.set(item.id, item);
    watchUrlsById.set(slug, movieWatchUrl);
    watchUrlsById.set(item.id, movieWatchUrl);
  }

  _cache = {
    series: seriesList,
    seriesBySlug,
    movies: moviesList,
    moviesBySlug,
    watchUrlsById,
    totalEpisodes,
  };

  return _cache;
}

/**
 * Returns the underlying 3isk watch URL for stream resolution
 */
export function getWatchUrlForId(idOrSlug: string): string | null {
  if (!idOrSlug) return null;
  const { watchUrlsById, moviesBySlug } = loadCatalog();

  const direct = watchUrlsById.get(idOrSlug);
  if (direct) return direct;

  const movie = moviesBySlug.get(idOrSlug);
  if (movie) return `https://3iskk.xyz/watch/movies/${movie.slug}/`;

  // Assume episode slug if it contains season/episode or starts with serie/musalsal
  if (idOrSlug.includes("-episode-") || idOrSlug.includes("-ep-") || idOrSlug.startsWith("serie-")) {
    return `https://3iskk.xyz/watch/episodes/${idOrSlug}/`;
  }

  if (idOrSlug.startsWith("movie-") || idOrSlug.startsWith("film-")) {
    return `https://3iskk.xyz/watch/movies/${idOrSlug}/`;
  }

  return `https://3iskk.xyz/watch/episodes/${idOrSlug}/`;
}

export function querySeries({
  page = 1,
  limit = 24,
  q = "",
  genre = "",
  year = "",
  dubbed = "",
  onlyDecoded = true,
}: {
  page?: number;
  limit?: number;
  q?: string;
  genre?: string;
  year?: string;
  dubbed?: string;
  onlyDecoded?: boolean;
}) {
  const { series } = loadCatalog();
  let filtered = series;

  if (onlyDecoded) {
    const store = getDecodedStore();
    filtered = filtered.filter((s) => {
      const episodes = (s.seasons || []).flatMap((sn) => sn.episodes);
      return episodes.some((ep) => Boolean(store[ep.id]));
    });
  }

  if (q) {
    const term = q.trim().toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.titleAr.toLowerCase().includes(term) ||
        (s.titleEn && s.titleEn.toLowerCase().includes(term)) ||
        s.slug.toLowerCase().includes(term)
    );
  }

  if (genre) {
    const g = genre.trim().toLowerCase();
    filtered = filtered.filter((s) => s.genres.some((genreName) => genreName.toLowerCase().includes(g)));
  }

  if (year) {
    const y = parseInt(year, 10);
    if (!isNaN(y)) {
      filtered = filtered.filter((s) => s.releaseYear === y);
    }
  }

  if (dubbed === "1") {
    filtered = filtered.filter((s) => s.titleAr.includes("مدبلج"));
  } else if (dubbed === "0") {
    filtered = filtered.filter((s) => !s.titleAr.includes("مدبلج"));
  }

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.max(1, Math.min(page, pages));
  const start = (safePage - 1) * limit;
  const items = filtered.slice(start, start + limit);

  // Clean light list without heavy season hierarchies for speed
  const lightItems = items.map((s) => ({
    id: s.id,
    slug: s.slug,
    titleAr: s.titleAr,
    titleEn: s.titleEn,
    synopsisAr: s.synopsisAr,
    posterUrl: s.posterUrl,
    backdropUrl: s.backdropUrl,
    releaseYear: s.releaseYear,
    rating: s.rating,
    genres: s.genres,
    seasonsCount: s.seasonsCount,
    totalEpisodes: s.totalEpisodes,
  }));

  return {
    total,
    page: safePage,
    pages,
    limit,
    items: lightItems,
  };
}

export function getSeriesDetail(slugOrId: string, onlyDecoded = true): SeriesItem | null {
  const { seriesBySlug } = loadCatalog();
  const raw = seriesBySlug.get(slugOrId);
  if (!raw) return null;
  if (!onlyDecoded) return raw;

  const store = getDecodedStore();
  const filteredSeasons = (raw.seasons || []).map((sn) => {
    const validEps = sn.episodes.filter((ep) => Boolean(store[ep.id]));
    return {
      ...sn,
      episodes: validEps,
      episodesCount: validEps.length,
    };
  }).filter((sn) => sn.episodes.length > 0);

  return {
    ...raw,
    seasons: filteredSeasons,
    seasonsCount: filteredSeasons.length,
    totalEpisodes: filteredSeasons.reduce((acc, sn) => acc + sn.episodes.length, 0),
  };
}

export function queryMovies({
  page = 1,
  limit = 24,
  q = "",
  genre = "",
  year = "",
  onlyDecoded = true,
}: {
  page?: number;
  limit?: number;
  q?: string;
  genre?: string;
  year?: string;
  onlyDecoded?: boolean;
}) {
  const { movies } = loadCatalog();
  let filtered = movies;

  if (onlyDecoded) {
    const store = getDecodedStore();
    filtered = filtered.filter((m) => Boolean(store[m.id] || store[m.slug]));
  }

  if (q) {
    const term = q.trim().toLowerCase();
    filtered = filtered.filter(
      (m) =>
        m.titleAr.toLowerCase().includes(term) ||
        (m.titleEn && m.titleEn.toLowerCase().includes(term)) ||
        m.slug.toLowerCase().includes(term)
    );
  }

  if (genre) {
    const g = genre.trim().toLowerCase();
    filtered = filtered.filter((m) => m.genres.some((genreName) => genreName.toLowerCase().includes(g)));
  }

  if (year) {
    const y = parseInt(year, 10);
    if (!isNaN(y)) {
      filtered = filtered.filter((m) => m.releaseYear === y);
    }
  }

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.max(1, Math.min(page, pages));
  const start = (safePage - 1) * limit;
  const items = filtered.slice(start, start + limit);

  return {
    total,
    page: safePage,
    pages,
    limit,
    items,
  };
}

export function getMovieDetail(slugOrId: string): MovieItem | null {
  const { moviesBySlug } = loadCatalog();
  return moviesBySlug.get(slugOrId) || null;
}

export function getCatalogStats() {
  const { series, movies, totalEpisodes } = loadCatalog();
  return {
    totalSeries: series.length,
    totalMovies: movies.length,
    totalEpisodes,
    status: "online",
  };
}

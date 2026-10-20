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
  playbackUrl?: string;
  runtime?: number;
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
  playbackUrl?: string;
}

interface CatalogData {
  series: SeriesItem[];
  seriesBySlug: Map<string, SeriesItem>;
  movies: MovieItem[];
  moviesBySlug: Map<string, MovieItem>;
  totalEpisodes: number;
}

let _cache: CatalogData | null = null;

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

  // Load enriched series overviews if available
  const cleanOverviews: Map<string, string> = new Map();
  if (fs.existsSync(vodSeriesPath)) {
    try {
      const list = JSON.parse(fs.readFileSync(vodSeriesPath, "utf-8"));
      if (Array.isArray(list)) {
        for (const item of list) {
          if (item.slug && item.overview) {
            cleanOverviews.set(item.slug, item.overview);
          }
        }
      }
    } catch {}
  }

  const seriesList: SeriesItem[] = [];
  const seriesBySlug = new Map<string, SeriesItem>();
  let totalEpisodes = 0;

  for (const s of Object.values(rawSeries)) {
    const slug = s.slug || s.id;
    if (!slug) continue;

    let seasons: SeasonItem[] = [];
    let countEps = 0;

    if (Array.isArray(s.seasons)) {
      seasons = s.seasons.map((sn: any) => {
        const episodes: EpisodeItem[] = (sn.episodes || []).map((ep: any) => ({
          id: ep.id || `${slug}-s${sn.number}-e${ep.number}`,
          seasonNumber: sn.number || 1,
          number: ep.number || 1,
          titleAr: ep.titleAr || `الحلقة ${ep.number || 1}`,
          titleEn: ep.titleEn || `Episode ${ep.number || 1}`,
          synopsisAr: ep.synopsisAr || "",
          playbackUrl: ep.playbackUrl || "",
          runtime: ep.runtime || null,
        }));
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

    const cleanStory = cleanOverviews.get(slug) || s.synopsisAr || "";

    const item: SeriesItem = {
      id: s.id || slug,
      slug,
      titleAr: s.titleAr || slug,
      titleEn: s.titleEn || "",
      synopsisAr: cleanStory,
      posterUrl: s.posterUrl || "",
      backdropUrl: s.backdropUrl || "",
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

    const item: MovieItem = {
      id: m.id || slug,
      slug,
      titleAr: m.titleAr || slug,
      titleEn: m.titleEn || "",
      synopsisAr: m.synopsisAr || "",
      posterUrl: m.posterUrl || "",
      backdropUrl: m.backdropUrl || "",
      releaseYear: m.releaseYear || 2024,
      rating: m.rating || 8.5,
      genres: genresArr,
      runtime: m.runtime || 110,
      playbackUrl: m.playbackUrl || "",
    };

    moviesList.push(item);
    moviesBySlug.set(slug, item);
    moviesBySlug.set(item.id, item);
  }

  _cache = {
    series: seriesList,
    seriesBySlug,
    movies: moviesList,
    moviesBySlug,
    totalEpisodes,
  };

  return _cache;
}

export function querySeries({
  page = 1,
  limit = 24,
  q = "",
  genre = "",
  year = "",
  dubbed = "",
}: {
  page?: number;
  limit?: number;
  q?: string;
  genre?: string;
  year?: string;
  dubbed?: string; // "1" for dubbed, "0" for subbed
}) {
  const { series } = loadCatalog();
  let filtered = series;

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

  // Return items without the heavy seasons array in the list view for speed
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

export function getSeriesDetail(slugOrId: string): SeriesItem | null {
  const { seriesBySlug } = loadCatalog();
  return seriesBySlug.get(slugOrId) || null;
}

export function queryMovies({
  page = 1,
  limit = 24,
  q = "",
  genre = "",
  year = "",
}: {
  page?: number;
  limit?: number;
  q?: string;
  genre?: string;
  year?: string;
}) {
  const { movies } = loadCatalog();
  let filtered = movies;

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

// TVORA shared types

export type Lang = "ar" | "en";
export type ContentType = "movie" | "series";

export interface TitleDTO {
  id: string;
  slug: string;
  type: ContentType;
  titleAr: string;
  titleEn: string;
  originalTitle?: string | null;
  synopsisAr: string;
  synopsisEn: string;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  releaseYear: number;
  releaseDate?: string | null;
  genres: string[]; // parsed from JSON
  runtime?: number | null;
  rating?: number | null;
  ratingSource?: string | null;
  ageRating?: string | null;
  featured: boolean;
  trending: boolean;
  isNew: boolean;
  premium: boolean;
  director?: string | null;
  cast: string[]; // parsed from JSON
  country?: string | null;
  contentLang?: string | null;
  playbackType: string;
  playbackUrl?: string | null;
  seasonsCount?: number;
}

export interface EpisodeDTO {
  id: string;
  seasonId: string;
  titleId: string;
  seasonNumber: number;
  number: number;
  titleAr: string;
  titleEn: string;
  synopsisAr: string;
  synopsisEn: string;
  runtime?: number | null;
  stillSeed?: string | null;
  playbackType: string;
  playbackUrl?: string | null;
}

export interface SeasonDTO {
  id: string;
  number: number;
  titleAr?: string | null;
  titleEn?: string | null;
  episodes: EpisodeDTO[];
}

export interface SeriesDetailsDTO extends TitleDTO {
  seasons: SeasonDTO[];
}

// ─── Live TV channels ────────────────────────────────────────────────────────

export type ChannelCategory =
  | "sports"
  | "movies"
  | "series"
  | "kids"
  | "documentary"
  | "news"
  | "music"
  | "general";

export const CHANNEL_CATEGORIES: ChannelCategory[] = [
  "sports",
  "movies",
  "series",
  "kids",
  "documentary",
  "news",
  "music",
  "general",
];

export interface ChannelServer {
  id: string;
  name: string;
  url: string;
  quality?: string;
  isDefault?: boolean;
  status?: string;
}

export interface ChannelDTO {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  category: ChannelCategory;
  descriptionAr: string;
  descriptionEn: string;
  nowPlayingAr: string;
  nowPlayingEn: string;
  colorA: string;
  colorB: string;
  quality: string;
  streamType: string;
  streamUrl?: string | null;
  logoUrl?: string | null;
  servers?: ChannelServer[];
  visible?: boolean; // admin API only — public API returns visible channels
}

export interface HomePayload {
  hero: HeroSlide[];
  trending: TitleDTO[];
  featured: TitleDTO[];
  topSeries?: TitleDTO[];
  newReleases: TitleDTO[];
  arabicPicks: TitleDTO[];
  topRated: TitleDTO[];
  demoMode: { enabled: boolean; reason: string };
}

export interface HeroSlide {
  kind: "movie" | "series";
  title?: TitleDTO;
}

export interface SearchPayload {
  titles: TitleDTO[];
  channels: ChannelDTO[];
}

export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  role: "user" | "admin";
  preferredLanguage: Lang;
  plan: string;
}

export interface ProgressDTO {
  titleId: string;
  episodeId?: string | null;
  positionSeconds: number;
  durationSeconds: number;
  updatedAt: string;
  title?: TitleDTO;
  episode?: EpisodeDTO | null;
}

export const GENRES_AR: Record<string, string> = {
  Action: "أكشن",
  Adventure: "مغامرة",
  Animation: "رسوم متحركة",
  Comedy: "كوميديا",
  Crime: "جريمة",
  Documentary: "وثائقي",
  Drama: "دراما",
  Family: "عائلي",
  Fantasy: "فانتازيا",
  History: "تاريخي",
  Horror: "رعب",
  Mystery: "غموض",
  Romance: "رومانسي",
  "Science Fiction": "خيال علمي",
  Thriller: "إثارة",
  War: "حرب",
  "Arabic Movies": "أفلام عربية",
  "Arabic Series": "مسلسلات عربية",
  "Turkish Series": "مسلسلات تركية",
  "Korean Series": "مسلسلات كورية",
};

export const GENRE_LIST = [
  "Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary", "Drama",
  "Family", "Fantasy", "History", "Horror", "Mystery", "Romance", "Science Fiction",
  "Thriller", "Arabic Movies", "Arabic Series", "Turkish Series", "Korean Series",
];

export function localized<T extends { titleAr: string; titleEn: string }>(item: T, lang: Lang): string {
  return lang === "ar" ? item.titleAr : item.titleEn;
}

export function parseGenres(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

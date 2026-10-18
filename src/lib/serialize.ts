// TVORA server serialization — Prisma rows → DTOs
import type {
  ChannelDTO,
  EpisodeDTO,
  SeasonDTO,
  TitleDTO,
  SeriesDetailsDTO,
} from "./types";

type AnyRow = Record<string, unknown> & { id: string };

export function serializeTitle(row: AnyRow): TitleDTO {
  return {
    id: row.id,
    slug: row.slug as string,
    type: row.type as "movie" | "series",
    titleAr: row.titleAr as string,
    titleEn: row.titleEn as string,
    originalTitle: (row.originalTitle as string) ?? null,
    synopsisAr: row.synopsisAr as string,
    synopsisEn: row.synopsisEn as string,
    posterUrl: (row.posterUrl as string) ?? null,
    backdropUrl: (row.backdropUrl as string) ?? null,
    releaseYear: row.releaseYear as number,
    releaseDate: (row.releaseDate as string) ?? null,
    genres: safeJson(row.genres, []) as string[],
    runtime: (row.runtime as number) ?? null,
    rating: (row.rating as number) ?? null,
    ratingSource: (row.ratingSource as string) ?? null,
    ageRating: (row.ageRating as string) ?? null,
    featured: Boolean(row.featured),
    trending: Boolean(row.trending),
    isNew: Boolean(row.isNew),
    premium: Boolean(row.premium),
    director: (row.director as string) ?? null,
    cast: safeJson(row.cast, []) as string[],
    country: (row.country as string) ?? null,
    contentLang: (row.contentLang as string) ?? null,
    playbackType: (row.playbackType as string) ?? "none",
    playbackUrl: (row.playbackUrl as string) ?? null,
    seasonsCount: (row._count as { seasons?: number } | undefined)?.seasons,
  };
}

export function serializeEpisode(row: AnyRow, seasonNumber?: number): EpisodeDTO {
  return {
    id: row.id,
    seasonId: row.seasonId as string,
    titleId: row.titleId as string,
    seasonNumber: seasonNumber ?? ((row.season as { number?: number } | undefined)?.number ?? 0),
    number: row.number as number,
    titleAr: row.titleAr as string,
    titleEn: row.titleEn as string,
    synopsisAr: row.synopsisAr as string,
    synopsisEn: row.synopsisEn as string,
    runtime: (row.runtime as number) ?? null,
    stillSeed: (row.stillSeed as string) ?? null,
    playbackType: (row.playbackType as string) ?? "none",
    playbackUrl: (row.playbackUrl as string) ?? null,
  };
}

export function serializeSeriesDetails(row: AnyRow): SeriesDetailsDTO {
  const base = serializeTitle(row);
  const seasons = ((row.seasons as AnyRow[]) ?? [])
    .slice()
    .sort((a, b) => (a.number as number) - (b.number as number))
    .map((s) => {
      const episodes = ((s.episodes as AnyRow[]) ?? [])
        .slice()
        .sort((a, b) => (a.number as number) - (b.number as number))
        .map((e) => serializeEpisode(e, s.number as number));
      const dto: SeasonDTO = {
        id: s.id,
        number: s.number as number,
        titleAr: (s.titleAr as string) ?? null,
        titleEn: (s.titleEn as string) ?? null,
        episodes,
      };
      return dto;
    });
  return { ...base, seasons };
}

export function serializeChannel(row: AnyRow): ChannelDTO {
  return {
    id: row.id,
    code: row.code as string,
    nameAr: row.nameAr as string,
    nameEn: row.nameEn as string,
    category: (row.category as ChannelDTO["category"]) ?? "general",
    descriptionAr: (row.descriptionAr as string) ?? "",
    descriptionEn: (row.descriptionEn as string) ?? "",
    nowPlayingAr: (row.nowPlayingAr as string) ?? "",
    nowPlayingEn: (row.nowPlayingEn as string) ?? "",
    colorA: (row.colorA as string) ?? "#9fb7cb",
    colorB: (row.colorB as string) ?? "#171719",
    quality: (row.quality as string) ?? "HD",
    streamType: (row.streamType as string) ?? "none",
    streamUrl: (row.streamUrl as string) ?? null,
    visible: Boolean(row.visible),
  };
}

export function safeJson(value: unknown, fallback: unknown = []): unknown {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

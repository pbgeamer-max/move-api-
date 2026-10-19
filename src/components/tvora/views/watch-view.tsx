"use client";
// WATCH — professional player experience resolving two source kinds:
// movie title and series episode (?ep=). Movies/episodes resume and save
// progress. Below the player: rich metadata, episode navigation, and honest
// related-content rows.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, Clock, Users } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { localized, parseGenres, GENRES_AR, type EpisodeDTO, type SeriesDetailsDTO, type TitleDTO, type ChannelServer } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { useT, EmptyState, DemoTag, Row, TitleCard, Reveal } from "../shared";
import { TvoraPlayer, PlayerSkeleton } from "../player";
import { RevealScale } from "../motion-fx";
import { WatchPartyPanel, defaultPartyName, useWatchParty } from "../watch-party";
import { cn } from "@/lib/utils";

type WatchSource =
  | { kind: "movie"; title: TitleDTO; src: string | null }
  | { kind: "episode"; title: SeriesDetailsDTO; episode: EpisodeDTO | null; src: string | null };

// Exported for the view contract (app-shell imports TvoraPlayer from watch-view).
export { TvoraPlayer };

export function WatchView({ id, episodeId }: { id: string; episodeId?: string }) {
  const { t, lang } = useT();
  const navigate = useAppStore((s) => s.navigate);
  const user = useAppStore((s) => s.user);
  const [source, setSource] = useState<WatchSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [similar, setSimilar] = useState<TitleDTO[]>([]);
  const [episodesOpen, setEpisodesOpen] = useState(false);

  // ── Watch party wiring (task 6-c) ───────────────────────────────────────────
  const [partyOpen, setPartyOpen] = useState(false);
  const [partyDeepCode, setPartyDeepCode] = useState<string | null>(null);
  const autoJoinTriedRef = useRef<string | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const onVideoEl = useCallback((el: HTMLVideoElement | null) => {
    videoElRef.current = el;
  }, []);
  const getVideoEl = useCallback(() => videoElRef.current, []);
  const party = useWatchParty({
    getVideoEl,
    isLive: false,
    currentTitleId: id,
    currentKind: source?.kind,
    invitePath: `#/watch/${id}${episodeId ? `?ep=${episodeId}` : ""}`,
  });

  // ?party=CODE deep link from the hash query (same place ?ep= lives).
  useEffect(() => {
    const read = () => {
      const params = new URLSearchParams(window.location.hash.split("?")[1] || "");
      const code = (params.get("party") || "").toUpperCase().trim();
      setPartyDeepCode(/^[A-Z0-9]{6}$/.test(code) ? code : null);
    };
    const t0 = window.setTimeout(read, 0); // async first read (no sync setState in effect)
    window.addEventListener("hashchange", read);
    return () => {
      window.clearTimeout(t0);
      window.removeEventListener("hashchange", read);
    };
  }, []);

  // Invited via deep link → auto-join with the remembered display name + open the panel.
  useEffect(() => {
    if (!partyDeepCode || party.room || party.status === "connecting") return;
    if (autoJoinTriedRef.current === partyDeepCode) return;
    autoJoinTriedRef.current = partyDeepCode;
    party.join(partyDeepCode, defaultPartyName(lang, user));
    setPartyOpen(true);
  }, [partyDeepCode, party.room, party.status, lang, user]);

  // Deep-link join failed (room expired) → honest toast.
  useEffect(() => {
    if (party.error !== "room-not-found") return;
    if (autoJoinTriedRef.current && !party.room) {
      toast.error(t("watchparty.roomNotFound"));
      party.dismissError();
      setPartyDeepCode(null);
    }
  }, [party.error, party.room]);

  // ── Resolve what we're watching ─────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setNotFound(false);
    setSimilar([]);
    (async () => {
      try {
        const dto = (await api.title(id)) as TitleDTO & { similar?: TitleDTO[] };
        if (!alive) return;
        if (dto.type === "movie") {
          setSimilar((dto.similar || []).slice(0, 10));
          setSource({ kind: "movie", title: dto, src: dto.playbackUrl || null });
        } else {
          const series = dto as SeriesDetailsDTO;
          const seasons = [...(series.seasons || [])].sort((a, b) => a.number - b.number);
          const flat = seasons.flatMap((s) => [...s.episodes].sort((a, b) => a.number - b.number));
          const episode = (episodeId && flat.find((e) => e.id === episodeId)) || flat[0] || null;
          const missingRequested = Boolean(episodeId) && !episode;
          if (missingRequested) {
            setSource({ kind: "episode", title: series, episode: null, src: null });
          } else {
            setSource({ kind: "episode", title: series, episode, src: episode?.playbackUrl || null });
          }
        }
      } catch {
        if (alive) setNotFound(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, episodeId]);

  useEffect(() => {
    if (!source) return;
    const label =
      source.kind === "movie"
        ? source.title.titleEn
        : source.episode
          ? `S${source.episode.seasonNumber}E${source.episode.number} ${source.episode.titleEn}`
          : source.title.titleEn;
    document.title = `${label} | TVORA`;
  }, [source]);

  // ── Per-kind related content ────────────────────────────────────────────────
  useEffect(() => {
    if (!source) return;
    let alive = true;
    if (source.kind === "episode") {
      const genres = parseGenres(source.title.genres as unknown);
      const genre = genres[0];
      api
        .titles({ type: "series", genre, limit: 12 })
        .then((r) => {
          if (alive) setSimilar(r.items.filter((x) => x.id !== id).slice(0, 10));
        })
        .catch(() => {});
    }
    return () => {
      alive = false;
    };
  }, [source, id]);

  // ── Episode navigation (within season & across seasons) ─────────────────────
  const series = source?.kind === "episode" ? source.title : null;
  const currentEpisode = source?.kind === "episode" ? source.episode : null;

  const flatEpisodes = useMemo<EpisodeDTO[]>(() => {
    if (!series) return [];
    return [...series.seasons]
      .sort((a, b) => a.number - b.number)
      .flatMap((s) => [...s.episodes].sort((a, b) => a.number - b.number));
  }, [series]);

  const epIndex = currentEpisode ? flatEpisodes.findIndex((e) => e.id === currentEpisode.id) : -1;
  const prevEpisode = epIndex > 0 ? flatEpisodes[epIndex - 1] : undefined;
  const nextEpisode = epIndex >= 0 && epIndex < flatEpisodes.length - 1 ? flatEpisodes[epIndex + 1] : undefined;
  const seasonEpisodes = useMemo(() => {
    if (!series || !currentEpisode) return [];
    const s = series.seasons.find((x) => x.number === currentEpisode.seasonNumber);
    return s ? [...s.episodes].sort((a, b) => a.number - b.number) : [];
  }, [series, currentEpisode]);

  const goEpisode = (ep: EpisodeDTO) => navigate({ name: "watch", id, ep: ep.id });

  const primaryStreamUrl = useMemo(() => {
    if (!source?.src) return "";
    const s = source.src;
    const idMatch = s.match(/[?&]id=([^&]+)/);
    if (idMatch) return `/api/stream/vod?id=${encodeURIComponent(idMatch[1])}`;
    if (s.includes(".m3u8") || s.includes("/vod/stream")) return `/api/stream/vod?url=${encodeURIComponent(s)}`;
    return s;
  }, [source?.src]);

  const vodServers = useMemo<ChannelServer[]>(() => {
    if (!source?.src) return [];
    const s = source.src;
    const idMatch = s.match(/[?&]id=([^&]+)/);
    const id = idMatch ? idMatch[1] : "";
    const directUrl = id ? `/api/stream/vod?id=${id}` : s;

    return [
      {
        id: "server-direct",
        name: "سيرفر رئيسي (FHD فائق السرعة)",
        url: directUrl,
        quality: "1080p",
        isDefault: true,
        status: "live",
      },
      {
        id: "server-backup",
        name: "سيرفر احتياطي (HD)",
        url: directUrl.includes("?") ? `${directUrl}&srv=2` : `${directUrl}?srv=2`,
        quality: "720p",
        status: "live",
      },
    ];
  }, [source?.src]);

  // ── States ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 pb-16 pt-20 md:px-8 md:pt-24" data-testid="watch-view">
        <div className="tv-shimmer mb-4 h-6 w-36 rounded" aria-hidden />
        <PlayerSkeleton />
        <div className="tv-shimmer mt-5 h-7 w-64 rounded" aria-hidden />
      </div>
    );
  }

  if (notFound || !source) {
    return (
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-40" data-testid="watch-view">
        <EmptyState
          title={t("details.notFound")}
          hint={t("details.notFoundHint")}
          action={
            <button
              type="button"
              onClick={() => navigate({ name: "home" })}
              className="tv-focusable rounded-md border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:border-white/40 hover:text-white"
            >
              {t("misc.goHome")}
            </button>
          }
        />
      </div>
    );
  }

  // Heading
  const heading =
    source.kind === "movie"
      ? localized(source.title, lang)
      : currentEpisode
        ? `${localized(source.title, lang)} — S${currentEpisode.seasonNumber}·E${currentEpisode.number} ${lang === "ar" ? currentEpisode.titleAr : currentEpisode.titleEn}`
        : localized(source.title, lang);

  const poster = source.title.backdropUrl || undefined;

  const genreLabel = (g: string) => (lang === "ar" ? GENRES_AR[g] || g : g);

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-16 pt-20 md:px-8 md:pt-24" data-testid="watch-view">
      <button
        type="button"
        onClick={() => navigate({ name: "title", id })}
        className="tv-focusable mb-4 inline-flex min-h-[44px] items-center gap-1.5 text-sm text-white/60 transition hover:text-white"
      >
        <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden /> {t("player.back")}
      </button>

      <RevealScale>
        <div className="overflow-hidden rounded-xl border border-white/10 bg-black shadow-[0_30px_80px_-30px_rgba(0,0,0,0.95)]">
        {source.src ? (
          <TvoraPlayer
            src={primaryStreamUrl}
            servers={vodServers}
            titleId={source.title.id}
            episodeId={source.kind === "episode" && currentEpisode ? currentEpisode.id : undefined}
            title={heading}
            poster={poster}
            subtitles={[
              { label: "العربية", srclang: "ar", src: "/media/subtitles-ar.vtt", default: lang === "ar" },
              { label: "English", srclang: "en", src: "/media/subtitles-en.vtt", default: lang === "en" },
            ]}
            introStart={15}
            introEnd={85}
            nextEpisode={
              source.kind === "episode" && nextEpisode
                ? {
                    id: nextEpisode.id,
                    number: nextEpisode.number,
                    seasonNumber: nextEpisode.seasonNumber,
                    title: lang === "ar" ? nextEpisode.titleAr : nextEpisode.titleEn,
                    onClick: () => goEpisode(nextEpisode),
                  }
                : undefined
            }
            onVideoEl={onVideoEl}
            onEnded={
              source.kind === "episode" && nextEpisode
                ? () => goEpisode(nextEpisode)
                : undefined
            }
          />
        ) : (
          <div className="flex aspect-video flex-col items-center justify-center gap-4 bg-[#0a0a0c] p-6 text-center" data-testid="unavailable">
            <AlertTriangle className="h-7 w-7 text-white/35" aria-hidden />
            <p className="max-w-md text-sm text-white/65">
              {source.kind === "episode" && !currentEpisode
                ? t("player.episodeUnavailable")
                : t("details.notAvailableStream")}
            </p>
          </div>
        )}
        </div>
      </RevealScale>

      {/* Heading + demo tags + watch party */}
      <Reveal delay={0.08} className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="text-xl font-extrabold tracking-tight md:text-2xl">{heading}</h1>
        <DemoTag />
        {source.src && (
          <button
            type="button"
            onClick={() => setPartyOpen(true)}
            data-testid="party-open"
            className="tv-focusable sm:ms-auto inline-flex min-h-[40px] items-center gap-2 rounded-md border border-white/15 px-3.5 text-sm font-semibold text-white/80 transition hover:border-[#9fb7cb]/55 hover:text-white"
          >
            <Users className="h-4 w-4 text-[#9fb7cb]" aria-hidden />
            {t("watchparty.start")}
            {party.room && (
              <span className="rounded-full bg-[#d8c9a3]/15 px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-widest text-[#d8c9a3]" dir="ltr">
                {party.room.code}
              </span>
            )}
          </button>
        )}
      </Reveal>
      <p className="mt-1.5 text-xs text-white/45">{t("player.demoNotice")}</p>

      {/* ── Episode block ──────────────────────────────────────────────────── */}
      {source.kind === "episode" && (
        <section className="mt-6 rounded-xl border border-white/8 bg-white/[0.015] p-5" data-testid="episode-block">
          {currentEpisode ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9fb7cb]">
                    {t("hero.season")} {currentEpisode.seasonNumber} · {t("details.episode")} {currentEpisode.number}{" "}
                    <span className="text-white/30">
                      {t("player.episodeOf")} {flatEpisodes.length}
                    </span>
                  </p>
                  <h2 className="mt-1 text-base font-bold text-white/92">
                    {lang === "ar" ? currentEpisode.titleAr : currentEpisode.titleEn}
                  </h2>
                  {Boolean(currentEpisode.runtime) && (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-white/45">
                      <Clock className="h-3.5 w-3.5" aria-hidden /> {currentEpisode.runtime} {t("details.minutes")}
                    </p>
                  )}
                </div>
                <Reveal delay={0.12} className="shrink-0">
                  <EpisodeNavButtons
                    onPrev={prevEpisode ? () => goEpisode(prevEpisode) : undefined}
                    onNext={nextEpisode ? () => goEpisode(nextEpisode) : undefined}
                  />
                </Reveal>
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/60">
                {lang === "ar" ? currentEpisode.synopsisAr : currentEpisode.synopsisEn}
              </p>

              {/* Collapsible episode list (current season) */}
              {seasonEpisodes.length > 0 && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setEpisodesOpen((o) => !o)}
                    aria-expanded={episodesOpen}
                    className="tv-focusable inline-flex min-h-[44px] items-center gap-2 rounded-md border border-white/12 px-4 text-sm font-semibold text-white/75 transition hover:border-white/35 hover:text-white"
                  >
                    {episodesOpen ? t("player.hideEpisodes") : t("player.episodesList")}
                    <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", episodesOpen && "rotate-180")} aria-hidden />
                  </button>
                  {episodesOpen && (
                    <ul className="mt-3 max-h-80 space-y-1.5 overflow-y-auto pe-1">
                      {seasonEpisodes.map((ep) => {
                        const active = ep.id === currentEpisode.id;
                        return (
                          <li key={ep.id}>
                            <button
                              type="button"
                              onClick={() => goEpisode(ep)}
                              aria-current={active ? "true" : undefined}
                              className={cn(
                                "tv-focusable flex min-h-[48px] w-full items-center gap-3 rounded-md border px-3 text-start text-sm transition",
                                active
                                  ? "border-[#d8c9a3]/35 bg-[#d8c9a3]/8 text-[#e6d9b8]"
                                  : "border-transparent text-white/75 hover:border-white/10 hover:bg-white/5"
                              )}
                            >
                              <span className="w-8 shrink-0 text-center text-xs font-extrabold tabular-nums text-white/45" dir="ltr">
                                {ep.number}
                              </span>
                              <span className="min-w-0 flex-1 truncate font-semibold">
                                {lang === "ar" ? ep.titleAr : ep.titleEn}
                              </span>
                              {Boolean(ep.runtime) && (
                                <span className="shrink-0 text-[11px] text-white/35" dir="ltr">
                                  {ep.runtime}′
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-white/60">{t("player.episodeUnavailable")}</p>
          )}
        </section>
      )}

      {/* ── Title meta ─────────────────────────────────────────────────────── */}
      <section className="mt-6 max-w-3xl" data-testid="title-meta">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-white/60">
            <span className="font-bold text-white/85">{source.title.releaseYear}</span>
            {source.title.runtime ? <span>· {source.title.runtime} {t("details.minutes")}</span> : null}
            {source.title.rating != null && <span>· ★ {source.title.rating.toFixed(1)}</span>}
            {parseGenres(source.title.genres as unknown).slice(0, 3).map((g) => (
              <span key={g} className="rounded-sm bg-white/6 px-2 py-0.5 text-[11px] font-semibold text-white/65">
                {genreLabel(g)}
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            {lang === "ar" ? source.title.synopsisAr : source.title.synopsisEn}
          </p>
        </section>

      {/* ── Related rows ───────────────────────────────────────────────────── */}
      {similar.length > 0 && (
        <Reveal>
          <Row title={t("details.similar")}>
            {similar.map((s) => (
              <TitleCard key={s.id} title={s} />
            ))}
          </Row>
        </Reveal>
      )}

      {/* ── Watch party panel (side panel on md+, bottom sheet on mobile) ──── */}
      <WatchPartyPanel open={partyOpen} onClose={() => setPartyOpen(false)} party={party} />
    </div>
  );
}

//───────────────────────────────────────────────────────────────────────────────
// Episode navigation buttons (prev / next across seasons)
export function EpisodeNavButtons({ onPrev, onNext }: { onPrev?: () => void; onNext?: () => void }) {
  const { t } = useT();
  return (
    <div className="flex gap-2" data-testid="episode-nav">
      {onPrev && (
        <button
          type="button"
          onClick={onPrev}
          className="tv-focusable inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-white/15 px-4 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
        >
          <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden /> {t("player.prevEpisode")}
        </button>
      )}
      {onNext && (
        <button
          type="button"
          onClick={onNext}
          className="tv-focusable inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-white/15 px-4 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
        >
          {t("player.nextEpisode")} <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
        </button>
      )}
    </div>
  );
}

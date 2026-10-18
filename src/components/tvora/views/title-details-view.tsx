"use client";
// TITLE DETAILS — cinematic title page for movies & series.
// Full-bleed parallax backdrop, floating poster card, complete localized
// metadata, honest playback availability, trailer (or honest placeholder),
// season/episode navigation for series, and a "More Like This" row.
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, type Variants } from "framer-motion";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Info,
  Play,
  Plus,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  GENRES_AR,
  localized,
  parseGenres,
  type EpisodeDTO,
  type SeriesDetailsDTO,
  type TitleDTO,
} from "@/lib/types";
import { backdropFor, posterFor } from "@/lib/artwork";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { useAppStore } from "@/lib/store";
import { EmptyState, Rating, Reveal, Row, TitleCard, useMyList, useT } from "../shared";
import { FallbackImage } from "../fallback-image";
import { Stagger, TiltCard, useMotionAllowed } from "../motion-fx";
import { cn } from "@/lib/utils";

type DetailsData = (TitleDTO & { similar?: TitleDTO[] }) | SeriesDetailsDTO;
type FetchState = { id: string; data: DetailsData } | { id: string; error: true };

// 5-c — local entrance variants (shared easings, GPU-safe transform/opacity only)
const metaItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT_EXPO } },
};
const chipItem: Variants = {
  hidden: { opacity: 0, scale: 0.85, y: 8 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.42, ease: EASE_OUT_EXPO } },
};
const epItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: EASE_OUT_EXPO } },
};

export function TitleDetailsView({ id }: { id: string }) {
  const { t, lang } = useT();
  const navigate = useAppStore((s) => s.navigate);
  const { has, toggle } = useMyList();

  const [state, setState] = useState<FetchState | null>(null);
  const [seasonNum, setSeasonNum] = useState<number | null>(null);
  const [epId, setEpId] = useState<string | null>(null);
  const [similarState, setSimilarState] = useState<{ id: string; items: TitleDTO[] } | null>(null);

  const data = state && "data" in state && state.id === id ? state.data : null;
  const notFound = !!state && state.id === id && !("data" in state);
  const loading = !data && !notFound;

  useEffect(() => {
    let alive = true;
    api
      .title(id)
      .then((d) => {
        if (alive) setState({ id, data: d as DetailsData });
      })
      .catch(() => {
        if (alive) setState({ id, error: true });
      });
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    if (data) document.title = `${localized(data, lang)} | TVORA`;
  }, [data, lang]);

  // Series: similar titles come from the catalog filtered by the first genre
  useEffect(() => {
    if (!data || data.type !== "series") return;
    const g = parseGenres(data.genres)[0];
    if (!g) return;
    let alive = true;
    api
      .titles({ genre: g, limit: 12, sort: "rating" })
      .then((res) => {
        if (alive) setSimilarState({ id: data.id, items: res.items.filter((x) => x.id !== data.id).slice(0, 12) });
      })
      .catch(() => {
        if (alive) setSimilarState({ id: data.id, items: [] });
      });
    return () => {
      alive = false;
    };
  }, [data]);

  // Scroll the selected episode row into view (no state writes)
  const listRef = useRef<HTMLDivElement>(null);
  const selectedEpId = derivedSelectedEpId(data, seasonNum, epId);
  useEffect(() => {
    const el = listRef.current?.querySelector("[data-selected='true']");
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedEpId]);

  // ── States ──
  if (loading) return <DetailsSkeleton />;
  if (notFound || !data) {
    return (
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-48">
        <EmptyState
          title={t("details.notFound")}
          hint={t("details.notFoundHint")}
          action={
            <button
              type="button"
              onClick={() => navigate("home")}
              className="tv-focusable rounded-md bg-white px-5 py-2 text-sm font-extrabold text-black"
            >
              {t("details.backToBrowse")}
            </button>
          }
        />
      </div>
    );
  }

  const name = localized(data, lang);
  const genres = parseGenres(data.genres);
  const inList = has(data.id);
  const seasons = data.type === "series" ? [...(data as SeriesDetailsDTO).seasons].sort((a, b) => a.number - b.number) : [];
  const season = seasons.find((s) => s.number === seasonNum) ?? seasons[0];
  const flatEps = seasons.flatMap((s) => [...s.episodes].sort((a, b) => a.number - b.number));
  const selectedEp = flatEps.find((e) => e.id === epId) ?? season?.episodes[0] ?? flatEps[0] ?? null;
  const epIndex = selectedEp ? flatEps.findIndex((e) => e.id === selectedEp.id) : -1;
  const canWatch =
    data.type === "series"
      ? data.playbackType !== "none" && !!selectedEp
      : data.playbackType !== "none";
  const trailerUrl = (data as { trailerUrl?: string | null }).trailerUrl || null;
  const releaseDateStr = data.releaseDate
    ? new Date(data.releaseDate).toLocaleDateString(lang === "ar" ? "ar-IQ" : "en-GB", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;
  const similar: TitleDTO[] | null =
    data.type === "movie"
      ? (data as TitleDTO & { similar?: TitleDTO[] }).similar ?? []
      : similarState && similarState.id === data.id
        ? similarState.items
        : null;

  const goWatch = () => {
    if (!canWatch) return;
    if (data.type === "series" && selectedEp) navigate({ name: "watch", id: data.id, ep: selectedEp.id });
    else navigate({ name: "watch", id: data.id });
  };

  const goEp = (ep: EpisodeDTO) => {
    setEpId(ep.id);
    setSeasonNum(ep.seasonNumber);
    navigate({ name: "watch", id: data.id, ep: ep.id });
  };

  return (
    <div className="pb-16" data-testid="title-details">
      {/* ── Full-bleed parallax backdrop ── */}
      <div className="relative h-[60vh] min-h-[420px] w-full overflow-hidden">
        <BackdropParallax data={data} name={name} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070708] via-[#070708]/45 to-[#070708]/25" />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/55 to-transparent" />
        <div className="tv-grain absolute inset-0" />
        <div className="tv-vignette absolute inset-0" />
      </div>

      {/* ── Overlapping content ── */}
      <div className="relative z-10 mx-auto -mt-44 max-w-[1600px] px-4 md:-mt-52 md:px-8 lg:px-12">
        <Reveal>
          <button
            type="button"
            onClick={() => navigate({ name: data.type === "movie" ? "movies" : "series" })}
            className="tv-focusable mb-5 inline-flex items-center gap-1.5 text-sm text-white/60 transition hover:text-white"
          >
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden /> {t("details.backToBrowse")}
          </button>
        </Reveal>

        <div className="flex flex-col gap-7 md:flex-row">
          {/* Floating poster card — 3D pointer tilt (motion-fx) */}
          <Reveal className="w-36 shrink-0 sm:w-44 md:w-52">
            <motion.div
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE_OUT_EXPO, delay: 0.08 }}
              className="group relative"
            >
              <TiltCard
                max={7}
                className="aspect-[2/3] overflow-hidden rounded-lg border border-white/10 bg-[#101012] shadow-2xl"
              >
                <FallbackImage
                  key={data.id}
                  candidates={[data.posterUrl]}
                  fallback={posterFor(data.id + name, name, `${data.type === "movie" ? "FILM" : "SERIES"} · ${data.releaseYear}`)}
                  alt={name}
                  priority
                  className="h-full w-full"
                />
              </TiltCard>
            </motion.div>
          </Reveal>

          <Reveal delay={0.12} className="min-w-0 flex-1">
            <h1 className="tv-title-glow text-3xl font-extrabold leading-tight md:text-5xl">{name}</h1>
            {data.originalTitle && data.originalTitle !== name && (
              <p className="mt-1.5 text-sm text-white/45">
                {t("details.originalTitle")}: <span className="text-white/60">{data.originalTitle}</span>
              </p>
            )}

            {/* Meta line — staggered entrance */}
            <Stagger className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-white/60" stagger={0.06}>
              <motion.span variants={metaItem} className="tabular-nums font-semibold text-white/85">{data.releaseYear}</motion.span>
              <motion.span variants={metaItem} aria-hidden>·</motion.span>
              <motion.span
                variants={metaItem}
                className="rounded-sm border border-white/20 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide"
              >
                {data.type === "movie" ? (lang === "ar" ? "فيلم" : "MOVIE") : lang === "ar" ? "مسلسل" : "SERIES"}
              </motion.span>
              {data.type === "movie" && data.runtime ? (
                <>
                  <motion.span variants={metaItem} aria-hidden>·</motion.span>
                  <motion.span variants={metaItem} className="tabular-nums">
                    {data.runtime} {t("details.minutes")}
                  </motion.span>
                </>
              ) : null}
              {data.type === "series" && seasons.length > 0 ? (
                <>
                  <motion.span variants={metaItem} aria-hidden>·</motion.span>
                  <motion.span variants={metaItem} className="tabular-nums">
                    {seasons.length} {t("hero.seasons")}
                  </motion.span>
                </>
              ) : null}
              {data.ageRating && (
                <motion.span
                  variants={metaItem}
                  className="rounded-sm border border-white/25 px-1.5 py-0.5 text-[11px] font-bold"
                >
                  {data.ageRating}
                </motion.span>
              )}
              <motion.span variants={metaItem} className="inline-flex">
                <Rating value={data.rating} className="text-[13px]" />
              </motion.span>
              {data.ratingSource && (
                <motion.span variants={metaItem} className="text-xs text-white/40">{data.ratingSource}</motion.span>
              )}
            </Stagger>

            {/* Genre chips — staggered entrance */}
            {genres.length > 0 && (
              <Stagger className="mt-3 flex flex-wrap gap-1.5" stagger={0.045}>
                {genres.map((g) => (
                  <motion.span
                    key={g}
                    variants={chipItem}
                    className="rounded-full border border-white/10 bg-white/4 px-2.5 py-1 text-[11px] text-white/65"
                  >
                    {lang === "ar" ? GENRES_AR[g] || g : g}
                  </motion.span>
                ))}
              </Stagger>
            )}

            <p className="mt-4 max-w-2xl leading-relaxed text-white/75">
              {lang === "ar" ? data.synopsisAr : data.synopsisEn}
            </p>

            {/* Actions */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                data-testid="details-watch"
                onClick={goWatch}
                disabled={!canWatch}
                aria-disabled={!canWatch}
                className={cn(
                  "tv-focusable inline-flex h-11 items-center gap-2 rounded-md px-6 text-sm font-extrabold transition",
                  canWatch
                    ? "bg-white text-black hover:bg-[#e8eef4] active:scale-[0.98]"
                    : "cursor-not-allowed bg-white/25 text-white/60"
                )}
              >
                <Play className="h-4 w-4" aria-hidden /> {t("hero.watchNow")}
              </button>
              <button
                type="button"
                onClick={() => void toggle(data)}
                aria-pressed={inList}
                className="tv-focusable inline-flex h-11 items-center gap-2 rounded-md border border-white/25 px-5 text-sm font-bold text-white transition hover:border-white/60 hover:bg-white/5"
              >
                {inList ? <Check className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
                {inList ? t("hero.inList") : t("hero.addToList")}
              </button>
              {data.playbackType === "demo" && (
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#d8c9a3]">
                  <Clapperboard className="h-3.5 w-3.5" aria-hidden /> {t("details.availableStream")}
                </p>
              )}
              {data.playbackType === "none" && (
                <p className="inline-flex items-center gap-1.5 text-xs text-white/45">
                  <Info className="h-3.5 w-3.5" aria-hidden /> {t("details.notAvailableStream")}
                </p>
              )}
            </div>

            {/* Metadata grid */}
            <div className="mt-7 grid max-w-3xl grid-cols-1 gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
              {data.director && (
                <div>
                  <p className="text-white/40">{t("details.director")}</p>
                  <p className="mt-0.5 font-semibold text-white/85">{data.director}</p>
                </div>
              )}
              {data.country && (
                <div>
                  <p className="text-white/40">{t("details.country")}</p>
                  <p className="mt-0.5 font-semibold text-white/85">{data.country}</p>
                </div>
              )}
              {releaseDateStr && (
                <div>
                  <p className="text-white/40">{t("details.releaseDate")}</p>
                  <p className="mt-0.5 font-semibold text-white/85 tabular-nums">{releaseDateStr}</p>
                </div>
              )}
              {data.cast.length > 0 && (
                <div className="sm:col-span-2">
                  <p className="text-white/40">{t("details.cast")}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {data.cast.slice(0, 10).map((c) => (
                      <span key={c} className="rounded-full border border-white/10 bg-white/4 px-2.5 py-1 text-xs text-white/70">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Reveal>
        </div>

        {/* ── Trailer (or honest placeholder) ── */}
        <section className="mt-14" aria-label={t("details.trailer")}>
          <h2 className="mb-4 text-xl font-bold text-white/95">{t("details.trailer")}</h2>
          {trailerUrl ? (
            <video
              controls
              playsInline
              preload="metadata"
              src={trailerUrl}
              className="aspect-video w-full max-w-4xl rounded-lg border border-white/10 bg-black shadow-2xl"
            />
          ) : (
            <div className="flex max-w-4xl flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-white/10 bg-white/[0.015] px-6 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-[#121216]">
                <Clapperboard className="h-5 w-5 text-white/40" aria-hidden />
              </div>
              <p className="text-sm font-semibold text-white/70">{t("details.trailerUnavailable")}</p>
              <p className="max-w-md text-xs leading-relaxed text-white/40">{t("details.trailerUnavailableHint")}</p>
            </div>
          )}
        </section>

        {/* ── Series: seasons & episodes ── */}
        {data.type === "series" && seasons.length > 0 && (
          <section className="mt-14" aria-label={t("details.episodes")}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-white/95">{t("details.episodes")}</h2>
              {/* Season tabs — shared layoutId pill glides to the active season */}
              <div
                role="group"
                aria-label={t("details.selectSeason")}
                data-testid="season-select"
                className="flex max-w-full flex-wrap items-center gap-1.5"
              >
                {seasons.map((s) => {
                  const active = season?.number === s.number;
                  const label =
                    (lang === "ar" ? s.titleAr : s.titleEn) || `${t("hero.season")} ${s.number}`;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={active}
                      data-testid={`season-tab-${s.number}`}
                      onClick={() => {
                        setSeasonNum(s.number);
                        setEpId(s.episodes[0]?.id ?? null);
                      }}
                      className={cn(
                        "tv-focusable relative rounded-full border px-4 py-1.5 text-xs font-bold transition-colors duration-300",
                        active
                          ? "border-transparent text-black"
                          : "border-white/12 text-white/65 hover:border-white/35 hover:text-white"
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="tvora-season-pill"
                          transition={{ type: "spring", stiffness: 420, damping: 34 }}
                          aria-hidden
                          className="absolute inset-0 rounded-full bg-white shadow-[0_2px_14px_rgba(255,255,255,0.18)]"
                        />
                      )}
                      <span className="relative z-10 whitespace-nowrap">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <motion.div
              ref={listRef}
              key={season?.id ?? "episodes"}
              data-testid="episode-list"
              className="max-h-[420px] space-y-1.5 overflow-y-auto rounded-lg border border-white/8 bg-white/[0.015] p-2"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-40px" }}
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } } }}
            >
              {(season?.episodes ?? []).map((ep) => {
                const epName = localized(ep, lang);
                const selected = selectedEp?.id === ep.id;
                return (
                  <motion.button
                    key={ep.id}
                    variants={epItem}
                    type="button"
                    data-testid={`episode-${ep.number}`}
                    data-selected={selected || undefined}
                    onClick={() => goEp(ep)}
                    className={cn(
                      "tv-focusable group/ep flex w-full items-center gap-3 rounded-md p-2.5 text-start transition sm:gap-4",
                      selected ? "border border-[#9fb7cb]/35 bg-white/5" : "border border-transparent hover:bg-white/5"
                    )}
                    aria-current={selected ? "true" : undefined}
                  >
                    <span className="w-7 shrink-0 text-center text-lg font-extrabold text-white/35 tabular-nums">{ep.number}</span>
                    <span className="relative h-14 w-24 shrink-0 overflow-hidden rounded-sm border border-white/8 bg-[#121218] sm:h-16 sm:w-28">
                      <FallbackImage
                        candidates={[]}
                        fallback={backdropFor(ep.stillSeed || ep.id, epName, `E${ep.number}`)}
                        alt={epName}
                        className="h-full w-full transition-transform duration-500 ease-out group-hover/ep:scale-[1.09]"
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity duration-200 group-hover/ep:opacity-100">
                        <Play className="h-5 w-5 fill-white text-white" aria-hidden />
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-white/90">{epName}</span>
                      <span className="line-clamp-1 block text-xs text-white/45">
                        {lang === "ar" ? ep.synopsisAr : ep.synopsisEn}
                      </span>
                    </span>
                    {ep.runtime ? (
                      <span className="shrink-0 text-xs text-white/40 tabular-nums">
                        {ep.runtime} {t("details.minutes")}
                      </span>
                    ) : null}
                    <Play className="h-4 w-4 shrink-0 text-white/30 transition group-hover/ep:text-white/80" aria-hidden />
                  </motion.button>
                );
              })}
              {(season?.episodes ?? []).length === 0 && (
                <motion.p variants={epItem} className="p-4 text-sm text-white/45">{t("details.noEpisodes")}</motion.p>
              )}
            </motion.div>

            {/* Prev / next episode navigation */}
            {flatEps.length > 1 && (
              <div className="mt-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => epIndex > 0 && goEp(flatEps[epIndex - 1])}
                  disabled={epIndex <= 0}
                  aria-label={t("player.prevEpisode")}
                  className="tv-focusable inline-flex h-10 items-center gap-1.5 rounded-md border border-white/15 px-4 text-xs font-bold text-white/80 transition hover:border-white/40 hover:text-white disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden /> {t("player.prevEpisode")}
                </button>
                <span className="text-xs text-white/40 tabular-nums">
                  {epIndex + 1} / {flatEps.length}
                </span>
                <button
                  type="button"
                  onClick={() => epIndex >= 0 && epIndex < flatEps.length - 1 && goEp(flatEps[epIndex + 1])}
                  disabled={epIndex < 0 || epIndex >= flatEps.length - 1}
                  aria-label={t("player.nextEpisode")}
                  className="tv-focusable inline-flex h-10 items-center gap-1.5 rounded-md border border-white/15 px-4 text-xs font-bold text-white/80 transition hover:border-white/40 hover:text-white disabled:opacity-30"
                >
                  {t("player.nextEpisode")} <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
                </button>
              </div>
            )}
          </section>
        )}
      </div>

      {/* ── More Like This ── */}
      {similar && similar.length > 0 && (
        <div className="mt-14">
          <Row title={t("details.similar")}>
            {similar.map((s) => (
              <TitleCard key={s.id} title={s} />
            ))}
          </Row>
        </div>
      )}
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function derivedSelectedEpId(
  data: DetailsData | null,
  seasonNum: number | null,
  epId: string | null
): string | null {
  if (!data || data.type !== "series") return null;
  const seasons = [...(data as SeriesDetailsDTO).seasons].sort((a, b) => a.number - b.number);
  const season = seasons.find((s) => s.number === seasonNum) ?? seasons[0];
  const flat = seasons.flatMap((s) => [...s.episodes].sort((a, b) => a.number - b.number));
  return (flat.find((e) => e.id === epId) ?? season?.episodes[0] ?? flat[0] ?? null)?.id ?? null;
}

// ref for parallax target lives inside BackdropParallax

function BackdropParallax({ data, name }: { data: DetailsData; name: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const allowed = useMotionAllowed();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  // 5-c — depth parallax: drift down 120px while the hero slowly zooms 1.05 → 1.15
  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const scale = useTransform(scrollYProgress, [0, 1], [1.05, 1.15]);

  return (
    <div ref={ref} className="absolute inset-0">
      <motion.div
        style={allowed ? { y, scale } : undefined}
        className="absolute inset-0 will-change-transform"
      >
        <FallbackImage
          key={data.id}
          candidates={[data.backdropUrl, data.posterUrl]}
          fallback={backdropFor(data.id + name, name, `TVORA · ${data.releaseYear}`)}
          alt=""
          priority
          className="h-full w-full"
        />
      </motion.div>
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <div aria-busy="true" role="status">
      <div className="tv-shimmer h-[60vh] min-h-[420px] w-full" />
      <div className="mx-auto -mt-44 max-w-[1600px] px-4 md:-mt-52 md:px-8 lg:px-12">
        <div className="flex flex-col gap-7 md:flex-row">
          <div className="tv-shimmer aspect-[2/3] w-36 rounded-lg border border-white/6 sm:w-44 md:w-52" />
          <div className="flex-1 space-y-4 pt-2">
            <div className="h-9 w-2/3 rounded tv-shimmer" />
            <div className="h-4 w-1/3 rounded tv-shimmer" />
            <div className="h-4 w-1/2 rounded tv-shimmer" />
            <div className="h-20 w-full max-w-2xl rounded tv-shimmer" />
            <div className="h-11 w-56 rounded tv-shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
}

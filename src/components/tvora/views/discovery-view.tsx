"use client";
// MOVIES / SERIES discovery — cinematic catalog browser.
// Atmospheric page intro, sticky filter bar that turns to glass once stuck
// (rAF-throttled scroll check), genre chips with a shared layoutId active pill,
// responsive poster grid that staggers in on view and reflows smoothly on
// filter changes, load-more pagination and honest empty/error states.
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown, Film, Plus, Search, SlidersHorizontal, Tv, X } from "lucide-react";
import { api } from "@/lib/api";
import { GENRES_AR, GENRE_LIST, localized, parseGenres, type TitleDTO } from "@/lib/types";
import { posterFor } from "@/lib/artwork";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { useAppStore } from "@/lib/store";
import { EmptyState, ErrorState, Rating, useMyList, useT } from "../shared";
import { Stagger, staggerItem } from "../motion-fx";
import { HoverPreview } from "../hover-preview";
import { FallbackImage } from "../fallback-image";
import { cn } from "@/lib/utils";

const LIMIT = 24;
const YEARS: string[] = Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() + 1 - i));

interface Loaded {
  key: string;
  page: number;
  items: TitleDTO[];
  total: number;
  pages: number;
}

export function DiscoveryBase({ type }: { type: "movie" | "series" }) {
  const { t, lang } = useT();
  const [genre, setGenre] = useState("");
  const [year, setYear] = useState("");
  const [sort, setSort] = useState("popularity");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [appending, setAppending] = useState(false);
  const [retry, setRetry] = useState(0);
  const [stuck, setStuck] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  const filterKey = `${type}|${genre}|${year}|${sort}|${q}`;
  const stale = !loaded || loaded.key !== filterKey;
  const failed = errorKey === filterKey;
  const activeCount = (genre ? 1 : 0) + (year ? 1 : 0) + (sort !== "popularity" ? 1 : 0) + (q ? 1 : 0);

  useEffect(() => {
    document.title =
      type === "movie"
        ? lang === "ar"
          ? "أفلام | TVORA"
          : "Movies | TVORA"
        : lang === "ar"
          ? "مسلسلات | TVORA"
          : "Series | TVORA";
  }, [type, lang]);

  // Debounced search input (300ms)
  useEffect(() => {
    const id = window.setTimeout(() => setQ(qInput.trim()), 300);
    return () => window.clearTimeout(id);
  }, [qInput]);

  // Glass-on-stuck for the filter bar — rAF-throttled, setState never runs
  // synchronously inside the effect body (React 19 rule).
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      setStuck(el.getBoundingClientRect().top <= 76);
    };
    raf = requestAnimationFrame(measure);
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Catalog fetch — filters always reset to page 1
  useEffect(() => {
    let alive = true;
    api
      .titles({ type, genre: genre || undefined, year: year || undefined, sort, q: q || undefined, page: 1, limit: LIMIT })
      .then((res) => {
        if (!alive) return;
        setErrorKey(null);
        setLoaded({ key: filterKey, page: res.page, items: res.items, total: res.total, pages: res.pages });
      })
      .catch(() => {
        if (!alive) return;
        setErrorKey(filterKey);
      });
    return () => {
      alive = false;
    };
  }, [type, genre, year, sort, q, filterKey, retry]);

  const loadMore = async () => {
    if (!loaded || appending || loaded.key !== filterKey) return;
    setAppending(true);
    try {
      const res = await api.titles({
        type,
        genre: genre || undefined,
        year: year || undefined,
        sort,
        q: q || undefined,
        page: loaded.page + 1,
        limit: LIMIT,
      });
      setLoaded({
        key: filterKey,
        page: res.page,
        items: [...loaded.items, ...res.items],
        total: res.total,
        pages: res.pages,
      });
    } catch {
      // keep the current page rendered; the button simply stops spinning
    } finally {
      setAppending(false);
    }
  };

  const resetFilters = () => {
    setGenre("");
    setYear("");
    setSort("popularity");
    setQInput("");
    setQ("");
  };

  const genreLabel = (g: string) => (lang === "ar" ? GENRES_AR[g] || g : g);
  const titleName = type === "movie" ? t("discover.moviesTitle") : t("discover.seriesTitle");

  return (
    <div data-testid={`view-${type}s`}>
      {/* ── Atmospheric page intro ── */}
      <header className="relative overflow-hidden border-b border-white/8">
        <FallbackImage
          candidates={[]}
          fallback={posterFor(`tvora-discovery-${type}`, titleName, "TVORA")}
          alt=""
          priority
          className="absolute inset-0 h-full w-full opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070708] via-[#070708]/55 to-[#070708]/20" />
        <div className="tv-grain absolute inset-0" />
        <div className="relative mx-auto max-w-[1600px] px-4 pb-12 pt-32 md:px-8 md:pb-16 md:pt-40 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
          >
            <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9fb7cb]">
              <span className="inline-block h-px w-8 bg-gradient-to-r from-[#9fb7cb] to-transparent" aria-hidden />
              {type === "movie" ? t("nav.movies") : t("nav.series")}
            </p>
            <h1 className="tv-title-glow text-3xl font-extrabold tracking-tight text-white md:text-5xl">{titleName}</h1>
            <p className="mt-2 max-w-xl text-sm text-white/55">{t("tagline")}</p>
          </motion.div>
        </div>
      </header>

      {/* ── Sticky filter bar — transparent until stuck, then glass ── */}
      <div
        ref={barRef}
        data-testid="filter-bar"
        className={cn(
          "sticky top-16 z-30 border-b transition-[background-color,border-color,box-shadow] duration-300 md:top-[72px]",
          stuck
            ? "border-white/10 bg-[#0a0a0c]/85 shadow-[0_20px_44px_-26px_rgba(0,0,0,0.95)] backdrop-blur-xl"
            : "border-transparent bg-transparent"
        )}
      >
        <div className="mx-auto max-w-[1600px] px-4 md:px-8 lg:px-12">
          {/* Row: mobile filter toggle + search (mobile) / chips + selects + search (desktop) */}
          <div className="flex items-center gap-2 py-2.5">
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              aria-expanded={showFilters}
              aria-controls="discovery-filter-panel"
              className="tv-focusable inline-flex h-11 items-center gap-2 rounded-md border border-white/15 px-4 text-sm font-bold text-white/85 transition hover:border-white/40 md:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
              {t("discover.filter")}
              {activeCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-extrabold text-black">
                  {activeCount}
                </span>
              )}
            </button>

            {/* Desktop genre chips */}
            <div className="tv-no-scrollbar hidden min-w-0 flex-1 items-center gap-1.5 overflow-x-auto md:flex" role="group" aria-label={t("discover.genre")}>
              <Chip active={genre === ""} onClick={() => setGenre("")} layoutId="discover-chip-desktop">
                {t("discover.all")}
              </Chip>
              {GENRE_LIST.map((g) => (
                <Chip key={g} active={genre === g} onClick={() => setGenre(genre === g ? "" : g)} layoutId="discover-chip-desktop">
                  {genreLabel(g)}
                </Chip>
              ))}
            </div>

            {/* Desktop selects */}
            <div className="hidden items-center gap-2 md:flex">
              <SelectDark label={t("discover.year")} value={year} onChange={setYear} className="w-28">
                <option value="">{t("discover.allYears")}</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </SelectDark>
              <SelectDark label={t("discover.sort")} value={sort} onChange={setSort} className="w-44">
                <option value="popularity">{t("discover.popularity")}</option>
                <option value="rating">{t("discover.rating")}</option>
                <option value="release">{t("discover.releaseDate")}</option>
                <option value="title">{t("discover.titleAZ")}</option>
              </SelectDark>
            </div>

            {/* Search (always visible) */}
            <div className="relative ms-auto w-full max-w-52 sm:max-w-60 md:ms-0">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" aria-hidden />
              <input
                type="search"
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder={t("discover.searchWithin")}
                aria-label={t("discover.searchWithin")}
                className="tv-focusable h-11 w-full rounded-md border border-white/12 bg-[#121216] ps-9 pe-9 text-sm text-white/85 outline-none placeholder:text-white/30 md:h-9"
              />
              {qInput && (
                <button
                  type="button"
                  onClick={() => setQInput("")}
                  aria-label={t("search.clear")}
                  className="tv-focusable absolute end-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-white/45 transition hover:text-white"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              )}
            </div>
          </div>

          {/* Mobile expandable filter panel — 44px touch targets */}
          {showFilters && (
            <div id="discovery-filter-panel" className="space-y-3 border-t border-white/8 py-3 md:hidden">
              <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("discover.genre")}>
                <Chip active={genre === ""} onClick={() => setGenre("")} layoutId="discover-chip-mobile">
                  {t("discover.all")}
                </Chip>
                {GENRE_LIST.map((g) => (
                  <Chip key={g} active={genre === g} onClick={() => setGenre(genre === g ? "" : g)} layoutId="discover-chip-mobile">
                    {genreLabel(g)}
                  </Chip>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <SelectDark label={t("discover.year")} value={year} onChange={setYear}>
                  <option value="">{t("discover.allYears")}</option>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </SelectDark>
                <SelectDark label={t("discover.sort")} value={sort} onChange={setSort}>
                  <option value="popularity">{t("discover.popularity")}</option>
                  <option value="rating">{t("discover.rating")}</option>
                  <option value="release">{t("discover.releaseDate")}</option>
                  <option value="title">{t("discover.titleAZ")}</option>
                </SelectDark>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Results ── */}
      <main className="mx-auto max-w-[1600px] px-4 pb-20 pt-6 md:px-8 md:pt-8 lg:px-12">
        {failed ? (
          <ErrorState onRetry={() => setRetry((n) => n + 1)} />
        ) : stale ? (
          <SkeletonGrid />
        ) : loaded.items.length === 0 ? (
          <EmptyState
            title={t("discover.empty")}
            hint={t("discover.emptyHint")}
            action={
              <button
                type="button"
                onClick={resetFilters}
                className="tv-focusable rounded-md border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:border-white/40 hover:text-white"
              >
                {t("discover.reset")}
              </button>
            }
          />
        ) : (
          <>
            <p className="mb-4 text-xs font-semibold text-white/45" role="status" aria-live="polite">
              {loaded.total} {t("discover.results")}
            </p>
            <Stagger className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {loaded.items.map((title, i) => (
                <motion.div key={title.id} layout variants={staggerItem}>
                  <GridCard title={title} priority={i < 6} />
                </motion.div>
              ))}
            </Stagger>
            {loaded.page < loaded.pages && (
              <div className="mt-10 flex justify-center">
                <button
                  type="button"
                  data-testid="load-more"
                  onClick={() => void loadMore()}
                  disabled={appending}
                  className="tv-focusable inline-flex h-11 items-center gap-2 rounded-md border border-white/15 px-6 text-sm font-bold text-white/85 transition hover:border-white/40 disabled:opacity-50"
                >
                  {appending ? (
                    <span
                      className="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-white"
                      aria-hidden
                    />
                  ) : null}
                  {appending ? t("misc.loading") : t("discover.loadMore")}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export function MoviesView() {
  return <DiscoveryBase type="movie" />;
}

export function SeriesView() {
  return <DiscoveryBase type="series" />;
}

// ─── Grid card (fluid-width sibling of shared TitleCard) ─────────────────────

function GridCard({ title, priority = false }: { title: TitleDTO; priority?: boolean }) {
  const { t, lang } = useT();
  const navigate = useAppStore((s) => s.navigate);
  const { has, toggle } = useMyList();
  const inList = has(title.id);
  const name = localized(title, lang);
  const genres = parseGenres(title.genres)
    .slice(0, 2)
    .map((g) => (lang === "ar" ? GENRES_AR[g] || g : g));

  // Netflix-style hover video preview — same 650ms pointer-dwell pattern as
  // TitleCard (absolute overlay inside overflow-hidden → cannot disturb the
  // Stagger/layout wrappers; HoverPreview owns its own gate, task 6-b).
  const [previewActive, setPreviewActive] = useState(false);
  const dwellTimer = useRef<number | null>(null);

  const startPreviewDwell = useCallback(() => {
    if (dwellTimer.current != null) return;
    dwellTimer.current = window.setTimeout(() => {
      dwellTimer.current = null;
      setPreviewActive(true);
    }, 650);
  }, []);

  const cancelPreview = useCallback(() => {
    if (dwellTimer.current != null) {
      window.clearTimeout(dwellTimer.current);
      dwellTimer.current = null;
    }
    setPreviewActive(false);
  }, []);

  useEffect(() => {
    return () => {
      if (dwellTimer.current != null) window.clearTimeout(dwellTimer.current);
    };
  }, []);

  // Reveal/reordering is owned by the Stagger wrapper (staggerItem + layout).
  return (
    <article className="group/card relative" data-testid="title-card">
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          cancelPreview(); // stop the dwell timer even though the view changes anyway
          navigate({ name: "title", id: title.id });
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            navigate({ name: "title", id: title.id });
          }
        }}
        onMouseEnter={startPreviewDwell}
        onMouseLeave={cancelPreview}
        aria-label={name}
        className="tv-focusable relative aspect-[2/3] w-full cursor-pointer overflow-hidden rounded-md border border-white/8 bg-[#101012] shadow-[0_10px_30px_-12px_rgba(0,0,0,0.9)] outline-none transition-[transform,border-color,box-shadow] duration-500 ease-out hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_24px_50px_-16px_rgba(0,0,0,0.95)] focus-visible:-translate-y-1"
        style={{ transformPerspective: 900 } as React.CSSProperties}
      >
        <FallbackImage
          candidates={[title.posterUrl]}
          fallback={posterFor(title.id + name, name, `${title.type === "movie" ? "FILM" : "SERIES"} · ${title.releaseYear}`)}
          alt={name}
          priority={priority}
          className="h-full w-full transition-transform duration-700 ease-out group-hover/card:scale-[1.06]"
        />
        {/* Netflix-style hover video preview — z: 5 < 6 < sheen-less overlays stay above */}
        <HoverPreview active={previewActive} />
        {/* Hover gradient + quick meta (desktop) — z-[6] keeps it above the preview video */}
        <div className="absolute inset-0 z-[6] hidden flex-col justify-end bg-gradient-to-t from-black/90 via-black/25 to-transparent opacity-0 transition-opacity duration-300 group-hover/card:opacity-100 sm:flex">
          <div className="space-y-1.5 p-3">
            <Rating value={title.rating} />
            <p className="line-clamp-1 text-[11px] text-white/70">
              {title.releaseYear}
              {genres.length > 0 ? ` · ${genres.join(" · ")}` : ""}
            </p>
          </div>
        </div>
        {/* Corner badges (kept above the preview video) */}
        <div className="absolute top-2 z-[6] flex gap-1.5" style={{ insetInlineStart: 8 }}>
          {title.isNew && (
            <span className="rounded-sm bg-white px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider text-black">
              {t("misc.new")}
            </span>
          )}
          {title.premium && (
            <span className="rounded-sm border border-[#d8c9a3]/40 bg-black/60 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-[#d8c9a3]">
              {t("misc.premium")}
            </span>
          )}
        </div>
        {/* Type chip (kept above the preview video) */}
        <div className="absolute bottom-2 z-[6]" style={{ insetInlineStart: 8 }}>
          <span className="inline-flex items-center gap-1 rounded-sm border border-white/12 bg-black/50 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-white/70 backdrop-blur-sm">
            {title.type === "movie" ? (
              <Film className="h-2.5 w-2.5" aria-hidden />
            ) : (
              <Tv className="h-2.5 w-2.5" aria-hidden />
            )}
            {title.type === "movie" ? (lang === "ar" ? "فيلم" : "MOVIE") : lang === "ar" ? "مسلسل" : "SERIES"}
          </span>
        </div>
      </div>

      {/* Meta under poster */}
      <div className="mt-2 flex items-start justify-between gap-1 px-0.5">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => navigate({ name: "title", id: title.id })}
            className="tv-focusable block max-w-full truncate text-start text-[13px] font-semibold text-white/90 transition hover:text-white"
          >
            {name}
          </button>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-[11px] text-white/45">{title.releaseYear}</span>
            <Rating value={title.rating} />
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void toggle(title);
          }}
          aria-label={inList ? t("hero.inList") : t("hero.addToList")}
          aria-pressed={inList}
          className={cn(
            "tv-focusable mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition",
            inList
              ? "border-[#9fb7cb]/50 bg-[#9fb7cb]/15 text-[#cfe0ee]"
              : "border-white/15 text-white/60 hover:border-white/40 hover:text-white"
          )}
        >
          {inList ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Plus className="h-3.5 w-3.5" aria-hidden />}
        </button>
      </div>
    </article>
  );
}

// ─── Small filter primitives ──────────────────────────────────────────────────

function Chip({ active, onClick, children, layoutId }: { active: boolean; onClick: () => void; children: React.ReactNode; layoutId: string }) {
  const reduced = useReducedMotion() ?? false;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "tv-focusable relative h-11 shrink-0 rounded-full border px-4 text-[13px] font-semibold transition-colors duration-300 md:h-9 md:px-3.5",
        active
          ? "border-white bg-white text-black"
          : "border-white/12 bg-white/[0.03] text-white/65 hover:border-white/35 hover:text-white"
      )}
    >
      {active && !reduced && (
        <motion.span
          layoutId={layoutId}
          aria-hidden
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className="absolute inset-0 rounded-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.28)]"
        />
      )}
      <span className="relative z-10">{children}</span>
    </button>
  );
}

function SelectDark({
  label,
  value,
  onChange,
  children,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="tv-focusable h-11 w-full appearance-none rounded-md border border-white/12 bg-[#121216] pe-8 ps-3 text-sm text-white/85 outline-none md:h-9"
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute end-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
        aria-hidden
      />
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div aria-hidden>
      <div className="mb-4 h-3 w-24 rounded tv-shimmer" />
      <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i}>
            <div className="tv-shimmer aspect-[2/3] w-full rounded-md border border-white/6" />
            <div className="mt-2 h-3 w-3/4 rounded tv-shimmer" />
            <div className="mt-1.5 h-2.5 w-1/2 rounded tv-shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}

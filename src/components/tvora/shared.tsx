"use client";
// TVORA shared UI primitives — the design contract used across all views.
// (useCallback/useEffect/useRef/useState are also used by TitleCard's hover-preview dwell logic.)
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, Check, Star, Film, Tv, Clapperboard, Inbox } from "lucide-react";
import { toast } from "sonner";
import { makeT } from "@/lib/i18n";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { localized, parseGenres, GENRES_AR, type Lang, type TitleDTO } from "@/lib/types";
import { posterFor } from "@/lib/artwork";
import { EASE_OUT_EXPO, viewportOnce } from "@/lib/motion";
import { SplitWords, PulseRing } from "./motion-fx";
import { HoverPreview } from "./hover-preview";
import { cn } from "@/lib/utils";
import { FallbackImage } from "./fallback-image";

// ─── i18n hook ────────────────────────────────────────────────────────────────

export function useT() {
  const lang = useAppStore((s) => s.lang);
  return { t: makeT(lang), lang, dir: lang === "ar" ? ("rtl" as const) : ("ltr" as const) };
}

// ─── Motion reveal wrapper ────────────────────────────────────────────────────

export function Reveal({
  children,
  className,
  delay = 0,
  y = 26,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewportOnce}
      transition={{ duration: 0.6, ease: EASE_OUT_EXPO, delay }}
    >
      {children}
    </motion.div>
  );
}

// ─── Poster (image or procedural artwork) ─────────────────────────────────────

export function Poster({
  title,
  lang,
  className,
  sizes = "(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 200px",
  priority = false,
}: {
  title: Pick<TitleDTO, "id" | "titleAr" | "titleEn" | "posterUrl" | "releaseYear" | "type">;
  lang: Lang;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const name = lang === "ar" ? title.titleAr : title.titleEn;
  const sub = `${title.type === "movie" ? "FILM" : "SERIES"} · ${title.releaseYear}`;
  const fallback = posterFor(title.id + name, name, sub);
  return (
    <FallbackImage
      key={title.id}
      candidates={[title.posterUrl, fallback]}
      fallback={fallback}
      alt={name}
      sizes={sizes}
      priority={priority}
      className={cn("h-full w-full", className)}
    />
  );
}

// ─── Rating ───────────────────────────────────────────────────────────────────

export function Rating({ value, className }: { value?: number | null; className?: string }) {
  if (value == null) return null;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs text-white/80", className)}>
      <Star className="h-3 w-3 fill-[#d8c9a3] text-[#d8c9a3]" aria-hidden />
      <span className="font-semibold">{value.toFixed(1)}</span>
    </span>
  );
}

// ─── Badges ───────────────────────────────────────────────────────────────────

export function TypeBadge({ type, lang }: { type: string; lang: Lang }) {
  const { t } = useT();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm border border-white/12 bg-black/45 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/75 backdrop-blur-sm">
      {type === "movie" ? <Film className="h-3 w-3" aria-hidden /> : <Tv className="h-3 w-3" aria-hidden />}
      {type === "movie" ? t("hero.featuredMovie") : t("hero.featuredSeries")}
    </span>
  );
}

export function DemoTag({ className }: { className?: string }) {
  const { t } = useT();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border border-[#d8c9a3]/25 bg-[#d8c9a3]/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#d8c9a3]/90",
        className
      )}
      title={t("footer.demoNotice")}
    >
      {t("misc.demo")}
    </span>
  );
}

export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex h-2 w-2", className)} aria-hidden>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#e5484d] opacity-60" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#e5484d]" />
    </span>
  );
}

// ─── Title card ───────────────────────────────────────────────────────────────

export function TitleCard({ title, index = 0, priority = false }: { title: TitleDTO; index?: number; priority?: boolean }) {
  const { t, lang, dir } = useT();
  const navigate = useAppStore((s) => s.navigate);
  const { has, toggle } = useMyList();
  const inList = has(title.id);
  const name = lang === "ar" ? title.titleAr : title.titleEn;
  const genres = parseGenres(title.genres as unknown);
  const genreLabel = (g: string) => (lang === "ar" ? GENRES_AR[g] || g : g);
  const side = dir === "rtl" ? "right" : "left";

  // Netflix-style hover video preview — 650ms pointer dwell on the poster
  // (desktop pointer devices only; HoverPreview owns its own gate, task 6-b).
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

  return (
    <motion.article
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewportOnce}
      transition={{ duration: 0.5, ease: EASE_OUT_EXPO, delay: Math.min(index * 0.05, 0.4) }}
      className="group/card relative w-[150px] shrink-0 sm:w-[168px] lg:w-[182px]"
      data-testid="title-card"
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          cancelPreview(); // stop the dwell timer even though the view changes anyway
          navigate({ name: "title", id: title.id });
        }}
        onKeyDown={(e) => e.key === "Enter" && navigate({ name: "title", id: title.id })}
        onMouseEnter={startPreviewDwell}
        onMouseLeave={cancelPreview}
        aria-label={name}
        className="tv-focusable relative aspect-[2/3] w-full cursor-pointer overflow-hidden rounded-md border border-white/8 bg-[#101012] shadow-[0_10px_30px_-12px_rgba(0,0,0,0.9)] outline-none transition-[transform,border-color,box-shadow] duration-500 ease-out hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_24px_50px_-16px_rgba(0,0,0,0.95)] focus-visible:-translate-y-1 [transform-perspective:900px]"
      >
        <Poster
          title={title}
          lang={lang}
          priority={priority}
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 190px"
          className="transition-transform duration-700 ease-out group-hover/card:scale-[1.06]"
        />
        {/* Netflix-style hover video preview — fades in above the poster,
            below the sheen band / gradient / badges (z: 5 < 6 < 10) */}
        <HoverPreview active={previewActive} />
        {/* Motion sheen band (sweeps across on hover, CSS-only) */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-md">
          <div className="tv-card-sheen absolute inset-y-0 start-0 w-1/2" />
        </div>
        {/* Hover gradient + quick actions (desktop) — z-[6] keeps it above the preview video */}
        <div className="absolute inset-0 z-[6] hidden flex-col justify-end bg-gradient-to-t from-black/90 via-black/25 to-transparent opacity-0 transition-opacity duration-300 group-hover/card:opacity-100 sm:flex">
          <div className="space-y-1.5 p-3">
            <Rating value={title.rating} />
            <p className="line-clamp-1 text-[11px] text-white/70">
              {title.releaseYear} · {genres.slice(0, 2).map(genreLabel).join(" · ")}
            </p>
          </div>
        </div>
        {/* Corner badges (kept above the preview video) */}
        <div className="absolute top-2 z-[6] flex gap-1.5" style={{ insetInlineStart: 8 }}>
          {title.isNew && (
            <span className="rounded-sm bg-white px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider text-black">{t("misc.new")}</span>
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
            {title.type === "movie" ? <Film className="h-2.5 w-2.5" aria-hidden /> : <Tv className="h-2.5 w-2.5" aria-hidden />}
            {title.type === "movie" ? (lang === "ar" ? "فيلم" : "MOVIE") : (lang === "ar" ? "مسلسل" : "SERIES")}
          </span>
        </div>
      </div>

      {/* Meta under poster — always visible (mobile-friendly, no hover dependency) */}
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
          {inList ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
        </button>
      </div>
    </motion.article>
  );
}

// ─── Horizontal row with arrows (RTL-aware) ───────────────────────────────────

export function Row({
  title,
  subtitle,
  action,
  children,
  icon,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const dir = useAppStore((s) => (s.lang === "ar" ? "rtl" : "ltr"));
  const [canScroll, setCanScroll] = useState({ start: false, end: true });

  const update = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const pos = Math.abs(el.scrollLeft);
    setCanScroll({ start: pos > 8, end: pos < max - 8 });
  }, []);

  useEffect(() => {
    update();
    const el = scroller.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const nudge = (sign: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: sign * Math.max(320, el.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <section className="group/row relative py-5" data-testid="content-row">
      <div className="mb-3 flex items-end justify-between gap-3 px-4 md:px-8 lg:px-12">
        <div>
          <h2 className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-white/95 md:text-xl">
            {icon}
            {title}
          </h2>
          {subtitle && <p className="mt-0.5 text-xs text-white/45">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {action}
          <div className="hidden items-center gap-1.5 md:flex">
            <button
              type="button"
              onClick={() => nudge(dir === "rtl" ? 1 : -1)}
              disabled={dir === "rtl" ? !canScroll.start : !canScroll.start}
              aria-label={dir === "rtl" ? "scroll right" : "scroll left"}
              className={cn(
                "tv-focusable flex h-8 w-8 items-center justify-center rounded-full border border-white/12 text-white/70 transition hover:border-white/35 hover:text-white disabled:opacity-25"
              )}
            >
              {dir === "rtl" ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => nudge(dir === "rtl" ? -1 : 1)}
              disabled={dir === "rtl" ? !canScroll.end : !canScroll.end}
              aria-label={dir === "rtl" ? "scroll left" : "scroll right"}
              className={cn(
                "tv-focusable flex h-8 w-8 items-center justify-center rounded-full border border-white/12 text-white/70 transition hover:border-white/35 hover:text-white disabled:opacity-25"
              )}
            >
              {dir === "rtl" ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
      <div
        ref={scroller}
        dir={dir}
        className="tv-no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-pl-4 px-4 pb-2 md:gap-4 md:px-8 lg:px-12"
      >
        {children}
      </div>
    </section>
  );
}

// ─── Section header (page-level) ──────────────────────────────────────────────

export function SectionHeader({
  kicker,
  title,
  sub,
  action,
}: {
  kicker?: string;
  title: string;
  sub?: string;
  action?: React.ReactNode;
}) {
  const { dir } = useT();
  return (
    <Reveal className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {kicker && (
          <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9fb7cb]">
            <motion.span
              aria-hidden
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={viewportOnce}
              transition={{ duration: 0.7, ease: EASE_OUT_EXPO, delay: 0.05 }}
              className="inline-block h-px w-8 bg-gradient-to-r from-[#9fb7cb] to-transparent"
              style={{ transformOrigin: dir === "rtl" ? "right" : "left" }}
            />
            {kicker}
          </p>
        )}
        <SplitWords
          as="h1"
          text={title}
          stagger={0.045}
          className="text-2xl font-extrabold tracking-tight text-white md:text-4xl tv-title-glow"
        />
        {sub && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOnce}
            transition={{ duration: 0.6, ease: EASE_OUT_EXPO, delay: 0.3 }}
            className="mt-2 max-w-2xl text-sm text-white/55"
          >
            {sub}
          </motion.p>
        )}
      </div>
      {action}
    </Reveal>
  );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

export function CardSkeleton() {
  return (
    <div className="w-[150px] shrink-0 sm:w-[168px] lg:w-[182px]" aria-hidden>
      <div className="tv-shimmer aspect-[2/3] w-full rounded-md border border-white/6" />
      <div className="mt-2 h-3 w-3/4 rounded tv-shimmer" />
      <div className="mt-1.5 h-2.5 w-1/2 rounded tv-shimmer" />
    </div>
  );
}

export function RowSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="py-5">
      <div className="mb-3 px-4 md:px-8 lg:px-12">
        <div className="h-5 w-40 rounded tv-shimmer" />
      </div>
      <div className="flex gap-3 px-4 md:px-8 lg:px-12">
        {Array.from({ length: count }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function ViewLoader({ label }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4" role="status" aria-live="polite">
      <div className="relative flex h-12 w-12 items-center justify-center text-[#9fb7cb]">
        <PulseRing color="#9fb7cb" className="absolute h-12 w-12" />
        <Clapperboard className="h-7 w-7 animate-pulse text-[#9fb7cb]/70" aria-hidden />
      </div>
      <p className="text-sm text-white/50">{label || "…"}</p>
      <span className="sr-only">Loading</span>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

export function EmptyState({
  title,
  hint,
  action,
  icon,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
      className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-white/10 bg-white/[0.015] px-6 py-14 text-center"
      data-testid="empty-state"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-[#121216]">
        {icon || <Inbox className="h-5 w-5 text-white/40" aria-hidden />}
      </div>
      <h3 className="text-base font-bold text-white/85">{title}</h3>
      {hint && <p className="max-w-sm text-sm text-white/45">{hint}</p>}
      {action}
    </motion.div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  const { t } = useT();
  return (
    <EmptyState
      title={t("misc.error")}
      hint={t("misc.retry")}
      action={
        onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="tv-focusable rounded-md border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:border-white/40 hover:text-white"
          >
            {t("misc.retry")}
          </button>
        ) : undefined
      }
    />
  );
}

// ─── My List hook (guest + signed-in sync) ────────────────────────────────────

export function useMyList() {
  const listIds = useAppStore((s) => s.listIds);
  const setListIds = useAppStore((s) => s.setListIds);
  const { t } = useT();

  const has = useCallback((id: string) => listIds.includes(id), [listIds]);

  const toggle = useCallback(
    async (title: Pick<TitleDTO, "id">) => {
      const inList = useAppStore.getState().listIds.includes(title.id);
      const next = inList
        ? useAppStore.getState().listIds.filter((x) => x !== title.id)
        : [...useAppStore.getState().listIds, title.id];
      setListIds(next);
      toast(inList ? t("list.removed") : t("list.added"), {
        description: undefined,
        duration: 1800,
      });
      try {
        if (inList) await api.listRemove(title.id);
        else await api.listAdd(title.id);
      } catch {
        // optimistic local state remains usable for guests
      }
    },
    [setListIds, t]
  );

  return { has, toggle, listIds };
}

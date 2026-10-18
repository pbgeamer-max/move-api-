"use client";
// MY LIST + CONTINUE WATCHING — personal library experiences.
// MyList: filter chips, optimistic remove with undo toast, skeleton grid.
// Continue: cinematic resume cards with progress, episode badge, remove.
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Bookmark, History, Play, Star, Film, Tv } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { deviceId, useAppStore } from "@/lib/store";
import { localized, parseGenres, GENRES_AR, type ProgressDTO, type TitleDTO } from "@/lib/types";
import { posterFor } from "@/lib/artwork";
import { useT, SectionHeader, EmptyState, Rating } from "../shared";
import { Stagger, staggerItem } from "../motion-fx";
import { cn } from "@/lib/utils";
import { SmartImage } from "../smart-image";

type ListFilter = "all" | "movie" | "series";

// ─── My List ──────────────────────────────────────────────────────────────────

export function MyListView() {
  const { t, lang } = useT();
  const navigate = useAppStore((s) => s.navigate);
  const setListIds = useAppStore((s) => s.setListIds);
  const [items, setItems] = useState<TitleDTO[] | null>(null);
  const [filter, setFilter] = useState<ListFilter>("all");

  useEffect(() => {
    document.title = `${t("list.title")} | TVORA`;
  }, [t]);

  useEffect(() => {
    api
      .listGet()
      .then((res) => setItems(res.items))
      .catch(() => setItems([]));
  }, []);

  const restoreItem = useCallback(
    (title: TitleDTO) => {
      setItems((prev) => {
        if (!prev || prev.some((x) => x.id === title.id)) return prev;
        return [...prev, title];
      });
      const cur = useAppStore.getState().listIds;
      if (!cur.includes(title.id)) setListIds([...cur, title.id]);
      void api.listAdd(title.id).catch(() => {});
      toast(t("list.added"), { duration: 1800 });
    },
    [setListIds, t]
  );

  const removeTitle = useCallback(
    async (title: TitleDTO) => {
      const snapshot = items ?? [];
      // optimistic: hide immediately + sync store
      setItems(snapshot.filter((x) => x.id !== title.id));
      setListIds(useAppStore.getState().listIds.filter((x) => x !== title.id));
      try {
        await api.listRemove(title.id);
        toast(t("list.removed"), {
          duration: 4200,
          action: { label: t("list.undo"), onClick: () => restoreItem(title) },
        });
      } catch {
        // revert on failure
        setItems(snapshot);
        const cur = useAppStore.getState().listIds;
        if (!cur.includes(title.id)) setListIds([...cur, title.id]);
        toast.error(t("list.removeFailed"));
      }
    },
    [items, setListIds, t, restoreItem]
  );

  const all = items ?? [];
  const filtered = filter === "all" ? all : all.filter((x) => x.type === filter);
  const chips: Array<{ key: ListFilter; label: string; count: number }> = [
    { key: "all", label: t("list.all"), count: all.length },
    { key: "movie", label: t("list.movies"), count: all.filter((x) => x.type === "movie").length },
    { key: "series", label: t("list.series"), count: all.filter((x) => x.type === "series").length },
  ];

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-16 pt-24 md:px-8 md:pt-28 lg:px-12" data-testid="mylist-view">
      <SectionHeader kicker={t("nav.myList")} title={t("list.title")} sub={t("list.sub")} />

      {items === null ? (
        <GridSkeleton />
      ) : all.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="h-5 w-5 text-white/40" aria-hidden />}
          title={t("list.empty")}
          hint={t("list.emptyHint")}
          action={
            <button
              type="button"
              onClick={() => navigate("movies")}
              className="tv-focusable mt-1 rounded-md bg-white px-5 py-2 text-sm font-extrabold text-black transition hover:bg-[#e8eef4]"
            >
              {t("list.discover")}
            </button>
          }
        />
      ) : (
        <>
          {/* Filter chips */}
          <div className="mb-6 flex flex-wrap items-center gap-2" role="group" aria-label={t("list.title")}>
            {chips.map((chip) => {
              const active = filter === chip.key;
              return (
                <button
                  key={chip.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(chip.key)}
                  className={cn(
                    "tv-focusable flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-bold transition",
                    active ? "border-white bg-white text-black" : "border-white/12 text-white/60 hover:border-white/35 hover:text-white"
                  )}
                >
                  {chip.label}
                  <span
                    className={cn(
                      "inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[10px] font-extrabold tabular-nums",
                      active ? "bg-black/15 text-black" : "bg-white/10 text-white/70"
                    )}
                  >
                    {chip.count}
                  </span>
                </button>
              );
            })}
          </div>

          {filtered.length === 0 ? (
            <EmptyState title={t("discover.empty")} hint={t("discover.emptyHint")} icon={<Film className="h-5 w-5 text-white/40" aria-hidden />} />
          ) : (
            <Stagger
              className="grid grid-cols-2 justify-center gap-x-4 gap-y-7 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] lg:gap-x-5"
              stagger={0.05}
            >
              <AnimatePresence mode="popLayout">
                {filtered.map((title, i) => (
                  <ListCard key={title.id} title={title} index={i} lang={lang} onRemove={() => void removeTitle(title)} />
                ))}
              </AnimatePresence>
            </Stagger>
          )}
        </>
      )}
    </div>
  );
}

function ListCard({
  title,
  index,
  lang,
  onRemove,
}: {
  title: TitleDTO;
  index: number;
  lang: "ar" | "en";
  onRemove: () => void;
}) {
  const navigate = useAppStore((s) => s.navigate);
  const { t } = useT();
  const name = lang === "ar" ? title.titleAr : title.titleEn;
  const posterFallback = posterFor(title.id + name, name, `${title.type === "movie" ? "FILM" : "SERIES"} · ${title.releaseYear}`);
  const genres = parseGenres(title.genres as unknown);
  const genreLabel = (g: string) => (lang === "ar" ? GENRES_AR[g] || g : g);

  return (
    <motion.article
      variants={staggerItem}
      exit={{
        opacity: 0,
        scale: 0.88,
        transition: { duration: 0.24, ease: "easeIn" },
      }}
      className="group/card relative"
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => navigate({ name: "title", id: title.id })}
        onKeyDown={(e) => e.key === "Enter" && navigate({ name: "title", id: title.id })}
        aria-label={name}
        className="tv-focusable relative aspect-[2/3] w-full cursor-pointer overflow-hidden rounded-md border border-white/8 bg-[#101012] shadow-[0_10px_30px_-12px_rgba(0,0,0,0.9)] outline-none transition-[transform,border-color,box-shadow] duration-500 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_24px_50px_-16px_rgba(0,0,0,0.95)]"
      >
        <SmartImage
          src={title.posterUrl || posterFallback}
          fallback={posterFallback}
          alt={name}
          loading={index < 6 ? "eager" : "lazy"}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-[1.06]"
        />
        {/* Hover meta gradient */}
        <div className="absolute inset-0 hidden flex-col justify-end bg-gradient-to-t from-black/90 via-black/25 to-transparent opacity-0 transition-opacity duration-300 group-hover/card:opacity-100 sm:flex">
          <div className="space-y-1 p-3">
            <Rating value={title.rating} />
            <p className="line-clamp-1 text-[11px] text-white/70">
              {title.releaseYear} · {genres.slice(0, 2).map(genreLabel).join(" · ")}
            </p>
          </div>
        </div>
        {/* Type chip */}
        <div className="absolute bottom-2 start-2">
          <span className="inline-flex items-center gap-1 rounded-sm border border-white/12 bg-black/50 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-white/70 backdrop-blur-sm">
            {title.type === "movie" ? <Film className="h-2.5 w-2.5" aria-hidden /> : <Tv className="h-2.5 w-2.5" aria-hidden />}
            {title.type === "movie" ? (lang === "ar" ? "فيلم" : "MOVIE") : lang === "ar" ? "مسلسل" : "SERIES"}
          </span>
        </div>
      </div>

      {/* Remove — always visible on touch, hover-revealed on desktop */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label={`${t("list.remove")} — ${name}`}
        className="tv-focusable absolute end-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white/80 backdrop-blur-sm transition hover:border-[#e5484d]/60 hover:bg-[#e5484d]/80 hover:text-white sm:opacity-0 sm:transition-opacity sm:group-hover/card:opacity-100 sm:focus-visible:opacity-100"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>

      <div className="mt-2 px-0.5">
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
    </motion.article>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 justify-center gap-x-4 gap-y-7 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] lg:gap-x-5" aria-hidden>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i}>
          <div className="tv-shimmer aspect-[2/3] w-full rounded-md border border-white/6" />
          <div className="mt-2 h-3 w-3/4 rounded tv-shimmer" />
          <div className="mt-1.5 h-2.5 w-1/2 rounded tv-shimmer" />
        </div>
      ))}
    </div>
  );
}

// ─── Continue Watching ────────────────────────────────────────────────────────

export function ContinueView() {
  const { t, lang } = useT();
  const navigate = useAppStore((s) => s.navigate);
  const [items, setItems] = useState<ProgressDTO[] | null>(null);

  useEffect(() => {
    document.title = `${t("cw.title")} | TVORA`;
  }, [t]);

  useEffect(() => {
    api
      .progressGet()
      .then((res) => setItems(res.items))
      .catch(() => setItems([]));
  }, []);

  const removeProgress = useCallback(
    async (p: ProgressDTO) => {
      const snapshot = items ?? [];
      setItems(snapshot.filter((x) => !(x.titleId === p.titleId && x.episodeId === p.episodeId)));
      try {
        const res = await fetch(`/api/progress?titleId=${encodeURIComponent(p.titleId)}`, {
          method: "DELETE",
          headers: { "X-Device-Id": deviceId() },
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        toast(t("cw.removedToast"), { duration: 2200 });
      } catch {
        setItems(snapshot);
        toast.error(t("cw.removeFailed"));
      }
    },
    [items, t]
  );

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-16 pt-24 md:px-8 md:pt-28 lg:px-12" data-testid="continue-view">
      <SectionHeader kicker={t("nav.continueWatching")} title={t("cw.title")} sub={t("cw.sub")} />
      {items === null ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-hidden>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i}>
              <div className="tv-shimmer aspect-video w-full rounded-lg border border-white/6" />
              <div className="mt-2.5 h-3.5 w-2/3 rounded tv-shimmer" />
              <div className="mt-1.5 h-2.5 w-1/3 rounded tv-shimmer" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<History className="h-5 w-5 text-white/40" aria-hidden />}
          title={t("cw.empty")}
          hint={t("cw.emptyHint")}
          action={
            <button
              type="button"
              onClick={() => navigate("home")}
              className="tv-focusable mt-1 rounded-md bg-white px-5 py-2 text-sm font-extrabold text-black transition hover:bg-[#e8eef4]"
            >
              {t("nav.home")}
            </button>
          }
        />
      ) : (
        <Stagger className="grid gap-x-4 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" stagger={0.05}>
          <AnimatePresence mode="popLayout">
            {items.map((p, i) => (
              <ContinueCard key={p.titleId + (p.episodeId || "")} p={p} index={i} lang={lang} onRemove={() => void removeProgress(p)} />
            ))}
          </AnimatePresence>
        </Stagger>
      )}
    </div>
  );
}

function ContinueCard({
  p,
  index,
  lang,
  onRemove,
}: {
  p: ProgressDTO;
  index: number;
  lang: "ar" | "en";
  onRemove: () => void;
}) {
  const { t } = useT();
  const navigate = useAppStore((s) => s.navigate);
  const name = p.title ? localized(p.title, lang) : "—";
  const pct = p.durationSeconds > 0 ? Math.min(100, Math.round((p.positionSeconds / p.durationSeconds) * 100)) : 0;
  const backdropFallback = posterFor(p.titleId + name, name, p.title ? `${p.title.releaseYear}` : undefined);

  return (
    <motion.article
      variants={staggerItem}
      exit={{
        opacity: 0,
        scale: 0.92,
        transition: { duration: 0.22, ease: "easeIn" },
      }}
      className="group relative"
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => navigate({ name: "watch", id: p.titleId, ep: p.episodeId || undefined })}
        onKeyDown={(e) => e.key === "Enter" && navigate({ name: "watch", id: p.titleId, ep: p.episodeId || undefined })}
        aria-label={`${t("cw.resume")} — ${name}`}
        className="tv-focusable relative block aspect-video w-full cursor-pointer overflow-hidden rounded-lg border border-white/8 bg-[#101012] outline-none transition-[border-color,transform] duration-500 hover:-translate-y-1 hover:border-white/20"
      >
        <SmartImage
          src={p.title?.backdropUrl || p.title?.posterUrl || backdropFallback}
          fallback={backdropFallback}
          alt={name}
          loading={index < 4 ? "eager" : "lazy"}
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
        {/* Play overlay */}
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-12 w-12 scale-90 items-center justify-center rounded-full bg-white/90 text-black opacity-0 shadow-2xl transition duration-300 group-hover:scale-100 group-hover:opacity-100">
            <Play className="h-5 w-5 fill-black" aria-hidden />
          </span>
        </span>
        {/* Episode badge */}
        {p.episode && (
          <span
            dir="ltr"
            className="absolute start-2.5 top-2.5 rounded-sm border border-white/12 bg-black/60 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-[#cfe0ee] backdrop-blur-sm"
          >
            {`S${String(p.episode.seasonNumber).padStart(2, "0")}E${String(p.episode.number).padStart(2, "0")}`}
          </span>
        )}
        {/* Progress bar */}
        <span className="absolute inset-x-3 bottom-2.5 h-1 overflow-hidden rounded-full bg-white/20" aria-hidden>
          <span className="block h-full rounded-full bg-[#cfe0ee]" style={{ width: `${pct}%` }} />
        </span>
      </div>

      {/* Remove */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label={`${t("cw.remove")} — ${name}`}
        className="tv-focusable absolute end-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white/80 backdrop-blur-sm transition hover:border-[#e5484d]/60 hover:bg-[#e5484d]/80 hover:text-white sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>

      <div className="mt-2.5 flex items-start gap-2 px-0.5">
        <Star className="mt-0.5 h-3 w-3 shrink-0 text-[#d8c9a3]/70" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white/90">{name}</p>
          {p.episode && <p className="truncate text-xs text-white/45">{lang === "ar" ? p.episode.titleAr : p.episode.titleEn}</p>}
          <p className="mt-0.5 text-xs tabular-nums text-white/50">
            {t("cw.resume")} · {pct}%
          </p>
        </div>
      </div>
    </motion.article>
  );
}

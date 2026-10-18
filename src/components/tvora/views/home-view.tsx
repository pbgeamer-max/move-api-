"use client";
// HOME — immersive hero carousel + cinematic content rows.
// Full-bleed hero starts at the very top (transparent nav overlays it); a
// highlight ticker strip sits right under the hero; rows cascade in on scroll.
// A Continue Watching row is injected after Trending when the viewer has any
// saved progress.
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, History, Play, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { localized, type HomePayload, type ProgressDTO, type TitleDTO } from "@/lib/types";
import { backdropFor } from "@/lib/artwork";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { useAppStore } from "@/lib/store";
import { Row, RowSkeleton, TitleCard, useT, ErrorState, Reveal } from "../shared";
import { HeroCarousel } from "../hero-carousel";
import { Marquee } from "../motion-fx";
import { FallbackImage } from "../fallback-image";

export function HomeView() {
  const { t, lang } = useT();
  const navigate = useAppStore((s) => s.navigate);
  const firstRowRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<HomePayload | null>(null);
  const [failed, setFailed] = useState(false);
  const [reload, setReload] = useState(0);

  // Scroll cue — glide down to the first content row (auto behavior under reduced motion)
  const scrollToFirstRow = () => {
    const el = firstRowRef.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  useEffect(() => {
    document.title =
      lang === "ar" ? "TVORA — سينما. مسلسلات. قنوات TV مباشرة" : "TVORA — Cinema. Series. Live TV Channels.";
  }, [lang]);

  useEffect(() => {
    let alive = true;
    api
      .home()
      .then((d) => {
        if (!alive) return;
        setData(d);
        setFailed(false);
      })
      .catch(() => {
        if (!alive) return;
        setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [reload]);

  if (failed) {
    return (
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-48">
        <ErrorState onRetry={() => setReload((n) => n + 1)} />
      </div>
    );
  }

  if (!data) {
    return (
      <div data-testid="home-view" aria-busy="true">
        <div className="tv-shimmer h-[72vh] min-h-[520px] w-full md:h-[88vh]" />
        <RowSkeleton />
        <RowSkeleton />
      </div>
    );
  }

  const hasHero = data.hero.length > 0;

  return (
    <div className="pb-10" data-testid="home-view">
      {hasHero ? (
        <div className="relative">
          <HeroCarousel slides={data.hero} demoMode={data.demoMode.enabled} />
          {/* Scroll cue — mouse glyph + bobbing wheel dot, chevron floats (md+) */}
          <button
            type="button"
            onClick={scrollToFirstRow}
            aria-label={t("hero.scrollCue")}
            className="tv-focusable group absolute inset-x-0 bottom-6 z-20 mx-auto hidden w-max flex-col items-center gap-1.5 md:flex"
          >
            <span
              className="flex h-9 w-[22px] items-start justify-center rounded-full border border-white/25 bg-black/25 p-1.5 backdrop-blur-sm transition-colors duration-300 group-hover:border-white/55"
              aria-hidden
            >
              <span className="tv-scroll-dot h-1.5 w-1.5 rounded-full bg-[#cfe0ee]" />
            </span>
            <ChevronDown className="tv-float h-4 w-4 text-white/60" aria-hidden />
          </button>
        </div>
      ) : (
        <div className="h-24 md:h-28" aria-hidden />
      )}

      <TickerStrip />

      <div ref={firstRowRef} className="scroll-mt-28" aria-hidden />

      <Reveal delay={0.06}>
        <Row title={t("sections.trending")} action={<ViewAll onClick={() => navigate("movies")} />}>
          {data.trending.map((title, i) => (
            <TitleCard key={title.id} title={title} index={i} priority={i < 4} />
          ))}
        </Row>
      </Reveal>

      <ContinueWatchingRow />

      <ForYouRow />

      <Reveal delay={0.12}>
        <Row title={t("sections.newReleases")} action={<ViewAll onClick={() => navigate("movies")} />}>
          {data.newReleases.map((title, i) => (
            <TitleCard key={title.id} title={title} index={i} />
          ))}
        </Row>
      </Reveal>

      <Reveal delay={0.18}>
        <Row title={t("sections.arabic")} action={<ViewAll onClick={() => navigate("series")} />}>
          {data.arabicPicks.map((title, i) => (
            <TitleCard key={title.id} title={title} index={i} />
          ))}
        </Row>
      </Reveal>

      <Reveal delay={0.3}>
        <Row title={t("sections.topRated")} action={<ViewAll onClick={() => navigate("movies")} />}>
          {data.topRated.map((title, i) => (
            <TitleCard key={title.id} title={title} index={i} />
          ))}
        </Row>
      </Reveal>
    </div>
  );
}

function ViewAll({ onClick }: { onClick: () => void }) {
  const { t } = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      className="tv-focusable text-xs font-bold text-[#9fb7cb] transition hover:text-[#cfe0ee]"
    >
      {t("sections.viewAll")}
    </button>
  );
}

// ─── Continue Watching row (only when there is progress) ──────────────────────

function ContinueWatchingRow() {
  const { t } = useT();
  const [items, setItems] = useState<ProgressDTO[] | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .progressGet()
      .then((r) => {
        if (alive) setItems(r.items);
      })
      .catch(() => {
        if (alive) setItems([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (items === null || items.length === 0) return null;

  return (
    <Reveal delay={0.09}>
      <Row title={t("sections.continueWatching")} icon={<History className="h-5 w-5 text-[#9fb7cb]" aria-hidden />}>
        {items.slice(0, 12).map((p) => (
          <ProgressCard key={p.titleId + (p.episodeId ?? "")} progress={p} />
        ))}
      </Row>
    </Reveal>
  );
}

function ProgressCard({ progress: p }: { progress: ProgressDTO }) {
  const { t, lang } = useT();
  const navigate = useAppStore((s) => s.navigate);
  const name = p.title ? localized(p.title, lang) : "";
  const pct = p.durationSeconds ? Math.min(100, (p.positionSeconds / p.durationSeconds) * 100) : 0;
  const epLabel = p.episode ? ` · ${t("details.episode")} ${p.episode.number}` : "";
  const fallback = backdropFor(p.titleId + name, name, "TVORA");

  return (
    <motion.button
      type="button"
      onClick={() => navigate({ name: "watch", id: p.titleId, ep: p.episodeId || undefined })}
      className="tv-focusable group/card relative w-[260px] shrink-0 text-start sm:w-[300px]"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
      aria-label={`${name}${epLabel} — ${t("cw.resume")}`}
    >
      <div className="relative aspect-video overflow-hidden rounded-md border border-white/8 bg-[#101012] shadow-[0_10px_30px_-14px_rgba(0,0,0,0.9)] transition-[border-color] duration-300 group-hover/card:border-white/20">
        <FallbackImage
          candidates={p.title ? [p.title.backdropUrl, p.title.posterUrl] : []}
          fallback={fallback}
          alt={name}
          className="h-full w-full transition-transform duration-700 ease-out group-hover/card:scale-[1.05]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
        <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover/card:opacity-100">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-black shadow-lg">
            <Play className="h-4 w-4 fill-black" aria-hidden />
          </span>
        </span>
        <span className="absolute inset-x-3 bottom-2.5 h-1 overflow-hidden rounded-full bg-white/20">
          <span
            className="block h-full rounded-full bg-[#cfe0ee]"
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t("cw.resume")}
          />
        </span>
      </div>
      <p className="mt-2 truncate text-[13px] font-semibold text-white/90">
        {name}
        <span className="text-white/45">{epLabel}</span>
      </p>
      <p className="text-[11px] text-white/45">
        {t("cw.resume")} · {Math.round(pct)}%
      </p>
    </motion.button>
  );
}

// ─── AI "Picked for You" row — only when recommendations exist (task 6-a) ─────

function ForYouRow() {
  const { t } = useT();
  const [items, setItems] = useState<TitleDTO[] | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .aiRecommendations()
      .then((r) => {
        if (alive) setItems(r.items);
      })
      .catch(() => {
        if (alive) setItems([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Hidden entirely on cold start (no history) — no fabricated personalization
  if (items === null || items.length === 0) return null;

  return (
    <div data-testid="foryou-row">
      <Reveal delay={0.1}>
        <Row
          title={t("ai.forYou")}
          subtitle={t("ai.forYouSub")}
          icon={<Sparkles className="h-5 w-5 text-[#d8c9a3]" aria-hidden />}
        >
          {items.map((title, i) => (
            <TitleCard key={title.id} title={title} index={i} />
          ))}
        </Row>
      </Reveal>
    </div>
  );
}

// ─── Cinematic highlight ticker (static brand copy — task 5-a) ────────────────

const TICKER_KEYS = [
  "ticker.cinema",
  "ticker.series",
  "ticker.tv",
  "ticker.uhd",
  "ticker.premieres",
  "ticker.arabic",
] as const;

function TickerStrip() {
  const { t, lang } = useT();
  // Duplicate the set so one loop is wider than any viewport → seamless -50% track
  const items = [...TICKER_KEYS, ...TICKER_KEYS];
  return (
    <Marquee duration={44} className="border-y border-white/8 bg-[#0a0a0c]/70">
      {items.map((key, i) => (
        <span
          key={`${key}-${i}`}
          className="ms-10 flex items-center gap-10 text-[12px] font-semibold text-white/45"
        >
          {/* dir="auto" isolates bidi per item; letter-spacing only for Latin (never on Arabic) */}
          <span
            className="whitespace-nowrap"
            dir="auto"
            style={lang === "en" ? { letterSpacing: "0.22em", textTransform: "uppercase" } : undefined}
          >
            {t(key)}
          </span>
          <span className="inline-block h-1.5 w-1.5 rotate-45 bg-[#d8c9a3]/60" aria-hidden />
        </span>
      ))}
    </Marquee>
  );
}


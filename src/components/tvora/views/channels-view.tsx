"use client";
// CHANNELS — Live TV: cinematic studio hero with drifting broadcast beams,
// category filter chips, channel cards grid (procedural logo tiles, LIVE badges,
// quality chips) and an immersive player dialog with EPG "now playing" info.
// Motion: staged hero reveal, staggered card entrance, sheen hover, pulse rings.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Play, Radio, SignalHigh, Tv, X } from "lucide-react";
import { api } from "@/lib/api";
import { CHANNEL_CATEGORIES, type ChannelCategory, type ChannelDTO } from "@/lib/types";
import { channelLogo } from "@/lib/artwork";
import { useT, EmptyState, DemoTag, LiveDot, ErrorState } from "../shared";
import { TvoraPlayer } from "../player";
import { Beam, PulseRing, RevealScale, SplitWords } from "../motion-fx";
import { useMotionAllowed } from "../motion-fx";
import { EASE_OUT_EXPO, viewportOnce } from "@/lib/motion";
import { cn } from "@/lib/utils";

// ─── Studio hero — broadcast beams over a dark control-room gradient ─────────
function ChannelsHero({ count }: { count: number }) {
  const { t } = useT();
  const motionOk = useMotionAllowed();
  return (
    <RevealScale>
      <section
        className="relative mb-8 overflow-hidden rounded-2xl border border-white/10"
        data-testid="channels-hero"
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(58% 90% at 18% -5%, rgba(159,183,203,0.20), transparent 60%), radial-gradient(46% 74% at 86% 6%, rgba(216,201,163,0.12), transparent 58%), linear-gradient(160deg, #0b0e13 0%, #0a0a0c 55%, #070708 100%)",
          }}
          aria-hidden
        />
        {/* drifting broadcast beams (pure CSS, decorative) */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <Beam className="left-[12%] opacity-45" duration={13} delay={-2} height="74%" />
          <Beam className="left-[46%] opacity-30" duration={17} delay={-7} height="88%" />
          <Beam className="right-[18%] opacity-40" duration={15} delay={-11} height="66%" />
        </div>
        <div className="tv-grain absolute inset-0" aria-hidden />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(7,7,8,0.10) 0%, rgba(7,7,8,0.35) 60%, rgba(7,7,8,0.72) 100%)",
          }}
          aria-hidden
        />

        <div className="relative px-6 py-12 sm:px-10 sm:py-16 lg:px-14 lg:py-20">
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-[#e5484d]/30 bg-black/40 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#ff8a8e] backdrop-blur-sm">
              {motionOk ? <PulseRing /> : <LiveDot />}
              {t("channels.heroBadge")}
            </span>
            <SplitWords
              as="h1"
              text={t("channels.title")}
              className="tv-title-glow mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl"
            />
            <p className="mt-3 max-w-xl text-sm text-white/60 sm:text-base">{t("channels.sub")}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-white/70"
                data-testid="channels-count"
              >
                <Tv className="h-3.5 w-3.5 text-[#9fb7cb]" aria-hidden />
                <span className="tabular-nums">{count}</span> {t("channels.count")}
              </span>
              <DemoTag />
            </div>
          </motion.div>
        </div>
      </section>
    </RevealScale>
  );
}

// ─── Category chip ─────────────────────────────────────────────────────────────
function CategoryChip({
  label,
  active,
  count,
  onClick,
  index,
}: {
  label: string;
  active: boolean;
  count: number;
  onClick: () => void;
  index: number;
}) {
  const motionOk = useMotionAllowed();
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE_OUT_EXPO, delay: Math.min(index * 0.04, 0.3) }}
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "tv-focusable relative min-h-[38px] shrink-0 whitespace-nowrap rounded-full border px-4 text-[13px] font-bold transition",
        active
          ? "border-white bg-white text-black shadow-[0_4px_18px_-4px_rgba(255,255,255,0.4)]"
          : "border-white/12 text-white/60 hover:border-white/35 hover:text-white"
      )}
    >
      <span className="relative z-10">
        {label}
        <span className={cn("ms-1.5 text-[10px] font-extrabold tabular-nums", active ? "text-black/55" : "text-white/35")}>
          {count}
        </span>
      </span>
    </motion.button>
  );
}

// ─── Channel card ──────────────────────────────────────────────────────────────
function ChannelCard({
  channel,
  index,
  onWatch,
}: {
  channel: ChannelDTO;
  index: number;
  onWatch: (c: ChannelDTO) => void;
}) {
  const { t, lang } = useT();
  const name = lang === "ar" ? channel.nameAr : channel.nameEn;
  const categoryLabel = t(`channels.${channel.category}`);
  const nowPlaying = lang === "ar" ? channel.nowPlayingAr : channel.nowPlayingEn;
  const description = lang === "ar" ? channel.descriptionAr : channel.descriptionEn;
  const canWatch = Boolean(channel.streamUrl);

  return (
    <motion.article
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewportOnce}
      transition={{ duration: 0.5, ease: EASE_OUT_EXPO, delay: Math.min(index * 0.045, 0.35) }}
      className="group/ch relative overflow-hidden rounded-xl border border-white/8 bg-gradient-to-b from-[#121216] to-[#0b0b0d] transition-colors duration-300 hover:border-white/20"
      data-testid="channel-card"
    >
      {/* Logo stage */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => canWatch && onWatch(channel)}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && canWatch) {
            e.preventDefault();
            onWatch(channel);
          }
        }}
        aria-label={`${name} — ${t("channels.watch")}`}
        className={cn(
          "tv-focusable relative aspect-[16/9] w-full overflow-hidden outline-none",
          canWatch ? "cursor-pointer" : "cursor-default"
        )}
      >
        <div
          className="absolute inset-0 transition-transform duration-700 ease-out group-hover/ch:scale-[1.05]"
          style={{ background: `linear-gradient(135deg, ${channel.colorA}22 0%, ${channel.colorB} 78%)` }}
          aria-hidden
        />
        <div className="absolute inset-0 opacity-25" aria-hidden>
          <div className="tv-scanlines h-full w-full" />
        </div>
        <img
          src={channelLogo(channel, 192)}
          alt=""
          width={96}
          height={96}
          className="absolute start-1/2 top-1/2 w-[84px] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_10px_28px_rgba(0,0,0,0.75)] transition-transform duration-500 ease-out group-hover/ch:scale-[1.08] rtl:translate-x-1/2"
          loading="lazy"
        />
        {/* badges */}
        <span className="absolute start-3 top-3 inline-flex items-center gap-1.5 rounded-sm bg-[#e5484d]/90 px-2 py-1 text-[10px] font-extrabold tracking-widest text-white shadow-lg">
          <LiveDot className="[&>span]:bg-white" />
          {t("hero.live")}
        </span>
        <span className="absolute end-3 top-3 inline-flex items-center gap-1 rounded-sm border border-white/15 bg-black/55 px-2 py-1 text-[10px] font-bold tracking-wider text-white/80 backdrop-blur-sm">
          <SignalHigh className="h-3 w-3" aria-hidden />
          {channel.quality}
        </span>
        {/* sheen + hover CTA */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
          <div className="tv-card-sheen absolute inset-y-0 start-0 w-1/2" />
        </div>
        {canWatch && (
          <span className="absolute inset-0 z-10 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover/ch:opacity-100">
            <span className="tv-btn-sheen flex h-12 items-center gap-2 rounded-full bg-white px-5 text-sm font-extrabold text-black shadow-[0_16px_40px_-12px_rgba(0,0,0,0.9)]">
              <Play className="h-4 w-4 fill-black" aria-hidden />
              {t("channels.watch")}
            </span>
          </span>
        )}
      </div>

      {/* Meta */}
      <div className="space-y-1.5 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate text-[15px] font-bold text-white/92">{name}</h3>
          <span className="shrink-0 rounded-sm bg-white/6 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/55">
            {categoryLabel}
          </span>
        </div>
        {description && <p className="line-clamp-2 text-xs leading-relaxed text-white/45">{description}</p>}
        {nowPlaying && (
          <p className="flex min-h-[18px] items-center gap-1.5 pt-0.5 text-[11px] font-semibold text-[#cfe0ee]/85">
            <span className="inline-block h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[#e5484d]" aria-hidden />
            <span className="truncate">{nowPlaying}</span>
          </p>
        )}
      </div>
    </motion.article>
  );
}

// ─── Player dialog — live player with EPG strip & unmute affordance ───────────
function ChannelPlayer({ channel, onClose }: { channel: ChannelDTO; onClose: () => void }) {
  const { t, lang } = useT();
  const closeRef = useRef<HTMLButtonElement>(null);
  const name = lang === "ar" ? channel.nameAr : channel.nameEn;
  const nowPlaying = lang === "ar" ? channel.nowPlayingAr : channel.nowPlayingEn;

  useEffect(() => {
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[85] flex items-center justify-center overflow-y-auto bg-black/90 p-4 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-label={`${name} — ${t("channels.watch")}`}
      data-testid="channel-player"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        // minimal focus trap between close button and player controls
        const panel = document.getElementById("channel-player-panel");
        if (!panel) return;
        const els = Array.from(panel.querySelectorAll<HTMLElement>('button, video, [tabindex]:not([tabindex="-1"])'));
        if (els.length === 0) return;
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }}
    >
      <motion.div
        id="channel-player-panel"
        initial={{ opacity: 0, scale: 0.97, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        transition={{ type: "spring", stiffness: 280, damping: 30 }}
        className="w-full max-w-5xl overflow-hidden rounded-xl border border-white/10 bg-[#0b0b0d] shadow-[0_40px_120px_-30px_rgba(0,0,0,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar — LIVE + name + close */}
        <div className="flex items-center gap-3 border-b border-white/8 bg-black/50 px-4 py-3">
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-sm bg-[#e5484d]/15 px-2 py-1 text-[10px] font-extrabold tracking-widest text-[#ff6b70]">
            <PulseRing />
            {t("hero.live")}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white/90">{name}</p>
            {nowPlaying && <p className="truncate text-[11px] text-white/45">{nowPlaying}</p>}
          </div>
          <span className="hidden shrink-0 rounded-sm border border-white/12 px-2 py-0.5 text-[10px] font-bold text-white/60 sm:inline">
            {channel.quality}
          </span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t("nav.close")}
            className="tv-focusable flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/12 text-white/70 transition hover:border-white/40 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Video Area */}
        <div className="relative aspect-video w-full bg-[#080808]">
          {channel.streamUrl ? (
            <TvoraPlayer
              src={channel.streamUrl}
              titleId={channel.id}
              title={name}
              live={true}
              liveInfo={{
                channelCode: channel.code,
                channelName: name,
                nowPlaying: nowPlaying || undefined,
                category: channel.category,
              }}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center" data-testid="channel-no-stream">
              <Radio className="h-7 w-7 text-white/30" aria-hidden />
              <p className="max-w-sm px-6 text-sm text-white/55">{t("channels.noStream")}</p>
            </div>
          )}
        </div>

        {/* EPG strip */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/8 bg-white/[0.02] px-4 py-3 text-[11px] text-white/45">
          <span className="inline-flex items-center gap-1.5">
            <Tv className="h-3.5 w-3.5 text-[#9fb7cb]" aria-hidden />
            <span dir="ltr" className="font-bold tracking-wider text-white/60">{channel.code}</span>
          </span>
          <span>
            {t("channels.nowPlaying")}: <span className="font-semibold text-white/70">{nowPlaying || "—"}</span>
          </span>
          <span className="ms-auto">{t("player.demoNotice")}</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main view ─────────────────────────────────────────────────────────────────
export function ChannelsView() {
  const { t, lang } = useT();
  const [channels, setChannels] = useState<ChannelDTO[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const [category, setCategory] = useState<ChannelCategory | "all">("all");
  const [playing, setPlaying] = useState<ChannelDTO | null>(null);

  useEffect(() => {
    document.title = lang === "ar" ? "قنوات TV | TVORA" : "TV Channels | TVORA";
  }, [lang]);

  useEffect(() => {
    let alive = true;
    api
      .channels()
      .then((r) => {
        if (!alive) return;
        setChannels(r.items);
        setFailed(false);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [reload]);

  const counts = useMemo(() => {
    const map = new Map<ChannelCategory, number>();
    (channels ?? []).forEach((c) => map.set(c.category, (map.get(c.category) ?? 0) + 1));
    return map;
  }, [channels]);

  const filtered = useMemo(() => {
    if (!channels) return [];
    return category === "all" ? channels : channels.filter((c) => c.category === category);
  }, [channels, category]);

  if (failed) {
    return (
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-48">
        <ErrorState onRetry={() => setReload((n) => n + 1)} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-16 pt-24 md:px-8 md:pt-28 lg:px-12" data-testid="channels-view">
      <ChannelsHero count={channels?.length ?? 0} />

      {/* Category filters */}
      <div
        className="tv-no-scrollbar mb-6 flex items-center gap-2 overflow-x-auto pb-1"
        role="group"
        aria-label={t("channels.kicker")}
        data-testid="channels-filters"
      >
        <CategoryChip
          label={t("channels.all")}
          active={category === "all"}
          count={channels?.length ?? 0}
          onClick={() => setCategory("all")}
          index={0}
        />
        {CHANNEL_CATEGORIES.filter((c) => (counts.get(c) ?? 0) > 0).map((c, i) => (
          <CategoryChip
            key={c}
            label={t(`channels.${c}`)}
            active={category === c}
            count={counts.get(c) ?? 0}
            onClick={() => setCategory(category === c ? "all" : c)}
            index={i + 1}
          />
        ))}
      </div>

      {/* Grid */}
      {channels === null ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-hidden>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="tv-shimmer aspect-[16/9] rounded-xl border border-white/6" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Tv className="h-5 w-5 text-white/40" aria-hidden />}
          title={t("channels.empty")}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-testid="channels-grid">
          {filtered.map((c, i) => (
            <ChannelCard key={c.id} channel={c} index={i} onWatch={setPlaying} />
          ))}
        </div>
      )}

      {/* Player dialog */}
      <AnimatePresence>
        {playing && <ChannelPlayer channel={playing} onClose={() => setPlaying(null)} />}
      </AnimatePresence>
    </div>
  );
}

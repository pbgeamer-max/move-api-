"use client";
// TVORA professional player — HTML5 video with HLS (hls.js dynamic import, Safari native fallback),
// resume/progress persistence, buffered seek bar, volume, fullscreen, keyboard control,
// auto-reconnect for stream errors, and a no-seek LIVE mode for match streams.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Clapperboard,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { api } from "@/lib/api";
import { useT } from "./shared";
import { PulseRing } from "./motion-fx";
import { cn } from "@/lib/utils";

const MAX_AUTO_RETRIES = 2;

function fmtClock(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const s = Math.floor(sec % 60);
  const m = Math.floor((sec / 60) % 60);
  const h = Math.floor(sec / 3600);
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

// ─── Seek bar with buffered indication (always LTR — video timeline) ─────────

function SeekBar({
  current,
  duration,
  buffered,
  onSeek,
  ariaLabel,
}: {
  current: number;
  duration: number;
  buffered: number;
  onSeek: (t: number) => void;
  ariaLabel: string;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const pct = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;
  const bufPct = duration > 0 ? Math.min(100, (buffered / duration) * 100) : 0;

  const ratioFrom = (clientX: number) => {
    const el = barRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  };

  return (
    <div
      ref={barRef}
      dir="ltr"
      role="slider"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(current)}
      aria-valuetext={fmtClock(current)}
      tabIndex={-1}
      className="group/seek relative flex h-4 w-full cursor-pointer items-center"
      onPointerDown={(e) => {
        if (!duration) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
        onSeek(ratioFrom(e.clientX) * duration);
      }}
      onPointerMove={(e) => {
        if (dragging && duration) onSeek(ratioFrom(e.clientX) * duration);
      }}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
    >
      <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/18 transition-[height] group-hover/seek:h-1.5">
        <div className="absolute inset-y-0 start-0 rounded-full bg-white/25" style={{ width: `${bufPct}%` }} aria-hidden />
        <div className="absolute inset-y-0 start-0 rounded-full bg-[#cfe0ee]" style={{ width: `${pct}%` }} aria-hidden />
      </div>
      <span
        className="pointer-events-none absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white shadow-[0_0_8px_rgba(207,224,238,0.7)] transition-transform"
        style={{ left: `calc(${pct}% - 6px)`, transform: dragging ? "translateY(-50%) scale(1.25)" : undefined }}
        aria-hidden
      />
    </div>
  );
}

// ─── Loading overlay (shimmer + pulsing clapperboard) ────────────────────────

function PlayerLoading({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-[#0a0a0c]/92" role="status" aria-live="polite">
      <div className="tv-shimmer absolute inset-0" aria-hidden />
      <Clapperboard className="relative h-10 w-10 animate-pulse text-[#9fb7cb]/70" aria-hidden />
      <p className="relative text-sm text-white/55">{label}</p>
    </div>
  );
}

// ─── Error card with manual retry (after auto-reconnect exhausted) ───────────

function PlayerError({ onRetry }: { onRetry: () => void }) {
  const { t } = useT();
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-[#0a0a0c]/96 p-6 text-center" role="alert">
      <AlertTriangle className="h-8 w-8 text-[#e5484d]" aria-hidden />
      <p className="max-w-sm text-sm text-white/75">{t("player.streamError")}</p>
      <button
        type="button"
        onClick={onRetry}
        className="tv-focusable inline-flex min-h-[44px] items-center gap-2 rounded-md border border-white/20 px-5 text-sm font-bold text-white/90 transition hover:border-white/50 hover:text-white"
      >
        <RotateCcw className="h-4 w-4" aria-hidden /> {t("player.retry")}
      </button>
    </div>
  );
}

// ─── The player ───────────────────────────────────────────────────────────────

export function TvoraPlayer({
  src,
  titleId,
  episodeId,
  poster,
  live = false,
  onEnded,
  onVideoEl,
}: {
  src: string;
  /** progress bucket id — matches are never persisted (live=true skips saving entirely) */
  titleId: string;
  episodeId?: string;
  poster?: string;
  live?: boolean;
  onEnded?: () => void;
  /** watch-party integration: receives the underlying <video> element on mount (null on unmount) */
  onVideoEl?: (el: HTMLVideoElement | null) => void;
}) {
  const { t } = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<{ destroy: () => void } | null>(null);
  const lastSavedRef = useRef(0);
  const pendingResumeRef = useRef<number | null>(null);
  const resumeAppliedRef = useRef(false);
  const chipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef<() => void>(() => {});

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(1);
  const [error, setError] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [resuming, setResuming] = useState(false);
  // bumping this re-runs the source effect = a reconnect attempt
  const [nonce, setNonce] = useState(0);
  const retriesRef = useRef(0);

  // ── Source wiring: hls.js only for .m3u8, native otherwise ─────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let disposed = false;
    setReady(false);
    setError(false);
    setReconnecting(false);
    setCurrent(0);
    setBuffered(0);
    setDuration(0);

    const isHlsSrc = src.split("?")[0].endsWith(".m3u8");
    const nativeSupport = video.canPlayType("application/vnd.apple.mpegurl") !== "";

    const handleFatal = () => {
      if (disposed) return;
      if (retriesRef.current < MAX_AUTO_RETRIES) {
        retriesRef.current += 1;
        setReconnecting(true);
        setTimeout(() => setNonce((n) => n + 1), 1200);
      } else {
        setReconnecting(false);
        setError(true);
      }
    };

    (async () => {
      if (isHlsSrc && !nativeSupport) {
        try {
          const mod = await import("hls.js");
          const Hls = mod.default;
          if (disposed) return;
          if (Hls.isSupported()) {
            const hls = new Hls({ lowLatencyMode: live, enableWorker: true, backBufferLength: 60 });
            hlsRef.current = hls;
            hls.loadSource(src);
            hls.attachMedia(video);
            hls.on(Hls.Events.ERROR, (_evt, data) => {
              if (data.fatal) handleFatal();
            });
            return;
          }
        } catch {
          // dynamic import failed → fall through to native <video> handling
        }
      }
      video.src = src;
      video.load();
      void video.play().catch(() => {});
    })();

    return () => {
      disposed = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      } else {
        video.removeAttribute("src");
        video.load();
      }
    };
  }, [src, nonce, live]);

  // ── Resume position (movies/episodes only — never matches) ─────────────────
  useEffect(() => {
    if (live) return;
    let alive = true;
    api
      .progressGet()
      .then((res) => {
        if (!alive) return;
        const item = res.items.find(
          (i) => i.titleId === titleId && (episodeId ? i.episodeId === episodeId : true)
        );
        if (item && item.positionSeconds > 5 && item.positionSeconds < item.durationSeconds - 5) {
          pendingResumeRef.current = item.positionSeconds;
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [titleId, episodeId, live]);

  const applyResume = useCallback(() => {
    const v = videoRef.current;
    if (!v || resumeAppliedRef.current) return;
    const pos = pendingResumeRef.current;
    if (pos == null || pos <= 5 || (v.duration > 0 && pos > v.duration - 5)) return;
    resumeAppliedRef.current = true;
    v.currentTime = pos;
    setResuming(true);
    if (chipTimerRef.current) clearTimeout(chipTimerRef.current);
    chipTimerRef.current = setTimeout(() => setResuming(false), 2500);
  }, []);

  // ── Progress saving (skip entirely for live matches) ───────────────────────
  const save = useCallback(() => {
    const v = videoRef.current;
    if (live || !v || !Number.isFinite(v.duration) || v.duration <= 0) return;
    api
      .progressSave({
        titleId,
        episodeId,
        positionSeconds: v.currentTime,
        durationSeconds: v.duration,
      })
      .catch(() => {});
  }, [titleId, episodeId, live]);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  // save on unmount + release timers
  useEffect(() => {
    return () => {
      saveRef.current();
      if (chipTimerRef.current) clearTimeout(chipTimerRef.current);
      if (pinTimerRef.current) clearTimeout(pinTimerRef.current);
    };
  }, []);

  // ── Media element events ───────────────────────────────────────────────────
  const onLoadedMetadata = () => {
    const v = videoRef.current;
    if (v) setDuration(v.duration || 0);
    applyResume();
  };

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrent(v.currentTime);
    if (!live && v.currentTime - lastSavedRef.current >= 5) {
      lastSavedRef.current = v.currentTime;
      save();
    }
  };

  const onProgress = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    try {
      if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1));
    } catch {
      /* ignore buffered quirks */
    }
  };

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v || error) return;
    if (v.paused) void v.play().catch(() => {});
    else v.pause();
  }, [error]);

  const seekBy = useCallback(
    (delta: number) => {
      const v = videoRef.current;
      if (!v || live || !Number.isFinite(v.duration)) return;
      v.currentTime = Math.min(v.duration - 0.2, Math.max(0, v.currentTime + delta));
      setCurrent(v.currentTime);
    },
    [live]
  );

  const toggleFullscreen = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void el.requestFullscreen?.().catch(() => {});
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.muted && v.volume === 0) {
      v.volume = 0.6;
      setVolume(0.6);
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const pin = useCallback(() => {
    setPinned(true);
    if (pinTimerRef.current) clearTimeout(pinTimerRef.current);
    pinTimerRef.current = setTimeout(() => setPinned(false), 2800);
  }, []);

  const manualRetry = () => {
    retriesRef.current = 0;
    setError(false);
    setReconnecting(true);
    setNonce((n) => n + 1);
  };

  // <video> onError — hls.js fatal errors route through the source effect
  const onVideoError = () => {
    if (retriesRef.current < MAX_AUTO_RETRIES) {
      retriesRef.current += 1;
      setReconnecting(true);
      setTimeout(() => setNonce((n) => n + 1), 1200);
    } else {
      setReconnecting(false);
      setError(true);
    }
  };

  return (
    <div
      ref={wrapRef}
      data-testid="tvora-player"
      role="region"
      aria-label={t("player.playing")}
      tabIndex={0}
      className="group/player relative aspect-video w-full select-none bg-black outline-none focus-visible:ring-2 focus-visible:ring-[#cfe0ee]/60"
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "k" || e.key === "K") {
          e.preventDefault();
          togglePlay();
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          seekBy(-10);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          seekBy(10);
        } else if (e.key === "f" || e.key === "F") {
          toggleFullscreen();
        } else if (e.key === "m" || e.key === "M") {
          toggleMute();
        }
      }}
      onMouseEnter={pin}
      onTouchStart={pin}
    >
      <video
        ref={(el) => {
          videoRef.current = el;
          onVideoEl?.(el);
        }}
        poster={poster}
        className="absolute inset-0 h-full w-full bg-black object-contain"
        playsInline
        autoPlay
        muted={muted}
        onLoadedMetadata={onLoadedMetadata}
        onCanPlay={() => setReady(true)}
        onPlaying={() => {
          setPlaying(true);
          setReady(true);
        }}
        onPause={() => {
          setPlaying(false);
          save();
        }}
        onEnded={() => {
          setPlaying(false);
          save();
          onEnded?.();
        }}
        onTimeUpdate={onTimeUpdate}
        onProgress={onProgress}
        onDurationChange={() => {
          const v = videoRef.current;
          if (v && Number.isFinite(v.duration)) setDuration(v.duration);
        }}
        onError={onVideoError}
        onClick={togglePlay}
      />

      {/* LIVE badge (top corner) */}
      {live && (
        <span
          className="absolute top-3 z-20 inline-flex items-center gap-1.5 rounded-sm bg-[#e5484d] px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest text-white shadow-lg"
          style={{ insetInlineEnd: 12 }}
          title={t("player.liveNoSeek")}
          data-testid="player-live-badge"
        >
          <PulseRing color="#ffffff" />
          {t("hero.live")}
        </span>
      )}

      {/* Resuming chip */}
      {resuming && (
        <div
          className="pointer-events-none absolute start-1/2 top-5 z-20 -translate-x-1/2 rounded-full bg-black/75 px-4 py-1.5 text-xs font-semibold text-white/95 backdrop-blur-sm"
          role="status"
        >
          {t("player.resume")}
        </div>
      )}

      {/* Reconnecting chip */}
      {reconnecting && !error && (
        <div className="pointer-events-none absolute start-1/2 top-5 z-20 -translate-x-1/2 rounded-full bg-black/75 px-4 py-1.5 text-xs font-semibold text-[#ff8a8e] backdrop-blur-sm" role="status">
          {t("player.reconnecting")}
        </div>
      )}

      {/* Loading overlay */}
      {!ready && !error && <PlayerLoading label={t("player.loadingStream")} />}

      {/* Error card */}
      {error && <PlayerError onRetry={manualRetry} />}

      {/* Center play (when paused) */}
      {!playing && ready && !error && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label={t("player.play")}
          className="tv-focusable absolute left-1/2 top-1/2 z-20 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/12 backdrop-blur-md transition hover:scale-105 hover:bg-white/20"
        >
          <Play className="h-7 w-7 fill-white text-white" aria-hidden />
        </button>
      )}

      {/* Bottom control bar */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-3 pb-2.5 pt-10 transition-[opacity,transform] duration-300 ease-out sm:px-4",
          playing && !pinned
            ? "translate-y-2 opacity-0 group-hover/player:translate-y-0 group-hover/player:opacity-100 group-focus-within/player:translate-y-0 group-focus-within/player:opacity-100"
            : "translate-y-0 opacity-100"
        )}
      >
        {live ? (
          <div className="mb-1.5 flex items-center gap-2" title={t("player.liveNoSeek")}>
            <span className="inline-flex items-center gap-1.5 rounded-sm bg-[#e5484d]/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-[#ff6b70]">
              <PulseRing /> {t("hero.live")}
            </span>
            <span className="hidden text-[11px] text-white/45 sm:inline">{t("player.liveNoSeek")}</span>
          </div>
        ) : (
          <div className="mb-1.5">
            <SeekBar
              current={current}
              duration={duration}
              buffered={buffered}
              onSeek={(time) => {
                const v = videoRef.current;
                if (!v) return;
                v.currentTime = time;
                setCurrent(time);
              }}
              ariaLabel={t("player.seekBar")}
            />
          </div>
        )}

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? t("player.pause") : t("player.play")}
            className="tv-focusable flex h-9 w-9 items-center justify-center rounded-full text-white/90 transition hover:scale-110 hover:bg-white/10 hover:text-white hover:drop-shadow-[0_0_10px_rgba(207,224,238,0.35)]"
          >
            {playing ? <Pause className="h-4.5 w-4.5 fill-current" aria-hidden /> : <Play className="h-4.5 w-4.5 fill-current" aria-hidden />}
          </button>

          {!live && (
            <span className="min-w-[86px] text-xs font-semibold tabular-nums text-white/80" dir="ltr">
              {fmtClock(current)} <span className="text-white/35">/ {fmtClock(duration)}</span>
            </span>
          )}

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? t("player.unmute") : t("player.mute")}
              aria-pressed={muted}
              className="tv-focusable flex h-9 w-9 items-center justify-center rounded-full text-white/90 transition hover:scale-110 hover:bg-white/10 hover:text-white hover:drop-shadow-[0_0_10px_rgba(207,224,238,0.35)]"
            >
              {muted ? <VolumeX className="h-4.5 w-4.5" aria-hidden /> : volume < 0.5 ? <Volume1 className="h-4.5 w-4.5" aria-hidden /> : <Volume2 className="h-4.5 w-4.5" aria-hidden />}
            </button>
            <input
              type="range"
              dir="ltr"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => {
                const val = Number(e.target.value);
                setVolume(val);
                const v = videoRef.current;
                if (v) {
                  v.volume = val;
                  v.muted = val === 0;
                  setMuted(val === 0);
                }
              }}
              aria-label={t("player.volume")}
              className="hidden h-1 w-20 cursor-pointer accent-[#cfe0ee] sm:block"
            />
          </div>

          <div className="ms-auto">
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={fullscreen ? t("player.exitFullscreen") : t("player.fullscreen")}
              className="tv-focusable flex h-9 w-9 items-center justify-center rounded-full text-white/90 transition hover:scale-110 hover:bg-white/10 hover:text-white hover:drop-shadow-[0_0_10px_rgba(207,224,238,0.35)]"
            >
              {fullscreen ? <Minimize className="h-4.5 w-4.5" aria-hidden /> : <Maximize className="h-4.5 w-4.5" aria-hidden />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Player skeleton (page-level loading state) ──────────────────────────────

export function PlayerSkeleton() {
  const { t } = useT();
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0c]" aria-hidden>
      <div className="tv-shimmer absolute inset-0" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        <Clapperboard className="h-10 w-10 animate-pulse text-[#9fb7cb]/60" />
        <p className="text-sm text-white/45">{t("player.loadingStream")}</p>
      </div>
    </div>
  );
}

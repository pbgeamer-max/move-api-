"use client";
// TVORA — Premium Cinematic Video Player
// Complete production-quality video streaming engine supporting:
// - HTML5 MP4 / WebM & Adaptive HLS (m3u8) streaming via hls.js (with Safari native HLS fallback)
// - Video.js-compatible architecture & seamless lifecycle
// - Quality selection (Auto, 1080p, 720p, 480p, 360p)
// - WebVTT Subtitle tracks & multi-language switching
// - Playback speed menu (0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x)
// - Fullscreen & Picture-in-Picture (PiP)
// - Seeking timeline with hover tooltip & buffer indication
// - TVORA Red (#E50914) cinematic design with #080808 / #111111 / #252525 theme
// - Skip Intro button & Next Episode countdown overlay
// - Live stream mode for matches and TV channels with glowing LIVE badge & reconnect resilience
// - Full keyboard shortcuts with input guard & responsive mobile touch controls
// - Progress persistence to /api/progress with resume support
// - Watch Party integration via onVideoEl
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Clapperboard,
  FastForward,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture,
  Play,
  Radio,
  RotateCcw,
  RotateCw,
  Settings,
  Sliders,
  Subtitles,
  Tv,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { useT } from "./shared";
import { PulseRing } from "./motion-fx";
import { cn } from "@/lib/utils";

const MAX_AUTO_RETRIES = 3;

export interface SubtitleTrack {
  label: string;
  srclang: string;
  src: string;
  default?: boolean;
}

export interface QualityLevel {
  id: number;
  label: string;
  height?: number;
  bitrate?: number;
}

export interface NextEpisodeInfo {
  id: string;
  number: number;
  seasonNumber: number;
  title: string;
  onClick?: () => void;
}

export interface AudioTrackOption {
  id: number;
  label: string;
  lang?: string;
}

export interface LiveInfo {
  channelCode?: string;
  channelName?: string;
  nowPlaying?: string;
  category?: string;
  competition?: string;
  homeTeam?: string;
  awayTeam?: string;
  startTime?: string;
  score?: string;
}

export interface TvoraPlayerProps {
  src: string;
  titleId: string;
  episodeId?: string;
  title?: string;
  poster?: string;
  live?: boolean;
  liveInfo?: LiveInfo;
  subtitles?: SubtitleTrack[];
  introStart?: number;
  introEnd?: number;
  nextEpisode?: NextEpisodeInfo;
  onEnded?: () => void;
  onVideoEl?: (el: HTMLVideoElement | null) => void;
}

function fmtClock(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const s = Math.floor(sec % 60);
  const m = Math.floor((sec / 60) % 60);
  const h = Math.floor(sec / 3600);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

// ─── Cinematic Timeline / Seek Bar ──────────────────────────────────────────
function CinematicSeekBar({
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
  const [hoverPct, setHoverPct] = useState<number | null>(null);

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
      tabIndex={0}
      className="group/seek relative flex h-6 w-full cursor-pointer items-center select-none"
      onPointerDown={(e) => {
        if (!duration) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
        onSeek(ratioFrom(e.clientX) * duration);
      }}
      onPointerMove={(e) => {
        const r = ratioFrom(e.clientX);
        setHoverPct(r);
        if (dragging && duration) onSeek(r * duration);
      }}
      onPointerLeave={() => setHoverPct(null)}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
    >
      {/* Hover preview tooltip */}
      {hoverPct !== null && duration > 0 && (
        <div
          className="pointer-events-none absolute bottom-5 -translate-x-1/2 rounded bg-[#111111] border border-[#252525] px-2 py-0.5 text-[11px] font-mono font-bold text-white shadow-xl"
          style={{ left: `${hoverPct * 100}%` }}
        >
          {fmtClock(hoverPct * duration)}
        </div>
      )}

      {/* Track container */}
      <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/20 transition-[height] duration-200 group-hover/seek:h-2">
        {/* Buffer bar */}
        <div
          className="absolute inset-y-0 start-0 rounded-full bg-white/35 transition-[width] duration-300"
          style={{ width: `${bufPct}%` }}
          aria-hidden
        />
        {/* Played bar (TVORA Red #E50914) */}
        <div
          className="absolute inset-y-0 start-0 rounded-full bg-[#E50914]"
          style={{ width: `${pct}%` }}
          aria-hidden
        />
      </div>

      {/* Scrub thumb */}
      <span
        className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-[#E50914] shadow-[0_0_12px_rgba(229,9,20,0.8)] transition-transform duration-150"
        style={{
          left: `calc(${pct}% - 7px)`,
          transform: dragging ? "translateY(-50%) scale(1.35)" : undefined,
        }}
        aria-hidden
      />
    </div>
  );
}

// ─── Loading Overlay ────────────────────────────────────────────────────────
function PlayerLoading({ label }: { label: string }) {
  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-[#080808]/85 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
    >
      <div className="relative flex items-center justify-center">
        <div className="h-14 w-14 animate-spin rounded-full border-2 border-transparent border-t-[#E50914] border-r-[#E50914]/40" />
        <Clapperboard className="absolute h-6 w-6 text-white/70" aria-hidden />
      </div>
      <p className="text-sm font-medium tracking-wide text-white/70">{label}</p>
    </div>
  );
}

// ─── Error Card ─────────────────────────────────────────────────────────────
function PlayerError({ onRetry }: { onRetry: () => void }) {
  const { t } = useT();
  return (
    <div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-[#080808]/95 p-6 text-center"
      role="alert"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E50914]/15 text-[#E50914] border border-[#E50914]/30">
        <AlertTriangle className="h-7 w-7" aria-hidden />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-bold text-white">{t("player.streamError")}</h3>
        <p className="max-w-sm text-xs text-white/50">{t("details.notAvailableStream")}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="tv-focusable mt-2 inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-[#E50914] px-6 text-sm font-bold text-white shadow-[0_4px_20px_rgba(229,9,20,0.35)] transition hover:bg-[#b80710] active:scale-95"
      >
        <RotateCcw className="h-4 w-4" aria-hidden /> {t("player.retry")}
      </button>
    </div>
  );
}

// ─── Next Episode Countdown Overlay ─────────────────────────────────────────
function NextEpisodeOverlay({
  nextEpisode,
  secondsLeft,
  onPlayNow,
  onCancel,
}: {
  nextEpisode: NextEpisodeInfo;
  secondsLeft: number;
  onPlayNow: () => void;
  onCancel: () => void;
}) {
  const { t } = useT();
  return (
    <div className="absolute end-4 bottom-20 z-30 flex max-w-sm flex-col gap-3 rounded-xl border border-[#252525] bg-[#111111]/95 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#E50914]">
            {t("player.nextEpisode")}
          </span>
          <h4 className="mt-0.5 line-clamp-1 text-sm font-bold text-white">
            S{nextEpisode.seasonNumber}·E{nextEpisode.number} {nextEpisode.title}
          </h4>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label={t("player.cancel")}
          className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <span className="text-xs text-white/60">
          {t("player.nextIn")} <span className="font-bold text-white tabular-nums">{secondsLeft}s</span>
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded px-2.5 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white"
          >
            {t("player.cancel")}
          </button>
          <button
            type="button"
            onClick={onPlayNow}
            className="inline-flex items-center gap-1.5 rounded bg-[#E50914] px-3 py-1.5 text-xs font-bold text-white shadow-md hover:bg-[#b80710]"
          >
            <Play className="h-3.5 w-3.5 fill-current" /> {t("player.playNow")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Cinematic TvoraPlayer Component ────────────────────────────────────
export function TvoraPlayer({
  src,
  titleId,
  episodeId,
  title,
  poster,
  live = false,
  liveInfo,
  subtitles = [],
  introStart,
  introEnd,
  nextEpisode,
  onEnded,
  onVideoEl,
}: TvoraPlayerProps) {
  const { t } = useT();

  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);

  // Timers & refs
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(0);
  const pendingResumeRef = useRef<number | null>(null);
  const resumeAppliedRef = useRef(false);
  const retriesRef = useRef(0);
  const skipFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // States
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [error, setError] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [pipActive, setPipActive] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [resumingNotice, setResumingNotice] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [nonce, setNonce] = useState(0);

  // Popover menus state
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const [qualityMenuOpen, setQualityMenuOpen] = useState(false);
  const [subtitleMenuOpen, setSubtitleMenuOpen] = useState(false);
  const [audioMenuOpen, setAudioMenuOpen] = useState(false);

  // HLS Qualities, Audio Tracks & Subtitles state
  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<number>(-1); // -1 = Auto
  const [audioTracks, setAudioTracks] = useState<AudioTrackOption[]>([]);
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<number>(-1);
  const [selectedSubtitle, setSelectedSubtitle] = useState<string>("off");
  const [subSize, setSubSize] = useState<"sm" | "md" | "lg">("md");
  const [subBg, setSubBg] = useState<"dark" | "translucent" | "none">("dark");

  // Skip Intro & Next Episode countdown
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [nextCountdown, setNextCountdown] = useState<number | null>(null);
  const [skipFeedback, setSkipFeedback] = useState<"forward" | "rewind" | null>(null);

  // ── Stream Resolver State (Auto-resolves 3isk, external streams, and embeds) ──
  const isDirectMedia = Boolean(
    src && (src.includes(".m3u8") || src.includes(".mp4") || src.includes(".webm"))
  );
  const [resolvedStream, setResolvedStream] = useState<{
    type: "hls" | "mp4" | "embed";
    streamUrl?: string;
    embedUrl?: string;
  } | null>(isDirectMedia ? { type: src.includes(".m3u8") ? "hls" : "mp4", streamUrl: src } : null);
  const [resolving, setResolving] = useState<boolean>(!isDirectMedia);

  useEffect(() => {
    if (!src) return;
    if (isDirectMedia) {
      setResolvedStream({ type: src.includes(".m3u8") ? "hls" : "mp4", streamUrl: src });
      setResolving(false);
      return;
    }

    // Dynamic stream resolution via /api/stream/resolve
    setResolving(true);
    let active = true;

    const params = new URLSearchParams();
    params.set("url", src);
    if (episodeId) params.set("episodeId", episodeId);
    if (titleId) params.set("slug", titleId);

    fetch(`/api/stream/resolve?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        setResolving(false);
        if (data && data.success && data.streamUrl) {
          setResolvedStream({
            type: data.type || "hls",
            streamUrl: data.streamUrl,
            embedUrl: data.fallbackEmbed || data.embedUrl,
          });
        } else if (data && data.success && (data.fallbackEmbed || data.embedUrl)) {
          setResolvedStream({
            type: "embed",
            embedUrl: data.fallbackEmbed || data.embedUrl,
          });
        } else {
          setResolvedStream({ type: "embed", embedUrl: src });
        }
      })
      .catch((err) => {
        if (!active) return;
        setResolving(false);
        console.warn("[TvoraPlayer] Stream resolve fallback:", err);
        setResolvedStream({ type: "embed", embedUrl: src });
      });

    return () => {
      active = false;
    };
  }, [src, episodeId, titleId, isDirectMedia]);

  const activePlaybackUrl = resolvedStream?.streamUrl || (isDirectMedia ? src : null);
  const isEmbedMode = resolvedStream?.type === "embed" && Boolean(resolvedStream.embedUrl);

  // ── 1. Engine Initialization (hls.js with ABR + Native Fallback) ───────────
  useEffect(() => {
    if (isEmbedMode || resolving || !activePlaybackUrl) return;
    const video = videoRef.current;
    if (!video) return;
    let disposed = false;

    setReady(false);
    setError(false);
    setReconnecting(false);
    setCurrent(0);
    setBuffered(0);
    setDuration(0);
    setQualityLevels([]);
    setSelectedQuality(-1);
    setAudioTracks([]);
    setSelectedAudioTrack(-1);

    const isHlsSrc = activePlaybackUrl.split("?")[0].endsWith(".m3u8");
    const nativeHlsSupport = video.canPlayType("application/vnd.apple.mpegurl") !== "";

    const handleFatalError = () => {
      if (disposed) return;
      if (resolvedStream?.embedUrl) {
        // Automatic fallback to embed player
        setResolvedStream({ type: "embed", embedUrl: resolvedStream.embedUrl });
        return;
      }
      if (retriesRef.current < MAX_AUTO_RETRIES) {
        retriesRef.current += 1;
        setReconnecting(true);
        setTimeout(() => setNonce((n) => n + 1), 1500 * retriesRef.current);
      } else {
        setReconnecting(false);
        setError(true);
      }
    };

    (async () => {
      if (isHlsSrc && !nativeHlsSupport) {
        try {
          const mod = await import("hls.js");
          const Hls = mod.default;
          if (disposed) return;

          if (Hls.isSupported()) {
            const hls = new Hls({
              lowLatencyMode: live,
              enableWorker: true,
              backBufferLength: 60,
              capLevelToPlayerSize: true,
            });
            hlsRef.current = hls;

            hls.loadSource(activePlaybackUrl);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
              if (disposed) return;
              if (data.levels && data.levels.length > 1) {
                const levels: QualityLevel[] = data.levels.map((lvl, idx) => ({
                  id: idx,
                  label: lvl.height ? `${lvl.height}p` : `${Math.round(lvl.bitrate / 1000)}k`,
                  height: lvl.height,
                  bitrate: lvl.bitrate,
                }));
                levels.sort((a, b) => (b.height || 0) - (a.height || 0));
                setQualityLevels(levels);
              }
              setReady(true);
            });

            hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_event, data) => {
              if (disposed) return;
              if (data.audioTracks && data.audioTracks.length > 1) {
                setAudioTracks(
                  data.audioTracks.map((trk, idx) => ({
                    id: idx,
                    label: trk.name || trk.lang || `Track ${idx + 1}`,
                    lang: trk.lang,
                  }))
                );
              }
            });

            hls.on(Hls.Events.ERROR, (_event, data) => {
              if (data.fatal) {
                switch (data.type) {
                  case Hls.ErrorTypes.NETWORK_ERROR:
                    hls.startLoad();
                    break;
                  case Hls.ErrorTypes.MEDIA_ERROR:
                    hls.recoverMediaError();
                    break;
                  default:
                    handleFatalError();
                    break;
                }
              }
            });

            return;
          }
        } catch {
          // Dynamic import fallback to native
        }
      }

      // Native HTML5 source
      video.src = activePlaybackUrl;
      video.load();
      void video.play().catch(() => {});
    })();

    return () => {
      disposed = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      } else if (video) {
        video.removeAttribute("src");
        video.load();
      }
    };
  }, [activePlaybackUrl, isEmbedMode, resolving, nonce, live]);

  // ── 2. Progress Restore (Movies & Episodes only) ───────────────────────────
  useEffect(() => {
    if (live) return;
    let alive = true;
    api
      .progressGet()
      .then((res) => {
        if (!alive) return;
        const item = res.items?.find(
          (i) => i.titleId === titleId && (episodeId ? i.episodeId === episodeId : true)
        );
        if (item && item.positionSeconds > 10 && item.positionSeconds < item.durationSeconds - 20) {
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
    if (pos == null || pos <= 5 || (v.duration > 0 && pos > v.duration - 15)) return;

    resumeAppliedRef.current = true;
    v.currentTime = pos;
    setResumingNotice(`${t("player.resume")} (${fmtClock(pos)})`);

    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => setResumingNotice(null), 3500);
  }, [t]);

  // ── 3. Periodic Progress Saving ───────────────────────────────────────────
  const saveProgress = useCallback(() => {
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
    return () => {
      saveProgress();
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      if (skipFeedbackTimerRef.current) clearTimeout(skipFeedbackTimerRef.current);
    };
  }, [saveProgress]);

  // ── 4. Controls Idle Auto-Fade ─────────────────────────────────────────────
  const resetIdleTimer = useCallback(() => {
    setControlsVisible(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    // If video is playing and no menus are open, fade controls after 3 seconds
    if (playing && !speedMenuOpen && !qualityMenuOpen && !subtitleMenuOpen) {
      idleTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    }
  }, [playing, speedMenuOpen, qualityMenuOpen, subtitleMenuOpen]);

  useEffect(() => {
    resetIdleTimer();
  }, [resetIdleTimer]);

  // ── 5. Media Events & Time Updating ───────────────────────────────────────
  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;

    const cur = v.currentTime;
    setCurrent(cur);

    // Periodic progress save every 6 seconds
    if (!live && cur - lastSavedRef.current >= 6) {
      lastSavedRef.current = cur;
      saveProgress();
    }

    // Skip Intro button detection (e.g., between introStart and introEnd)
    const effectiveIntroStart = introStart ?? 15;
    const effectiveIntroEnd = introEnd ?? 85;
    if (episodeId && cur >= effectiveIntroStart && cur <= effectiveIntroEnd) {
      setShowSkipIntro(true);
    } else {
      setShowSkipIntro(false);
    }

    // Next Episode Countdown detection (last 25 seconds of an episode)
    if (nextEpisode && v.duration > 60 && cur >= v.duration - 25) {
      const remaining = Math.max(0, Math.ceil(v.duration - cur));
      setNextCountdown(remaining);
    } else {
      setNextCountdown(null);
    }
  };

  const onLoadedMetadata = () => {
    const v = videoRef.current;
    if (v) setDuration(v.duration || 0);
    applyResume();
  };

  const onProgress = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    try {
      if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1));
    } catch {}
  };

  // ── 6. Player Actions ─────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v || error) return;
    if (v.paused) {
      void v.play().catch(() => {});
    } else {
      v.pause();
    }
    resetIdleTimer();
  }, [error, resetIdleTimer]);

  const seekBy = useCallback(
    (delta: number) => {
      const v = videoRef.current;
      if (!v || live || !Number.isFinite(v.duration)) return;
      v.currentTime = Math.min(v.duration - 0.2, Math.max(0, v.currentTime + delta));
      setCurrent(v.currentTime);

      setSkipFeedback(delta > 0 ? "forward" : "rewind");
      if (skipFeedbackTimerRef.current) clearTimeout(skipFeedbackTimerRef.current);
      skipFeedbackTimerRef.current = setTimeout(() => setSkipFeedback(null), 800);

      resetIdleTimer();
    },
    [live, resetIdleTimer]
  );

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.muted && v.volume === 0) {
      v.volume = 0.7;
      setVolume(0.7);
    }
    resetIdleTimer();
  }, [resetIdleTimer]);

  const changeVolume = (val: number) => {
    const v = videoRef.current;
    if (!v) return;
    const clamped = Math.max(0, Math.min(1, val));
    setVolume(clamped);
    v.volume = clamped;
    v.muted = clamped === 0;
    setMuted(clamped === 0);
    resetIdleTimer();
  };

  const toggleFullscreen = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    } else {
      void el.requestFullscreen?.().catch(() => {});
    }
    resetIdleTimer();
  }, [resetIdleTimer]);

  const togglePiP = useCallback(async () => {
    const v = videoRef.current;
    if (!v || !document.pictureInPictureEnabled) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setPipActive(false);
      } else {
        await v.requestPictureInPicture();
        setPipActive(true);
      }
    } catch {}
    resetIdleTimer();
  }, [resetIdleTimer]);

  const handleSkipIntro = () => {
    const v = videoRef.current;
    if (!v) return;
    const target = (introEnd ?? 85) + 1;
    v.currentTime = target;
    setCurrent(target);
    setShowSkipIntro(false);
    resetIdleTimer();
  };

  const handleSpeedChange = (spd: number) => {
    const v = videoRef.current;
    if (v) v.playbackRate = spd;
    setPlaybackSpeed(spd);
    setSpeedMenuOpen(false);
    resetIdleTimer();
  };

  const handleQualityChange = (levelId: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelId;
    }
    setSelectedQuality(levelId);
    setQualityMenuOpen(false);
    resetIdleTimer();
  };

  const handleSubtitleChange = (langCode: string) => {
    const v = videoRef.current;
    if (!v) return;
    const tracks = v.textTracks;
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      if (langCode === "off") {
        track.mode = "disabled";
      } else if (track.language === langCode) {
        track.mode = "showing";
      } else {
        track.mode = "disabled";
      }
    }
    setSelectedSubtitle(langCode);
    setSubtitleMenuOpen(false);
    resetIdleTimer();
  };

  const handleAudioTrackChange = (trackId: number) => {
    if (hlsRef.current) {
      hlsRef.current.audioTrack = trackId;
    }
    setSelectedAudioTrack(trackId);
    setAudioMenuOpen(false);
    resetIdleTimer();
  };

  const goLive = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (hlsRef.current && typeof hlsRef.current.liveSyncPosition === "number") {
      v.currentTime = hlsRef.current.liveSyncPosition;
    } else if (Number.isFinite(v.duration) && v.duration > 0) {
      v.currentTime = Math.max(0, v.duration - 1);
    }
    void v.play().catch(() => {});
    resetIdleTimer();
  }, [resetIdleTimer]);

  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });
  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const now = Date.now();
    const touch = e.changedTouches[0];
    if (!touch) return;
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = touch.clientX - rect.left;
    const isDoubleTap = now - lastTapRef.current.time < 300 && Math.abs(x - lastTapRef.current.x) < 60;

    if (isDoubleTap && !live) {
      if (x < rect.width * 0.35) {
        seekBy(-10);
      } else if (x > rect.width * 0.65) {
        seekBy(10);
      }
      lastTapRef.current = { time: 0, x: 0 };
    } else {
      lastTapRef.current = { time: now, x };
    }
  };

  const manualRetry = () => {
    retriesRef.current = 0;
    setError(false);
    setReconnecting(true);
    setNonce((n) => n + 1);
  };

  // Fullscreen change listener
  useEffect(() => {
    const onFsChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // ── 7. Accessible Keyboard Shortcuts with Input Guard ──────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Guard: ignore typing in inputs, textareas, or contenteditables
    const target = e.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.isContentEditable
    ) {
      return;
    }

    // Number keys 0-9 seek to percentage (0% to 90%)
    if (e.key >= "0" && e.key <= "9" && !live && duration > 0) {
      e.preventDefault();
      const pct = Number(e.key) / 10;
      const v = videoRef.current;
      if (v) {
        v.currentTime = pct * duration;
        setCurrent(v.currentTime);
      }
      resetIdleTimer();
      return;
    }

    switch (e.key) {
      case " ":
      case "k":
      case "K":
        e.preventDefault();
        togglePlay();
        break;
      case "ArrowLeft":
        e.preventDefault();
        seekBy(-10);
        break;
      case "ArrowRight":
        e.preventDefault();
        seekBy(10);
        break;
      case "ArrowUp":
        e.preventDefault();
        changeVolume(volume + 0.1);
        break;
      case "ArrowDown":
        e.preventDefault();
        changeVolume(volume - 0.1);
        break;
      case "m":
      case "M":
        e.preventDefault();
        toggleMute();
        break;
      case "f":
      case "F":
        e.preventDefault();
        toggleFullscreen();
        break;
      case "p":
      case "P":
        e.preventDefault();
        void togglePiP();
        break;
      case "c":
      case "C":
        e.preventDefault();
        handleSubtitleChange(selectedSubtitle === "off" ? "ar" : "off");
        break;
    }
  };

  // Close popovers on click outside
  const closeAllMenus = () => {
    setSpeedMenuOpen(false);
    setQualityMenuOpen(false);
    setSubtitleMenuOpen(false);
    setAudioMenuOpen(false);
  };

  const isMenuOpen = speedMenuOpen || qualityMenuOpen || subtitleMenuOpen || audioMenuOpen;

  return (
    <div
      ref={wrapRef}
      data-testid="tvora-player"
      role="region"
      aria-label={title || t("player.playing")}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseMove={resetIdleTimer}
      onTouchStart={resetIdleTimer}
      onTouchEnd={handleTouchEnd}
      onClick={closeAllMenus}
      style={{
        ["--cue-size" as any]: subSize === "lg" ? "1.45rem" : subSize === "sm" ? "1rem" : "1.2rem",
        ["--cue-bg" as any]:
          subBg === "translucent"
            ? "rgba(0,0,0,0.4)"
            : subBg === "none"
            ? "transparent"
            : "rgba(0,0,0,0.85)",
      }}
      className={cn(
        "group/player relative aspect-video w-full select-none overflow-hidden rounded-xl bg-[#080808] outline-none border border-[#252525] shadow-2xl",
        !controlsVisible && playing && !isMenuOpen && "cursor-none"
      )}
    >
      {/* ── Subtitle Cue Styling ───────────────────────────────────────────── */}
      <style>{`
        [data-testid="tvora-player"] video::cue {
          font-size: var(--cue-size, 1.2rem) !important;
          background-color: var(--cue-bg, rgba(0,0,0,0.85)) !important;
          color: #ffffff !important;
          text-shadow: 0 2px 4px rgba(0,0,0,0.95);
          border-radius: 4px;
          padding: 2px 8px;
        }
      `}</style>
      {/* ── Video Element or Sandboxed Cinema Embed ───────────────────────── */}
      {isEmbedMode ? (
        <div className="absolute inset-0 h-full w-full bg-[#080808]">
          <iframe
            src={resolvedStream.embedUrl}
            title={title || "TVORA Cinema Stream"}
            className="h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
      ) : (
        <video
          ref={(el) => {
            (videoRef as any).current = el;
            onVideoEl?.(el);
          }}
          poster={poster}
          className="absolute inset-0 h-full w-full bg-[#080808] object-contain"
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
            saveProgress();
          }}
          onEnded={() => {
            setPlaying(false);
            saveProgress();
            onEnded?.();
          }}
          onTimeUpdate={onTimeUpdate}
          onProgress={onProgress}
          onDurationChange={() => {
            const v = videoRef.current;
            if (v && Number.isFinite(v.duration)) setDuration(v.duration);
          }}
          onError={() => {
            if (resolvedStream?.embedUrl) {
              setResolvedStream({ type: "embed", embedUrl: resolvedStream.embedUrl });
              return;
            }
            if (retriesRef.current < MAX_AUTO_RETRIES) {
              retriesRef.current += 1;
              setReconnecting(true);
              setTimeout(() => setNonce((n) => n + 1), 1500 * retriesRef.current);
            } else {
              setReconnecting(false);
              setError(true);
            }
          }}
          onClick={(e) => {
            e.stopPropagation();
            closeAllMenus();
            togglePlay();
          }}
        >
          {/* Subtitle WebVTT Tracks */}
          {subtitles.map((sub) => (
            <track
              key={sub.srclang}
              label={sub.label}
              kind="subtitles"
              srcLang={sub.srclang}
              src={sub.src}
              default={sub.default}
            />
          ))}
        </video>
      )}

      {/* ── Top Bar: Badges, Title, Reconnect Status ───────────────────────── */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent transition-opacity duration-300",
          controlsVisible || !playing || isMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          {live && (
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded bg-[#E50914] px-2.5 py-1 text-[11px] font-black uppercase tracking-widest text-white shadow-[0_0_15px_rgba(229,9,20,0.6)]"
                data-testid="player-live-badge"
              >
                <PulseRing color="#ffffff" />
                {t("hero.live")}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goLive();
                }}
                className="inline-flex items-center gap-1 rounded bg-[#252525]/90 hover:bg-[#E50914] px-2 py-0.5 text-[10px] font-bold text-white transition active:scale-95 shadow"
                title={t("player.goLive")}
              >
                <Radio className="h-3 w-3" />
                {t("player.goLive")}
              </button>
            </div>
          )}
          {title && (
            <h3 className="truncate text-sm font-bold text-white drop-shadow-md sm:text-base">
              {title}
            </h3>
          )}
          {liveInfo?.homeTeam && liveInfo?.awayTeam && (
            <div className="hidden sm:flex items-center gap-2 rounded-lg bg-[#111111]/85 border border-[#252525] px-3 py-1 text-xs backdrop-blur-md">
              <span className="font-bold text-white">{liveInfo.homeTeam}</span>
              <span className="text-[#E50914] font-black">{liveInfo.score || "VS"}</span>
              <span className="font-bold text-white">{liveInfo.awayTeam}</span>
              {liveInfo.competition && (
                <span className="text-white/40 text-[10px]">· {liveInfo.competition}</span>
              )}
            </div>
          )}
        </div>

        {/* Resuming / Reconnecting Notices */}
        <div className="flex items-center gap-2">
          {resumingNotice && (
            <div className="rounded-full bg-[#111111]/90 border border-[#252525] px-3.5 py-1 text-xs font-semibold text-white/95 backdrop-blur-md shadow-lg animate-in fade-in">
              {resumingNotice}
            </div>
          )}
          {reconnecting && !error && (
            <div className="flex items-center gap-2 rounded-full bg-[#E50914]/20 border border-[#E50914]/40 px-3.5 py-1 text-xs font-bold text-[#ff8a8e] backdrop-blur-md">
              <span className="h-2 w-2 animate-ping rounded-full bg-[#E50914]" />
              {t("player.reconnecting")}
            </div>
          )}
        </div>
      </div>

      {/* ── Center Play / Pause Indicator ─────────────────────────────────── */}
      {!isEmbedMode && !playing && ready && !error && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          aria-label={t("player.play")}
          className="tv-focusable absolute left-1/2 top-1/2 z-20 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#111111]/80 border border-[#252525] text-white shadow-[0_0_40px_rgba(0,0,0,0.8)] backdrop-blur-md transition-transform duration-200 hover:scale-110 hover:border-[#E50914] hover:shadow-[0_0_30px_rgba(229,9,20,0.4)]"
        >
          <Play className="h-9 w-9 fill-white text-white ms-1" aria-hidden />
        </button>
      )}

      {/* ── Momentary Skip Feedback Ripples ────────────────────────────────── */}
      {skipFeedback && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 rounded-full bg-black/75 px-5 py-3 text-sm font-bold text-white backdrop-blur-md animate-in zoom-in-90 fade-in duration-150">
          {skipFeedback === "forward" ? (
            <>
              <RotateCw className="h-5 w-5 text-[#E50914]" />
              <span>+10s</span>
            </>
          ) : (
            <>
              <RotateCcw className="h-5 w-5 text-[#E50914]" />
              <span>-10s</span>
            </>
          )}
        </div>
      )}

      {/* ── Skip Intro Button ──────────────────────────────────────────────── */}
      {showSkipIntro && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleSkipIntro();
          }}
          className="absolute bottom-24 end-6 z-20 inline-flex items-center gap-2 rounded-lg bg-[#111111]/90 border border-[#252525] px-4 py-2 text-xs font-bold text-white shadow-xl backdrop-blur-md transition hover:border-[#E50914] hover:bg-[#E50914] active:scale-95"
        >
          <FastForward className="h-4 w-4" /> {t("player.skipIntro")}
        </button>
      )}

      {/* ── Next Episode Countdown Overlay ─────────────────────────────────── */}
      {nextCountdown !== null && nextEpisode && (
        <NextEpisodeOverlay
          nextEpisode={nextEpisode}
          secondsLeft={nextCountdown}
          onPlayNow={() => {
            setNextCountdown(null);
            nextEpisode.onClick?.();
          }}
          onCancel={() => setNextCountdown(null)}
        />
      )}

      {/* ── Loading Overlay ────────────────────────────────────────────────── */}
      {resolving && <PlayerLoading label="جاري استخراج رابط البث والسينما..." />}
      {!resolving && !isEmbedMode && !ready && !error && <PlayerLoading label={t("player.loadingStream")} />}

      {/* ── Error Card ─────────────────────────────────────────────────────── */}
      {!resolving && !isEmbedMode && error && <PlayerError onRetry={manualRetry} />}

      {/* ── Bottom Control Bar ─────────────────────────────────────────────── */}
      {!isEmbedMode && (
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[#080808] via-[#080808]/80 to-transparent px-4 pb-3.5 pt-14 transition-all duration-300",
            controlsVisible || !playing || isMenuOpen
              ? "translate-y-0 opacity-100"
              : "translate-y-4 opacity-0 pointer-events-none"
          )}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Timeline Seek Bar (or Live Badge) */}
        {live ? (
          <div className="mb-2 flex items-center justify-between gap-3 text-xs text-white/60">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-[#E50914] animate-pulse" />
              <span className="font-bold text-white">{t("hero.live")}</span>
              {liveInfo?.channelName && (
                <span className="text-white/40">· {liveInfo.channelName}</span>
              )}
              {liveInfo?.nowPlaying && (
                <span className="text-white/60">({liveInfo.nowPlaying})</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goLive}
                className="inline-flex items-center gap-1 rounded bg-[#E50914] px-2.5 py-1 text-[11px] font-bold text-white shadow hover:bg-[#b80710] active:scale-95 transition"
              >
                <Radio className="h-3 w-3" />
                {t("player.goLive")}
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-2">
            <CinematicSeekBar
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

        {/* Action Controls Row */}
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Left Controls: Play/Pause, Rewind, Forward, Volume, Time */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Play/Pause */}
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? t("player.pause") : t("player.play")}
              className="tv-focusable flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-white/10 hover:text-[#E50914] active:scale-95"
            >
              {playing ? (
                <Pause className="h-5 w-5 fill-current" aria-hidden />
              ) : (
                <Play className="h-5 w-5 fill-current" aria-hidden />
              )}
            </button>

            {/* Rewind 10s & Forward 10s */}
            {!live && (
              <>
                <button
                  type="button"
                  onClick={() => seekBy(-10)}
                  aria-label={t("player.rewind10")}
                  className="tv-focusable flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  <RotateCcw className="h-4.5 w-4.5" />
                </button>
                <button
                  type="button"
                  onClick={() => seekBy(10)}
                  aria-label={t("player.forward10")}
                  className="tv-focusable flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  <RotateCw className="h-4.5 w-4.5" />
                </button>
              </>
            )}

            {/* Volume Control */}
            <div className="group/vol flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleMute}
                aria-label={muted ? t("player.unmute") : t("player.mute")}
                className="tv-focusable flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                {muted || volume === 0 ? (
                  <VolumeX className="h-4.5 w-4.5 text-[#E50914]" />
                ) : volume < 0.5 ? (
                  <Volume1 className="h-4.5 w-4.5" />
                ) : (
                  <Volume2 className="h-4.5 w-4.5" />
                )}
              </button>
              <input
                type="range"
                dir="ltr"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => changeVolume(Number(e.target.value))}
                aria-label={t("player.volume")}
                className="hidden h-1 w-16 cursor-pointer accent-[#E50914] sm:block group-hover/vol:w-20 transition-[width] duration-200"
              />
            </div>

            {/* Time Stamp */}
            {!live && (
              <span className="text-xs font-semibold tabular-nums text-white/80 select-none ps-1" dir="ltr">
                {fmtClock(current)} <span className="text-white/35">/ {fmtClock(duration)}</span>
              </span>
            )}
          </div>

          {/* Right Controls: Subtitles, Speed, Quality, PiP, Fullscreen */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Subtitles CC Menu */}
            {subtitles.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setSubtitleMenuOpen(!subtitleMenuOpen);
                    setSpeedMenuOpen(false);
                    setQualityMenuOpen(false);
                  }}
                  aria-label={t("player.subtitles")}
                  aria-expanded={subtitleMenuOpen}
                  className={cn(
                    "tv-focusable flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white",
                    selectedSubtitle !== "off" && "text-[#E50914]"
                  )}
                >
                  <Subtitles className="h-4.5 w-4.5" />
                </button>

                {subtitleMenuOpen && (
                  <div className="absolute end-0 bottom-11 z-30 min-w-[140px] rounded-xl border border-[#252525] bg-[#111111]/95 p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
                      {t("player.subtitles")}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSubtitleChange("off")}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white",
                        selectedSubtitle === "off" && "text-[#E50914] font-bold"
                      )}
                    >
                      <span>{t("player.subtitlesOff")}</span>
                      {selectedSubtitle === "off" && <Check className="h-3.5 w-3.5" />}
                    </button>
                    {subtitles.map((sub) => (
                      <button
                        key={sub.srclang}
                        type="button"
                        onClick={() => handleSubtitleChange(sub.srclang)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white",
                          selectedSubtitle === sub.srclang && "text-[#E50914] font-bold"
                        )}
                      >
                        <span>{sub.label}</span>
                        {selectedSubtitle === sub.srclang && <Check className="h-3.5 w-3.5" />}
                      </button>
                    ))}

                    {/* Subtitle Appearance Settings */}
                    {selectedSubtitle !== "off" && (
                      <div className="mt-2 border-t border-[#252525] pt-2">
                        <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
                          {t("player.subtitles")}
                        </div>
                        {/* Font size */}
                        <div className="flex items-center justify-between px-2.5 py-1 text-[11px] text-white/70">
                          <span>Size</span>
                          <div className="flex gap-1">
                            {(["sm", "md", "lg"] as const).map((sz) => (
                              <button
                                key={sz}
                                type="button"
                                onClick={() => setSubSize(sz)}
                                className={cn(
                                  "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase transition",
                                  subSize === sz
                                    ? "bg-[#E50914] text-white"
                                    : "bg-white/10 text-white/60 hover:text-white"
                                )}
                              >
                                {sz}
                              </button>
                            ))}
                          </div>
                        </div>
                        {/* Background opacity */}
                        <div className="flex items-center justify-between px-2.5 py-1 text-[11px] text-white/70">
                          <span>Opacity</span>
                          <div className="flex gap-1">
                            {(["dark", "translucent", "none"] as const).map((bg) => (
                              <button
                                key={bg}
                                type="button"
                                onClick={() => setSubBg(bg)}
                                className={cn(
                                  "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase transition",
                                  subBg === bg
                                    ? "bg-[#E50914] text-white"
                                    : "bg-white/10 text-white/60 hover:text-white"
                                )}
                              >
                                {bg === "dark" ? "100%" : bg === "translucent" ? "50%" : "0%"}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Audio Tracks Menu */}
            {audioTracks.length > 1 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setAudioMenuOpen(!audioMenuOpen);
                    setSubtitleMenuOpen(false);
                    setSpeedMenuOpen(false);
                    setQualityMenuOpen(false);
                  }}
                  aria-label="Audio Tracks"
                  aria-expanded={audioMenuOpen}
                  className={cn(
                    "tv-focusable flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white",
                    selectedAudioTrack !== -1 && "text-[#E50914]"
                  )}
                >
                  <Sliders className="h-4.5 w-4.5" />
                </button>

                {audioMenuOpen && (
                  <div className="absolute end-0 bottom-11 z-30 min-w-[140px] rounded-xl border border-[#252525] bg-[#111111]/95 p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
                      Audio
                    </div>
                    {audioTracks.map((trk) => (
                      <button
                        key={trk.id}
                        type="button"
                        onClick={() => handleAudioTrackChange(trk.id)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white",
                          selectedAudioTrack === trk.id && "text-[#E50914] font-bold"
                        )}
                      >
                        <span>{trk.label}</span>
                        {selectedAudioTrack === trk.id && <Check className="h-3.5 w-3.5" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Playback Speed Menu */}
            {!live && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setSpeedMenuOpen(!speedMenuOpen);
                    setSubtitleMenuOpen(false);
                    setQualityMenuOpen(false);
                  }}
                  aria-label={t("player.speed")}
                  aria-expanded={speedMenuOpen}
                  className="tv-focusable flex h-9 min-w-[36px] items-center justify-center rounded-full px-2 text-xs font-mono font-bold text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  {playbackSpeed}x
                </button>

                {speedMenuOpen && (
                  <div className="absolute end-0 bottom-11 z-30 min-w-[120px] rounded-xl border border-[#252525] bg-[#111111]/95 p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
                      {t("player.speed")}
                    </div>
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => handleSpeedChange(spd)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-mono text-white/80 hover:bg-white/10 hover:text-white",
                          playbackSpeed === spd && "text-[#E50914] font-bold"
                        )}
                      >
                        <span>{spd}x</span>
                        {playbackSpeed === spd && <Check className="h-3.5 w-3.5" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Quality Menu (HLS ABR Levels) */}
            {qualityLevels.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setQualityMenuOpen(!qualityMenuOpen);
                    setSpeedMenuOpen(false);
                    setSubtitleMenuOpen(false);
                  }}
                  aria-label={t("player.quality")}
                  aria-expanded={qualityMenuOpen}
                  className="tv-focusable flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  <Settings className="h-4.5 w-4.5" />
                </button>

                {qualityMenuOpen && (
                  <div className="absolute end-0 bottom-11 z-30 min-w-[140px] rounded-xl border border-[#252525] bg-[#111111]/95 p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
                      {t("player.quality")}
                    </div>
                    {/* Auto */}
                    <button
                      type="button"
                      onClick={() => handleQualityChange(-1)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white",
                        selectedQuality === -1 && "text-[#E50914] font-bold"
                      )}
                    >
                      <span>{t("player.auto")}</span>
                      {selectedQuality === -1 && <Check className="h-3.5 w-3.5" />}
                    </button>
                    {/* Available levels */}
                    {qualityLevels.map((lvl) => (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => handleQualityChange(lvl.id)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white",
                          selectedQuality === lvl.id && "text-[#E50914] font-bold"
                        )}
                      >
                        <span>{lvl.label}</span>
                        {selectedQuality === lvl.id && <Check className="h-3.5 w-3.5" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Picture-in-Picture Button */}
            {typeof document !== "undefined" && document.pictureInPictureEnabled && (
              <button
                type="button"
                onClick={togglePiP}
                aria-label={t("player.pip")}
                aria-pressed={pipActive}
                className="tv-focusable flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white active:scale-95"
              >
                <PictureInPicture className="h-4.5 w-4.5" />
              </button>
            )}

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={fullscreen ? t("player.exitFullscreen") : t("player.fullscreen")}
              className="tv-focusable flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white active:scale-95"
            >
              {fullscreen ? (
                <Minimize className="h-4.5 w-4.5" />
              ) : (
                <Maximize className="h-4.5 w-4.5" />
              )}
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

// ─── Player skeleton (page-level loading state) ──────────────────────────────
export function PlayerSkeleton() {
  const { t } = useT();
  return (
    <div
      className="relative aspect-video w-full overflow-hidden rounded-xl border border-[#252525] bg-[#080808]"
      aria-hidden
    >
      <div className="tv-shimmer absolute inset-0" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        <Clapperboard className="h-10 w-10 animate-pulse text-[#E50914]/70" />
        <p className="text-sm font-medium text-white/50">{t("player.loadingStream")}</p>
      </div>
    </div>
  );
}

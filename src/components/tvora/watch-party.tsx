"use client";
// TVORA Watch Party — real-time synchronized watching + live chat (task 6-c).
// Talks to the independent socket.io mini service on port 3005 through the Caddy
// gateway (XTransformPort), following the sanctioned examples/websocket pattern.
//
// Design (chosen over the imperative PartyApi variant): a single hook
// `useWatchParty` owns the socket + room state and attaches itself to the
// underlying <video> element through `getVideoEl` (identity re-checked on a 1s
// interval) — the host's play/pause/seeked events + a 5s heartbeat broadcast
// `party:sync`, members apply `party:playback` with a wall-clock drift
// correction. `WatchPartyPanel` is the UI. Deep-link ?party=CODE is parsed by
// watch-view which then calls join() automatically.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { io, type Socket } from "socket.io-client";
import { BadgeCheck, Check, Copy, LogIn, LogOut, SendHorizontal, Users, X } from "lucide-react";
import { toast } from "sonner";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { useAppStore } from "@/lib/store";
import type { Lang, SessionUser } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EmptyState, useT } from "./shared";
import { PulseRing, useMotionAllowed } from "./motion-fx";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PartyStatus = "idle" | "connecting" | "connected" | "error";
export type PartyError = "room-not-found" | "name-required" | null;

export type PartyMember = { id: string; name: string; joinedAt: number };
export type PartyPlayback = {
  positionSeconds: number;
  isPlaying: boolean;
  updatedAt: number;
  titleId: string | null;
  kind: string | null;
};
export type PartyMessage =
  | { id: string; ts: number; type: "user"; name: string; content: string }
  | { id: string; ts: number; type: "system"; event: "join" | "leave" | "host"; name?: string };
export type PartyRoom = {
  code: string;
  hostId: string | null;
  members: PartyMember[];
  messages: PartyMessage[];
  playback: PartyPlayback | null;
};

type PartyAck = { ok: true; code: string } | { ok: false; error?: "room-not-found" | "name-required" };
type PartyStateSnapshot = {
  code: string;
  yourSocketId: string;
  hostId: string | null;
  members?: PartyMember[];
  messages?: PartyMessage[];
  playback?: PartyPlayback | null;
};

export type WatchParty = ReturnType<typeof useWatchParty>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const NAME_KEY = "tvora:party-name";
const AVATAR_COLORS = ["#d8c9a3", "#9fb7cb", "#c7a39a", "#b5c9a3", "#c9bba3", "#a3c0c9"];
const CODE_RE = /^[A-Z0-9]{6}$/;

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/** Remembered display name → session user name → localized guest name + 2 digits. */
export function defaultPartyName(lang: Lang, user: SessionUser | null): string {
  if (typeof window === "undefined") return "";
  try {
    const saved = window.localStorage.getItem(NAME_KEY);
    if (saved && saved.trim()) return saved.trim().slice(0, 24);
  } catch {
    /* storage unavailable */
  }
  if (user?.name && user.name.trim()) return user.name.trim().slice(0, 24);
  const n = Math.floor(10 + Math.random() * 90);
  return lang === "ar" ? `ضيف TVORA ${n}` : `TVORA Guest ${n}`;
}

function persistName(name: string) {
  try {
    window.localStorage.setItem(NAME_KEY, name);
  } catch {
    /* storage unavailable */
  }
}

const inputCls =
  "tv-focusable h-11 w-full rounded-md border border-white/15 bg-white/[0.04] px-3 text-sm text-white/90 outline-none transition placeholder:text-white/25 focus:border-[#9fb7cb]/60 focus:bg-white/[0.06]";

// ─── The hook ─────────────────────────────────────────────────────────────────

export function useWatchParty({
  getVideoEl,
  isLive,
  currentTitleId,
  currentKind,
  invitePath,
}: {
  getVideoEl: () => HTMLVideoElement | null;
  isLive: boolean;
  /** route id of the content currently open (title id) */
  currentTitleId?: string;
  /** "movie" | "episode" | "match" */
  currentKind?: string;
  /** hash path of the current watch view WITHOUT the party param, e.g. "#/watch/t1?ep=e2" */
  invitePath: string;
}) {
  const socketRef = useRef<Socket | null>(null);
  const lastActionRef = useRef<{ type: "create" | "join"; code: string; name: string } | null>(null);
  const reconnectSeenRef = useRef(false);
  const roomRef = useRef<PartyRoom | null>(null);
  const isHostRef = useRef(false);
  const titleIdRef = useRef<string | undefined>(currentTitleId);
  const kindRef = useRef<string | undefined>(currentKind);
  const isLiveRef = useRef(isLive);
  const elRef = useRef<HTMLVideoElement | null>(null);
  const pendingPlaybackRef = useRef<PartyPlayback | null>(null);
  const seekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [videoVersion, setVideoVersion] = useState(0);
  const [status, setStatus] = useState<PartyStatus>("idle");
  const [room, setRoom] = useState<PartyRoom | null>(null);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [error, setError] = useState<PartyError>(null);

  const isHost = Boolean(room && selfId && room.hostId && room.hostId === selfId);

  // Mirror the latest values for socket/media event handlers (runs every render).
  useEffect(() => {
    roomRef.current = room;
    isHostRef.current = isHost;
    titleIdRef.current = currentTitleId;
    kindRef.current = currentKind;
    isLiveRef.current = isLive;
  });

  // Video element identity re-check (the player mounts/unmounts it per source).
  useEffect(() => {
    const id = window.setInterval(() => {
      const el = getVideoEl();
      if (el !== elRef.current) {
        elRef.current = el;
        setVideoVersion((v) => v + 1);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [getVideoEl]);

  // Final cleanup.
  useEffect(() => {
    return () => {
      socketRef.current?.removeAllListeners();
      socketRef.current?.disconnect();
      socketRef.current = null;
      if (seekTimerRef.current) clearTimeout(seekTimerRef.current);
    };
  }, []);

  // ── Member-side application of remote playback ──────────────────────────────
  const applyPlayback = useCallback((pb: PartyPlayback): boolean => {
    const el = elRef.current;
    if (!el) return false; // video not mounted yet → retried by the member interval
    if (pb.titleId && titleIdRef.current && pb.titleId !== titleIdRef.current) {
      return true; // host moved to different content — applying here would be wrong; skip silently
    }
    const drift = pb.isPlaying ? Math.max(0, Date.now() - pb.updatedAt) / 1000 : 0;
    const target = Math.max(0, pb.positionSeconds + drift);
    const diff = el.currentTime - target;
    // Live matches: only ever jump forward to the host edge; VOD: snap when off by >1.8s.
    if (isLiveRef.current ? diff < -2.5 : Math.abs(diff) > 1.8) {
      try {
        el.currentTime = target;
      } catch {
        /* not seekable yet */
      }
    }
    if (pb.isPlaying && el.paused) void el.play().catch(() => {});
    else if (!pb.isPlaying && !el.paused) el.pause();
    return true;
  }, []);

  // ── Host-side broadcast of local playback ───────────────────────────────────
  const emitSync = useCallback(() => {
    const s = socketRef.current;
    if (!s || !s.connected || !isHostRef.current || !roomRef.current) return;
    const el = elRef.current;
    if (!el) return;
    s.emit("party:sync", {
      positionSeconds: Number.isFinite(el.currentTime) ? el.currentTime : 0,
      isPlaying: !el.paused && !el.ended,
      titleId: titleIdRef.current,
      kind: kindRef.current,
    });
  }, []);

  const ensureSocket = useCallback((): Socket => {
    if (socketRef.current) return socketRef.current;
    // Sanctioned connection pattern — NEVER a host/port in the URL.
    const s = io("/?XTransformPort=3005", {
      path: "/",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      timeout: 10000,
    });
    socketRef.current = s;

    s.on("connect", () => {
      setSelfId(s.id ?? null);
      const act = lastActionRef.current;
      if (reconnectSeenRef.current && act && roomRef.current) {
        // dropped mid-session → re-join the same room with the same identity
        setStatus("connecting");
        s.emit("party:join", { code: act.code, name: act.name }, (res: PartyAck) => {
          if (!res?.ok) {
            if (act.type === "create") {
              // room expired while away → quietly create a fresh one
              s.emit("party:create", { name: act.name }, (res2: PartyAck) => {
                if (res2?.ok) lastActionRef.current = { type: "create", code: res2.code, name: act.name };
                else setStatus("error");
              });
            } else {
              lastActionRef.current = null;
              roomRef.current = null;
              setRoom(null);
              setError("room-not-found");
              setStatus("error");
            }
          }
        });
      } else if (!roomRef.current) {
        setStatus("connected");
      }
      reconnectSeenRef.current = true;
    });

    s.on("disconnect", () => {
      if (lastActionRef.current) setStatus("error"); // red "disconnected — reconnecting…" chip
    });

    s.on("connect_error", () => {
      if (!roomRef.current) setStatus("error");
    });

    s.on("party:state", (snap: PartyStateSnapshot) => {
      const next: PartyRoom = {
        code: snap?.code ?? "",
        hostId: snap?.hostId ?? null,
        members: Array.isArray(snap?.members) ? snap.members : [],
        messages: Array.isArray(snap?.messages) ? snap.messages : [],
        playback: snap?.playback ?? null,
      };
      setRoom(next);
      setError(null);
      setStatus("connected");
      if (next.playback && !isHostRef.current) {
        pendingPlaybackRef.current = next.playback;
        applyPlayback(next.playback);
      }
    });

    s.on("party:members", (data: { members?: PartyMember[]; hostId?: string | null }) => {
      setRoom((prev) =>
        prev
          ? {
              ...prev,
              members: Array.isArray(data?.members) ? data.members : prev.members,
              hostId: data?.hostId ?? prev.hostId,
            }
          : prev
      );
    });

    s.on("party:chat", (msg: PartyMessage) => {
      if (!msg || typeof msg !== "object" || !msg.id) return;
      setRoom((prev) => {
        if (!prev) return prev;
        if (prev.messages.some((m) => m.id === msg.id)) return prev; // snapshot overlap dedupe
        return { ...prev, messages: [...prev.messages, msg].slice(-80) };
      });
    });

    s.on("party:playback", (pb: PartyPlayback) => {
      if (!pb || typeof pb.positionSeconds !== "number") return;
      if (isHostRef.current) return; // host is the source of truth
      pendingPlaybackRef.current = pb;
      applyPlayback(pb);
    });

    return s;
  }, [applyPlayback]);

  // ── Public actions ──────────────────────────────────────────────────────────
  const create = useCallback(
    (rawName: string) => {
      const name = rawName.trim().replace(/\s+/g, " ").slice(0, 24);
      if (!name) {
        setError("name-required");
        return;
      }
      persistName(name);
      setError(null);
      setRoom(null);
      roomRef.current = null;
      setStatus("connecting");
      lastActionRef.current = { type: "create", code: "", name };
      const s = ensureSocket();
      s.emit("party:create", { name }, (res: PartyAck) => {
        if (res?.ok) {
          lastActionRef.current = { type: "create", code: res.code, name };
        } else {
          setError(res?.error ?? "room-not-found");
          setStatus(s.connected ? "connected" : "error");
          lastActionRef.current = null;
        }
      });
    },
    [ensureSocket]
  );

  const join = useCallback(
    (rawCode: string, rawName: string) => {
      const name = rawName.trim().replace(/\s+/g, " ").slice(0, 24);
      const code = rawCode.trim().toUpperCase();
      if (!name) {
        setError("name-required");
        return;
      }
      if (!CODE_RE.test(code)) {
        setError("room-not-found");
        return;
      }
      persistName(name);
      setError(null);
      setRoom(null);
      roomRef.current = null;
      setStatus("connecting");
      lastActionRef.current = { type: "join", code, name };
      const s = ensureSocket();
      s.emit("party:join", { code, name }, (res: PartyAck) => {
        if (res?.ok) {
          lastActionRef.current = { type: "join", code: res.code, name };
        } else {
          setError(res?.error ?? "room-not-found");
          setStatus(s.connected ? "connected" : "error");
          lastActionRef.current = null;
        }
      });
    },
    [ensureSocket]
  );

  const leave = useCallback(() => {
    const s = socketRef.current;
    if (s) {
      if (s.connected) s.emit("party:leave");
      s.removeAllListeners();
      s.disconnect();
      socketRef.current = null;
    }
    lastActionRef.current = null;
    reconnectSeenRef.current = false;
    roomRef.current = null;
    pendingPlaybackRef.current = null;
    setRoom(null);
    setSelfId(null);
    setError(null);
    setStatus("idle");
  }, []);

  const sendChat = useCallback((raw: string) => {
    const content = raw.trim().slice(0, 300);
    const s = socketRef.current;
    if (!s || !content || !roomRef.current) return;
    s.emit("party:chat", { content });
  }, []);

  const inviteUrl = useMemo(() => {
    if (!room?.code || typeof window === "undefined") return "";
    const path = invitePath || "#/watch";
    const sep = path.includes("?") ? "&" : "?";
    return `${window.location.origin}/${path}${sep}party=${room.code}`;
  }, [room?.code, invitePath]);

  const copyInvite = useCallback(async (): Promise<boolean> => {
    if (!inviteUrl) return false;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      return true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = inviteUrl;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        ta.remove();
        return ok;
      } catch {
        return false;
      }
    }
  }, [inviteUrl]);

  const dismissError = useCallback(() => setError(null), []);

  // ── Host wiring: video events + heartbeat + source-change push ───────────────
  useEffect(() => {
    if (!room?.code || !isHost) return;
    const el = elRef.current;
    if (!el) return; // videoVersion bump re-runs once the element exists
    const onPlay = () => emitSync();
    const onPause = () => emitSync();
    const onSeeked = () => {
      if (seekTimerRef.current) clearTimeout(seekTimerRef.current);
      seekTimerRef.current = setTimeout(emitSync, 300); // trailing debounce on seek spam
    };
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("seeked", onSeeked);
    const heartbeat = window.setInterval(() => {
      const v = elRef.current;
      if (v && !v.paused && !v.ended) emitSync(); // 5s heartbeat while playing
    }, 5000);
    emitSync();
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("seeked", onSeeked);
      window.clearInterval(heartbeat);
      if (seekTimerRef.current) clearTimeout(seekTimerRef.current);
    };
  }, [room?.code, isHost, videoVersion, emitSync]);

  // Source changed (episode nav / new title) while hosting → push the new content id.
  useEffect(() => {
    if (!room?.code || !isHost) return;
    emitSync();
  }, [currentTitleId, room?.code, isHost, emitSync]);

  // Member wiring: retry pending playback until the video element is ready.
  useEffect(() => {
    if (!room?.code || isHost) return;
    const id = window.setInterval(() => {
      const pb = pendingPlaybackRef.current;
      if (pb && applyPlayback(pb)) pendingPlaybackRef.current = null;
    }, 1000);
    return () => {
      window.clearInterval(id);
      pendingPlaybackRef.current = null;
    };
  }, [room?.code, isHost, applyPlayback]);

  return { status, room, selfId, isHost, error, inviteUrl, create, join, leave, sendChat, copyInvite, dismissError };
}

// ─── Small local hooks ────────────────────────────────────────────────────────

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => setIsDesktop(mq.matches);
    const t = window.setTimeout(onChange, 0); // async first read (no sync setState in effect)
    mq.addEventListener("change", onChange);
    return () => {
      window.clearTimeout(t);
      mq.removeEventListener("change", onChange);
    };
  }, []);
  return isDesktop;
}

function systemText(m: Extract<PartyMessage, { type: "system" }>, t: (k: string) => string): string {
  if (m.event === "host" && m.name) return `${t("watchparty.host")}: ${m.name}`;
  if (m.name) return `${m.name} ${t(m.event === "leave" ? "watchparty.left" : "watchparty.joined")}`;
  return "";
}

// ─── The panel ────────────────────────────────────────────────────────────────

export function WatchPartyPanel({
  open,
  onClose,
  party,
}: {
  open: boolean;
  onClose: () => void;
  party: WatchParty;
}) {
  const { t, dir } = useT();
  const lang = useAppStore((s) => s.lang);
  const user = useAppStore((s) => s.user);
  const motionAllowed = useMotionAllowed();
  const isDesktop = useIsDesktop();

  const [name, setName] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const nameTouchedRef = useRef(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const messages = party.room?.messages ?? [];
  const msgCount = messages.length;

  // Prefill the display name once the panel opens (remembered name → user → guest).
  useEffect(() => {
    if (!open || nameTouchedRef.current) return;
    const id = window.setTimeout(() => setName(defaultPartyName(lang, user)), 0);
    return () => window.clearTimeout(id);
  }, [open, lang, user]);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  // Auto-scroll chat (only when already near the bottom — 120px threshold).
  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) el.scrollTo({ top: el.scrollHeight, behavior: motionAllowed ? "smooth" : "auto" });
  }, [msgCount, motionAllowed]);

  const onCreate = () => {
    if (!name.trim() || party.status === "connecting") return;
    party.create(name);
  };

  const onJoin = () => {
    if (codeInput.length !== 6 || !name.trim() || party.status === "connecting") return;
    party.join(codeInput, name);
  };

  const onCopy = async () => {
    const ok = await party.copyInvite();
    if (ok) {
      toast.success(t("watchparty.copied"));
      setCopied(true);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
    }
  };

  const onSend = () => {
    const clean = draft.trim();
    if (!clean || !party.room || party.status !== "connected") return;
    party.sendChat(clean);
    setDraft("");
  };

  const chip =
    party.status === "connected"
      ? { color: "#5fce8f", label: t("watchparty.connected") }
      : party.status === "connecting"
        ? { color: "#9fb7cb", label: t("watchparty.connecting") }
        : party.status === "error"
          ? { color: "#e5484d", label: t("watchparty.disconnected") }
          : null;

  const myName = party.room?.members.find((m) => m.id === party.selfId)?.name ?? "";
  const slideX = isDesktop ? (dir === "rtl" ? -44 : 44) : 0;
  const slideY = isDesktop ? 0 : 64;

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          key="watch-party-panel"
          role="dialog"
          aria-label={t("watchparty.title")}
          data-testid="party-panel"
          initial={motionAllowed ? { opacity: 0, x: slideX, y: slideY } : false}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={motionAllowed ? { opacity: 0, x: slideX, y: slideY, transition: { duration: 0.28, ease: EASE_OUT_EXPO } } : undefined}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
          className={cn(
            "fixed z-[65] flex flex-col border-white/10 bg-[#0a0a0c]/92 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.95)] backdrop-blur-xl",
            "max-md:inset-x-0 max-md:bottom-0 max-md:h-[72vh] max-md:rounded-t-xl max-md:border-t",
            "md:bottom-0 md:end-0 md:top-[72px] md:w-[360px] md:border-s"
          )}
        >
          {/* Header */}
          <header className="flex shrink-0 items-center gap-2.5 border-b border-white/8 px-4 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5" aria-hidden>
              <Users className="h-4 w-4 text-[#9fb7cb]" />
            </span>
            <h2 className="min-w-0 flex-1 truncate text-sm font-extrabold tracking-tight text-white/92">
              {t("watchparty.title")}
            </h2>
            {chip && (
              <span
                data-testid="party-status"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold"
                style={{ borderColor: `${chip.color}55`, color: chip.color, background: `${chip.color}14` }}
              >
                <PulseRing color={chip.color} className="scale-75" />
                {chip.label}
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label={t("misc.close")}
              data-testid="party-close"
              className="tv-focusable flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white/50 transition hover:bg-white/5 hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </header>

          {!party.room ? (
            /* ── Empty state: create / join ─────────────────────────────────── */
            <div className="tv-no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-5">
              <EmptyState
                icon={<Users className="h-5 w-5 text-white/40" aria-hidden />}
                title={t("watchparty.title")}
                hint={t("watchparty.emptyHint")}
              />

              {party.error === "room-not-found" && (
                <p
                  role="alert"
                  data-testid="party-error"
                  className="mt-3 rounded-md border border-[#e5484d]/30 bg-[#e5484d]/10 px-3 py-2 text-center text-xs font-semibold text-[#ff8a8e]"
                >
                  {t("watchparty.roomNotFound")}
                </p>
              )}

              <div className="mt-5">
                <label htmlFor="party-name" className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">
                  {t("watchparty.namePlaceholder")}
                </label>
                <input
                  id="party-name"
                  value={name}
                  onChange={(e) => {
                    nameTouchedRef.current = true;
                    setName(e.target.value);
                  }}
                  maxLength={24}
                  placeholder={t("watchparty.namePlaceholder")}
                  data-testid="party-name-input"
                  className={cn(inputCls, "mt-1.5")}
                />
                <button
                  type="button"
                  onClick={onCreate}
                  disabled={!name.trim()}
                  data-testid="party-create-btn"
                  className="tv-focusable tv-btn-sheen mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#cfe0ee] text-sm font-extrabold text-[#070708] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Users className="h-4 w-4" aria-hidden />
                  {t("watchparty.create")}
                </button>
              </div>

              <div className="my-5 flex items-center gap-3" aria-hidden>
                <span className="h-px flex-1 bg-white/8" />
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/30">{t("watchparty.join")}</span>
                <span className="h-px flex-1 bg-white/8" />
              </div>

              <div className="flex items-center gap-2">
                <input
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onJoin();
                  }}
                  maxLength={6}
                  dir="ltr"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="K7QP2X"
                  aria-label={t("watchparty.code")}
                  data-testid="party-code-input"
                  className={cn(inputCls, "min-w-0 flex-1 text-center font-mono text-base font-bold uppercase tracking-[0.3em] text-[#cfe0ee]")}
                />
                <button
                  type="button"
                  onClick={onJoin}
                  disabled={codeInput.length !== 6 || !name.trim()}
                  data-testid="party-join-btn"
                  className="tv-focusable inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-white/18 px-4 text-sm font-bold text-white/85 transition hover:border-[#9fb7cb]/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <LogIn className="h-4 w-4" aria-hidden />
                  {t("watchparty.joinAction")}
                </button>
              </div>
            </div>
          ) : (
            /* ── In room ───────────────────────────────────────────────────── */
            <>
              {/* Room bar */}
              <div className="shrink-0 border-b border-white/8 px-4 py-3" data-testid="party-room-bar">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">{t("watchparty.code")}</p>
                    <p className="mt-0.5 truncate font-mono text-xl font-black tracking-[0.3em] text-[#cfe0ee]" dir="ltr" data-testid="party-code">
                      {party.room.code}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onCopy}
                    aria-label={t("watchparty.copyLink")}
                    title={t("watchparty.copyLink")}
                    data-testid="party-copy"
                    className="tv-focusable flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/12 text-white/70 transition hover:border-[#9fb7cb]/50 hover:text-white"
                  >
                    {copied ? <Check className="h-4 w-4 text-[#5fce8f]" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-white/45">{party.isHost ? t("watchparty.hostHint") : t("watchparty.memberHint")}</p>
              </div>

              {/* Viewers */}
              <div className="shrink-0 border-b border-white/8 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
                  {t("watchparty.participants")} · <span className="tabular-nums" dir="ltr">{party.room.members.length}</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5" data-testid="party-members">
                  {party.room.members.map((m) => {
                    const self = party.selfId != null && m.id === party.selfId;
                    const host = party.room?.hostId != null && m.id === party.room.hostId;
                    return (
                      <span
                        key={m.id}
                        title={host ? t("watchparty.host") : undefined}
                        className={cn(
                          "inline-flex max-w-full items-center gap-1.5 rounded-full border py-1 ps-1.5 pe-2 text-[11px]",
                          self ? "border-[#d8c9a3]/30 bg-[#d8c9a3]/10" : "border-white/10 bg-white/[0.04]"
                        )}
                      >
                        <span
                          aria-hidden
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-black text-[#0a0a0c]"
                          style={{ background: avatarColor(m.name) }}
                        >
                          {(m.name.trim()[0] || "?").toUpperCase()}
                        </span>
                        <span className="max-w-[92px] truncate font-semibold text-white/80">{m.name}</span>
                        {host && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[#d8c9a3]" aria-label={t("watchparty.host")} />}
                        {self && <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-white/40">{t("watchparty.you")}</span>}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Chat */}
              <div ref={chatRef} data-testid="party-chat" className="tv-no-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
                {messages.map((m) =>
                  m.type === "system" ? (
                    <p key={m.id} className="px-2 text-center text-[11px] italic leading-relaxed text-white/35">
                      {systemText(m, t)}
                    </p>
                  ) : (
                    (() => {
                      const self = Boolean(myName) && m.name === myName;
                      return (
                        <div key={m.id} className={cn("flex flex-col", self ? "items-end" : "items-start")}>
                          <div
                            className={cn(
                              "max-w-[85%] rounded-lg border px-2.5 py-1.5",
                              self ? "border-[#d8c9a3]/25 bg-[#d8c9a3]/10" : "border-white/8 bg-white/5"
                            )}
                          >
                            {!self && <p className="text-[10px] font-bold text-[#9fb7cb]">{m.name}</p>}
                            <p className="whitespace-pre-wrap break-words text-[13px] leading-snug text-white/88">{m.content}</p>
                            <p className="mt-0.5 text-end text-[9px] tabular-nums text-white/30" dir="ltr">
                              {new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      );
                    })()
                  )
                )}
              </div>

              {/* Input row */}
              <div className="shrink-0 border-t border-white/8 p-3">
                <div className="flex items-center gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        onSend();
                      }
                    }}
                    maxLength={300}
                    placeholder={t("watchparty.messagePlaceholder")}
                    aria-label={t("watchparty.chat")}
                    disabled={!party.room || party.status !== "connected"}
                    data-testid="party-chat-input"
                    className={cn(inputCls, "h-10 min-w-0 flex-1")}
                  />
                  <button
                    type="button"
                    onClick={onSend}
                    disabled={!draft.trim() || party.status !== "connected"}
                    aria-label={t("watchparty.send")}
                    data-testid="party-send"
                    className="tv-focusable flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#cfe0ee] text-[#070708] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <SendHorizontal className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="flex shrink-0 items-center justify-between border-t border-white/8 px-3 py-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                  <span className="h-1 w-1 rounded-full bg-[#d8c9a3]/70" aria-hidden /> TVORA
                </span>
                <button
                  type="button"
                  onClick={party.leave}
                  data-testid="party-leave"
                  className="tv-focusable inline-flex min-h-[34px] items-center gap-1.5 rounded-md border border-white/12 px-3 text-xs font-semibold text-white/60 transition hover:border-[#e5484d]/45 hover:text-[#ff8a8e]"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden />
                  {t("watchparty.leave")}
                </button>
              </div>
            </>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

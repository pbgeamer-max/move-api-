"use client";
// SEARCH OVERLAY — cinematic universal search.
// Cmd/Ctrl+K toggle · debounced live results (AbortController) · full keyboard nav
// with listbox/aria-activedescendant pattern · recent searches (localStorage) ·
// focus trap + body scroll lock.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  Search, X, Film, Tv, Clock, Loader2, SearchX, CornerDownLeft, Sparkles,
} from "lucide-react";
import { deviceId, useAppStore } from "@/lib/store";
import { makeT } from "@/lib/i18n";
import { api } from "@/lib/api";
import { localized, type SearchPayload, type ChannelDTO, type TitleDTO } from "@/lib/types";
import { posterFor } from "@/lib/artwork";
import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { SmartImage } from "./smart-image";
import { PulseRing } from "./motion-fx";
import { TitleCard } from "./shared";

const RECENT_KEY = "tvora.recent";
const RECENT_MAX = 6;

// 5-c — fast staggered entrance for results (≤ ~0.3s total so typing feels instant)
const resultsParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.03, delayChildren: 0.02 } },
};
const resultsSection: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.16, ease: [0.22, 1, 0.36, 1], staggerChildren: 0.018 },
  },
};
const resultsRow: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.14, ease: [0.22, 1, 0.36, 1] } },
};

function loadRecents(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((x) => typeof x === "string").slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

interface Entry {
  key: string;
  section: "titles" | "channels";
  label: string;
  meta?: string;
  thumb?: { src: string; fallback: string; poster: boolean };
  icon?: React.ReactNode;
  go: () => void;
}

export function SearchOverlay() {
  const open = useAppStore((s) => s.searchOpen);
  const setOpen = useAppStore((s) => s.setSearchOpen);
  const navigate = useAppStore((s) => s.navigate);
  const lang = useAppStore((s) => s.lang);
  const t = makeT(lang);

  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [recents, setRecents] = useState<string[]>(loadRecents);
  const [focusWithin, setFocusWithin] = useState(false);
  const [rawActiveIdx, setActiveIdx] = useState(0);
  const [isMac, setIsMac] = useState(false);

  // AI mode (task 6-a) — separate from the instant search pipeline
  const [aiBusy, setAiBusy] = useState(false);
  const [aiResult, setAiResult] = useState<{ answer: string | null; items: TitleDTO[] } | null>(null);
  const [aiError, setAiError] = useState(false);
  const aiGenRef = useRef(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const recentsRef = useRef<string[]>(recents);
  const openerRef = useRef<HTMLElement | null>(null);

  const isMacState = useCallback(() => {
    if (typeof navigator === "undefined") return false;
    return /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent);
  }, []);

  // ── Recents (localStorage, max 6, deduped) ──────────────────────────────────
  const pushRecent = useCallback((term: string) => {
    const clean = term.trim();
    if (clean.length < 2) return;
    const next = [clean, ...recentsRef.current.filter((x) => x.toLowerCase() !== clean.toLowerCase())].slice(0, RECENT_MAX);
    recentsRef.current = next;
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
    setRecents(next);
  }, []);

  const clearRecents = useCallback(() => {
    recentsRef.current = [];
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {
      /* storage unavailable */
    }
    setRecents([]);
  }, []);

  // ── Open / close (resets transient state in handlers, not effect bodies) ────
  const close = useCallback(() => {
    setQ("");
    setResults(null);
    setBusy(false);
    setFocusWithin(false);
    aiGenRef.current += 1;
    setAiBusy(false);
    setAiResult(null);
    setAiError(false);
    setOpen(false);
  }, [setOpen]);

  const openFresh = useCallback(() => {
    setQ("");
    setResults(null);
    setBusy(false);
    setIsMac(isMacState());
    aiGenRef.current += 1;
    setAiBusy(false);
    setAiResult(null);
    setAiError(false);
    setOpen(true);
  }, [setOpen, isMacState]);

  // Any query edit exits AI mode back to instant search
  const updateQuery = useCallback((v: string) => {
    setQ(v);
    aiGenRef.current += 1;
    setAiBusy(false);
    setAiResult(null);
    setAiError(false);
  }, []);

  // AI smart search — one request, generation-guarded (never aborts the overlay)
  const runAiSearch = useCallback(async () => {
    const query = q.trim();
    if (query.length < 8) return;
    const gen = ++aiGenRef.current;
    abortRef.current?.abort(); // stop any pending instant search
    setResults(null);
    setBusy(false);
    setAiError(false);
    setAiResult(null);
    setAiBusy(true);
    try {
      const res = await api.aiSearch(query, lang);
      if (aiGenRef.current !== gen) return;
      setAiResult({ answer: res.answer, items: res.items });
    } catch {
      if (aiGenRef.current !== gen) return;
      setAiError(true);
    } finally {
      if (aiGenRef.current === gen) setAiBusy(false);
    }
  }, [q, lang]);

  // Global keys — registered while overlay is mounted: Cmd/Ctrl+K toggle, Escape close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        if (useAppStore.getState().searchOpen) close();
        else openFresh();
      } else if (e.key === "Escape" && useAppStore.getState().searchOpen) {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, openFresh]);

  // On open: lock scroll, autofocus, remember opener for focus restore
  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const id = window.setTimeout(() => inputRef.current?.focus(), 70);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(id);
      openerRef.current?.focus?.();
    };
  }, [open]);

  // ── Debounced live search (250ms) with AbortController ─────────────────────
  useEffect(() => {
    if (!open) return;
    const query = q.trim();
    const id = window.setTimeout(async () => {
      if (query.length < 2) {
        setResults(null);
        setBusy(false);
        return;
      }
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setBusy(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          headers: { "X-Device-Id": deviceId() },
          signal: ctrl.signal,
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as SearchPayload;
        if (!ctrl.signal.aborted) setResults(data);
      } catch (err) {
        if (!ctrl.signal.aborted) {
          setResults({ titles: [], channels: [] });
          void err;
        }
      } finally {
        if (!ctrl.signal.aborted) setBusy(false);
      }
    }, 250);
    return () => window.clearTimeout(id);
  }, [q, open]);

  // ── Flatten results into ordered keyboard-navigable entries ─────────────────
  const sections = useMemo(() => {
    if (!results) return [];
    const defs: Array<{ id: Entry["section"]; label: string; icon: React.ReactNode; entries: Entry[] }> = [];

    const titleEntries: Entry[] = results.titles.slice(0, 6).map((title: TitleDTO) => {
      const name = localized(title, lang);
      return {
        key: `t-${title.id}`,
        section: "titles",
        label: name,
        meta: `${title.releaseYear} · ${title.type === "movie" ? (lang === "ar" ? "فيلم" : "Movie") : lang === "ar" ? "مسلسل" : "Series"}`,
        thumb: { src: title.posterUrl || posterFor(title.id + name, name), fallback: posterFor(title.id + name, name), poster: true },
        go: () => {
          pushRecent(q);
          close();
          navigate({ name: "title", id: title.id });
        },
      };
    });

    const channelEntries: Entry[] = results.channels.slice(0, 5).map((ch: ChannelDTO) => ({
      key: `ch-${ch.id}`,
      section: "channels" as const,
      label: lang === "ar" ? ch.nameAr : ch.nameEn,
      meta: t(`channels.${ch.category}`),
      icon: <Tv className="h-4 w-4 text-[#9fb7cb]" aria-hidden />,
      go: () => {
        pushRecent(q);
        close();
        navigate("channels");
      },
    }));

    if (titleEntries.length) defs.push({ id: "titles", label: t("search.titles"), icon: <Film className="h-3.5 w-3.5" aria-hidden />, entries: titleEntries });
    if (channelEntries.length) defs.push({ id: "channels", label: t("search.channels"), icon: <Tv className="h-3.5 w-3.5" aria-hidden />, entries: channelEntries });
    return defs;
  }, [results, lang, t, q, pushRecent, close, navigate]);

  const flat = useMemo(() => sections.flatMap((s) => s.entries), [sections]);
  const activeIdx = Math.min(rawActiveIdx, Math.max(0, flat.length - 1));
  const query = q.trim();
  const showRecents = query.length === 0 && focusWithin && recents.length > 0;
  const hasQueryState = query.length >= 2;
  const aiMode = aiBusy || aiResult !== null || aiError;
  const showAiButton = query.length >= 8;

  const optionId = (i: number) => `tvora-search-opt-${i}`;

  const move = (dir: 1 | -1) => {
    if (flat.length === 0) return;
    const next = (activeIdx + dir + flat.length) % flat.length;
    setActiveIdx(next);
    requestAnimationFrame(() => document.getElementById(optionId(next))?.scrollIntoView({ block: "nearest" }));
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const entry = flat[activeIdx];
      if (entry) entry.go();
    }
  };

  // Basic focus trap — Tab wraps inside the panel
  const trapTab = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !panelRef.current) return;
    const els = Array.from(
      panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])')
    );
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
  };

  const kbdChip = (children: React.ReactNode) => (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-white/12 bg-white/[0.06] px-1.5 text-[10px] font-semibold text-white/55" aria-hidden>
      {children}
    </kbd>
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[80] overflow-y-auto bg-black/85 backdrop-blur-xl"
          role="dialog"
          aria-modal="true"
          aria-label={t("nav.search")}
          data-testid="search-overlay"
          onClick={close}
          onKeyDown={trapTab}
          onFocus={() => setFocusWithin(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocusWithin(false);
          }}
        >
          <div className="mx-auto w-full max-w-2xl px-4 pb-28 pt-[11vh] sm:max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, scale: 0.98, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="overflow-hidden rounded-xl border border-white/10 bg-[#0b0b0d]/90 shadow-[0_40px_120px_-30px_rgba(0,0,0,1)]"
            >
              {/* Input row */}
              <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
                <Search className="h-5 w-5 shrink-0 text-white/35" aria-hidden />
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => updateQuery(e.target.value)}
                  onKeyDown={onInputKeyDown}
                  placeholder={t("search.placeholder")}
                  aria-label={t("nav.search")}
                  role="combobox"
                  aria-expanded={hasQueryState && !aiMode}
                  aria-controls="tvora-search-listbox"
                  aria-activedescendant={flat.length > 0 && hasQueryState && !aiMode ? optionId(activeIdx) : undefined}
                  aria-autocomplete="list"
                  aria-describedby="tvora-search-hint"
                  data-testid="search-input"
                  className="w-full bg-transparent text-lg font-semibold text-white outline-none placeholder:text-white/25 sm:text-xl"
                />
                {busy && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-white/40" aria-hidden />}
                <button
                  type="button"
                  onClick={() => (q ? updateQuery("") : close())}
                  aria-label={q ? t("search.clear") : t("nav.close")}
                  className="tv-focusable flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/50 transition hover:border-white/30 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* AI smart-search action — appears for descriptive queries (task 6-a) */}
              {showAiButton && (
                <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.02] px-5 py-2.5">
                  <button
                    type="button"
                    onClick={() => void runAiSearch()}
                    disabled={aiBusy}
                    aria-label={t("ai.searchButton")}
                    data-testid="ai-search-btn"
                    className="tv-focusable inline-flex items-center gap-2 rounded-full border border-[#d8c9a3]/35 bg-[#d8c9a3]/10 px-3.5 py-1.5 text-xs font-bold text-[#d8c9a3] transition hover:border-[#d8c9a3]/60 hover:bg-[#d8c9a3]/20 hover:text-[#ead9b5] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {aiBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Sparkles className="h-3.5 w-3.5" aria-hidden />}
                    {t("ai.searchButton")}
                  </button>
                  <p className="hidden min-w-0 truncate text-[11px] text-white/30 sm:block">{t("ai.searchHint")}</p>
                </div>
              )}

              {/* Body */}
              <div className="max-h-[58vh] overflow-y-auto px-3 py-3 sm:px-4">
                {/* Recent searches */}
                {showRecents && (
                  <div className="mb-2">
                    <div className="mb-1.5 flex items-center justify-between px-2">
                      <h3 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-white/35">
                        <Clock className="h-3 w-3" aria-hidden /> {t("search.recent")}
                      </h3>
                      <button
                        type="button"
                        onClick={clearRecents}
                        className="tv-focusable rounded px-1.5 py-0.5 text-[11px] text-white/40 transition hover:text-white/80"
                      >
                        {t("search.recentClear")}
                      </button>
                    </div>
                    <div className="space-y-0.5">
                      {recents.map((term) => (
                        <button
                          key={term}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => updateQuery(term)}
                          className="tv-focusable flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start transition hover:bg-white/6"
                        >
                          <Clock className="h-3.5 w-3.5 shrink-0 text-white/30" aria-hidden />
                          <span className="truncate text-sm text-white/70">{term}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {query.length === 0 && !showRecents && (
                  <p id="tvora-search-hint" className="px-4 py-10 text-center text-sm text-white/35">
                    {t("search.hint")}
                  </p>
                )}

                {query.length === 1 && (
                  <p id="tvora-search-hint" className="px-4 py-6 text-center text-sm text-white/35">
                    {t("search.hint")}
                  </p>
                )}

                {/* Loading shimmer */}
                {hasQueryState && busy && !results && (
                  <div className="space-y-2 px-1 py-1" aria-hidden>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-lg p-2">
                        <span className="tv-shimmer h-12 w-10 shrink-0 rounded-sm" />
                        <span className="flex-1 space-y-2">
                          <span className="tv-shimmer block h-3.5 w-2/5 rounded" />
                          <span className="tv-shimmer block h-2.5 w-1/4 rounded" />
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Results (listbox pattern) — sections/rows stagger in fast.
                    Hidden while AI mode is active to avoid double results. */}
                {hasQueryState && flat.length > 0 && !aiMode && (
                  <motion.div
                    id="tvora-search-listbox"
                    role="listbox"
                    aria-label={t("nav.search")}
                    initial="hidden"
                    animate="show"
                    variants={resultsParent}
                  >
                    {sections.map((section) => (
                      <motion.div key={section.id} variants={resultsSection} className="mb-3 last:mb-1">
                        <h3 className="mb-1.5 flex items-center gap-2 px-2.5 text-[10px] font-bold uppercase tracking-[0.25em] text-white/35">
                          {section.icon} {section.label}
                        </h3>
                        <div className="space-y-0.5">
                          {section.entries.map((entry) => {
                            const idx = flat.indexOf(entry);
                            const active = idx === activeIdx;
                            return (
                              <motion.div
                                key={entry.key}
                                variants={resultsRow}
                                id={optionId(idx)}
                                role="option"
                                aria-selected={active}
                                tabIndex={-1}
                                onClick={entry.go}
                                onMouseMove={() => idx !== activeIdx && setActiveIdx(idx)}
                                data-testid="search-result"
                                className={cn(
                                  "flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors",
                                  active ? "bg-white/10" : "hover:bg-white/5"
                                )}
                              >
                                {entry.thumb ? (
                                  <SmartImage
                                    src={entry.thumb.src}
                                    fallback={entry.thumb.fallback}
                                    alt=""
                                    loading="lazy"
                                    className={cn(
                                      "shrink-0 object-cover",
                                      entry.thumb.poster ? "h-14 w-10 rounded-sm" : "h-9 w-9 rounded-full"
                                    )}
                                  />
                                ) : (
                                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5">
                                    {entry.icon}
                                  </span>
                                )}
                                <span className="min-w-0 flex-1">
                                  <span className={cn("block truncate text-sm font-semibold", active ? "text-white" : "text-white/85")}>
                                    {entry.label}
                                  </span>
                                  {entry.meta && <span className="block truncate text-xs text-white/40">{entry.meta}</span>}
                                </span>
                                {active && <CornerDownLeft className="me-1 h-3.5 w-3.5 shrink-0 text-white/35" aria-hidden />}
                              </motion.div>
                            );
                          })}
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}

                {/* Empty state */}
                {hasQueryState && !busy && flat.length === 0 && !aiMode && (
                  <div className="flex flex-col items-center gap-2.5 px-4 py-10 text-center">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
                      <SearchX className="h-5 w-5 text-white/35" aria-hidden />
                    </span>
                    <p className="text-sm font-bold text-white/75">{t("search.noResults")}</p>
                    <p className="max-w-xs text-xs text-white/40">{t("search.noResultsHint")}</p>
                  </div>
                )}

                {/* ── AI mode (task 6-a) ─────────────────────────────────────── */}

                {/* AI thinking state — replaces the results area while the model works */}
                {aiBusy && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.28, ease: EASE_OUT_EXPO }}
                    className="flex flex-col items-center gap-4 px-4 py-12 text-center"
                    aria-busy="true"
                    aria-live="polite"
                    data-testid="ai-thinking"
                  >
                    <span className="scale-[1.8]" aria-hidden>
                      <PulseRing color="#d8c9a3" />
                    </span>
                    <p className="text-sm font-semibold text-white/65">{t("ai.thinking")}</p>
                  </motion.div>
                )}

                {/* AI results — answer sentence + poster grid (entrance: fade + slight scale) */}
                {!aiBusy && (aiResult !== null || aiError) && (
                  <motion.section
                    data-testid="ai-results"
                    aria-label={t("ai.answerTitle")}
                    initial={{ opacity: 0, scale: 0.985, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.34, ease: EASE_OUT_EXPO }}
                    className="px-1 py-1"
                  >
                    {aiError ? (
                      <div className="flex flex-col items-center gap-2.5 px-4 py-10 text-center">
                        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
                          <Sparkles className="h-5 w-5 text-white/35" aria-hidden />
                        </span>
                        <p className="text-sm font-bold text-white/75">{t("ai.error")}</p>
                      </div>
                    ) : (
                      <>
                        <div className="mb-3 flex items-center gap-2 px-2.5">
                          <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#d8c9a3]" aria-hidden />
                          <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/35">
                            {t("ai.answerTitle")}
                          </h3>
                          <span className="rounded-full border border-[#d8c9a3]/30 bg-[#d8c9a3]/10 px-2 py-0.5 text-[9px] font-bold text-[#d8c9a3]">
                            {t("ai.poweredBy")}
                          </span>
                        </div>
                        {aiResult?.answer && (
                          <p className="mb-3 px-2.5 text-sm leading-relaxed text-white/70">{aiResult.answer}</p>
                        )}
                        {aiResult && aiResult.items.length > 0 ? (
                          <div className="grid grid-cols-2 place-items-center gap-3 sm:grid-cols-3 lg:grid-cols-4">
                            {aiResult.items.map((title, i) => (
                              <TitleCard key={title.id} title={title} index={i} />
                            ))}
                          </div>
                        ) : (
                          <p className="px-4 py-10 text-center text-sm text-white/40">{t("ai.noResults")}</p>
                        )}
                      </>
                    )}
                  </motion.section>
                )}
              </div>

              {/* Footer hint row */}
              <div className="flex items-center justify-between gap-3 border-t border-white/8 bg-black/40 px-5 py-2.5">
                <div className="flex items-center gap-2 text-[10px] text-white/35">
                  {kbdChip("↑")}{kbdChip("↓")}
                  <span className="sr-only">navigate</span>
                  {kbdChip(<CornerDownLeft className="h-2.5 w-2.5" />)}
                  <span className="sr-only">open</span>
                  {kbdChip("Esc")}
                  <span className="sr-only">close</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-white/30" title={t("search.kbdShortcut")}>
                  <span aria-hidden>{isMac ? "⌘" : "Ctrl"}</span>
                  {kbdChip("K")}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

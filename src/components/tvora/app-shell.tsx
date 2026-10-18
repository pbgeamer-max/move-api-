"use client";
// TVORA app shell — binds hash router, session bootstrap, global overlays, view switching.
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAppStore, bindHashRouter, viewToHash } from "@/lib/store";
import { api } from "@/lib/api";
import { Intro } from "./intro";
import { Nav } from "./nav";
import { Footer } from "./footer";
import { SearchOverlay } from "./search-overlay";
import { ViewLoader } from "./shared";
import { ScrollProgress, CursorGlow, AuroraBackdrop, AmbientDust } from "./motion-fx";
import { makeT } from "@/lib/i18n";

import { HomeView } from "./views/home-view";
import { MoviesView, SeriesView } from "./views/discovery-view";
import { TitleDetailsView } from "./views/title-details-view";
import { ChannelsView } from "./views/channels-view";
import { WatchView } from "./views/watch-view";
import { MyListView, ContinueView } from "./views/library-views";
import { AuthView } from "./views/auth-view";
import { ProfileView } from "./views/profile-view";
import { PricingView, AboutView, PrivacyView, TermsView } from "./views/static-views";
import { AdminView } from "./views/admin-view";
import { NotFoundView } from "./views/notfound-view";
import { LoginGate } from "./gate/login-gate";

// ─── Cinematic view transition with a deadlock watchdog ───────────────────────
// AnimatePresence mode="wait" can deadlock when routes change very rapidly
// (an interrupted exit re-mounting with the same key loses its animate trigger
// and the wrapper stays frozen at its exit state: opacity 0 / y -10 → blank
// page until the next navigation). The watchdog checks, shortly after every
// route change, that the active wrapper actually became visible; if not, it
// bumps a key suffix once to force a fresh mount that replays the enter.

function ViewTransition({ viewKey, children }: { viewKey: string; children: React.ReactNode }) {
  const [nudge, setNudge] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>("main .tv-sweep");
      if (el && Number(getComputedStyle(el).opacity) < 0.05) setNudge((n) => n + 1);
    }, 1100);
    return () => window.clearTimeout(t);
  }, [viewKey]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={nudge > 0 ? `${viewKey}::r${nudge}` : viewKey}
        initial={{ opacity: 0, y: 16, scale: 0.996 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, filter: "blur(8px)" }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        className="tv-sweep relative"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

function CurrentView() {
  const view = useAppStore((s) => s.view);
  const key = viewToHash(view);

  switch (view.name) {
    case "home":
      return <HomeView />;
    case "movies":
      return <MoviesView />;
    case "series":
      return <SeriesView />;
    case "title":
      return <TitleDetailsView id={view.id!} />;
    case "channels":
      return <ChannelsView />;
    case "watch":
      return <WatchView id={view.id!} episodeId={view.ep} />;
    case "mylist":
      return <MyListView />;
    case "continue":
      return <ContinueView />;
    case "auth":
      return <AuthView mode={view.mode ?? "login"} />;
    case "profile":
      return <ProfileView />;
    case "pricing":
      return <PricingView />;
    case "about":
      return <AboutView />;
    case "privacy":
      return <PrivacyView />;
    case "terms":
      return <TermsView />;
    case "admin":
      return <AdminView tab={view.q?.replace("tab=", "") || undefined} />;
    default:
      return <NotFoundView />;
  }
}

export function TvoraApp() {
  const lang = useAppStore((s) => s.lang);
  const view = useAppStore((s) => s.view);
  const user = useAppStore((s) => s.user);
  const authReady = useAppStore((s) => s.authReady);
  const setAuthReady = useAppStore((s) => s.setAuthReady);
  const setUser = useAppStore((s) => s.setUser);
  const setListIds = useAppStore((s) => s.setListIds);
  const t = makeT(lang);

  // Hash-routed SPA inside Next.js: the first client render must match the
  // server render exactly. Store state reads localStorage/window at module
  // init, so we gate the real UI behind a mount flag and render an identical
  // minimal shell on both sides first.
  const [mounted, setMounted] = useState(false);
  const [guestOk, setGuestOk] = useState(false);
  useEffect(() => {
    setMounted(true);
    setGuestOk(window.localStorage.getItem("tvora.guest") === "1");
  }, []);

  // Login gate — the cinematic entry screen. Shown for visitors with no
  // session who haven't (yet) chosen to browse as guests.
  const showGate = mounted && authReady && !user && !guestOk;

  // Bind hash router once
  useEffect(() => bindHashRouter(), []);

  // Bootstrap session + list
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await api.me();
        if (!alive) return;
        setUser(me.user);
        if (me.user?.preferredLanguage) {
          const stored = localStorage.getItem("tvora.lang");
          if (!stored) useAppStore.getState().setLang(me.user.preferredLanguage);
        }
      } catch {
        /* guest */
      } finally {
        if (alive) setAuthReady(true);
      }
      try {
        const list = await api.listGet();
        if (!alive) return;
        // merge with local ids (guest cache)
        const local = useAppStore.getState().listIds;
        const merged = Array.from(new Set([...list.items.map((i) => i.id), ...local]));
        setListIds(merged);
      } catch {
        /* offline-friendly */
      }
    })();
    return () => {
      alive = false;
    };
  }, [setUser, setAuthReady, setListIds]);

  if (!mounted || !authReady) {
    return (
      <div className="flex min-h-screen flex-col bg-[#070708] text-white">
        <div className="flex-1" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-[#070708] text-white" data-view={view.name}>
      {/* Cinematic ambient stack (behind all content) */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        <AuroraBackdrop />
        <AmbientDust />
        {/* subtle bottom fade into pure ink */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#070708] to-transparent" />
      </div>

      <ScrollProgress />
      <CursorGlow />
      {/* intro waits until the login gate is done — first-timers see it on entry */}
      {!showGate && <Intro />}
      <Nav />
      <main className="relative flex-1" id="main">
        <ViewTransition viewKey={viewToHash(view)}>
          <CurrentView />
        </ViewTransition>
      </main>
      <Footer />
      <SearchOverlay />

      {/* cinematic login gate — covers the app until a session (or guest choice) exists */}
      <AnimatePresence>
        {showGate && (
          <motion.div
            key="login-gate"
            className="fixed inset-0 z-[95] overflow-hidden"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.06, filter: "blur(14px)" }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            data-testid="gate-overlay"
          >
            <LoginGate
              onEnter={(u) => {
                if (u) {
                  setUser(u); // real session — signing out later must bring the gate back
                } else {
                  window.localStorage.setItem("tvora.guest", "1");
                  setGuestOk(true); // guest choice only
                }
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <span className="sr-only" aria-live="polite">{t("misc.loading")}</span>
      {/* keeps ViewLoader import used for consistency */}
      <span className="hidden">{ }</span>
    </div>
  );
}

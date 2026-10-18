"use client";
// TVORA floating navigation — blends in at top, gains blur/surface on scroll.
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Menu, X, User, LayoutDashboard, ListVideo, Clock, CalendarDays, Languages } from "lucide-react";
import { useAppStore, type ViewName } from "@/lib/store";
import { makeT } from "@/lib/i18n";
import { TvoraLogo } from "./logo";
import { cn } from "@/lib/utils";

const NAV_ITEMS: Array<{ name: ViewName; key: string; testid: string }> = [
  { name: "home", key: "nav.home", testid: "nav-home" },
  { name: "movies", key: "nav.movies", testid: "nav-movies" },
  { name: "series", key: "nav.series", testid: "nav-series" },
  { name: "channels", key: "nav.channels", testid: "nav-channels" },
  { name: "mylist", key: "nav.myList", testid: "nav-mylist" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const lastY = useRef(0);
  const lang = useAppStore((s) => s.lang);
  const setLang = useAppStore((s) => s.setLang);
  const view = useAppStore((s) => s.view);
  const navigate = useAppStore((s) => s.navigate);
  const setSearchOpen = useAppStore((s) => s.setSearchOpen);
  const user = useAppStore((s) => s.user);
  const t = makeT(lang);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      // Hide on scroll-down past the hero, reveal instantly on scroll-up
      const goingDown = y > lastY.current;
      const delta = Math.abs(y - lastY.current);
      if (y > 220 && delta > 6) setHidden(goingDown);
      else if (!goingDown || y < 220) setHidden(false);
      lastY.current = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // close the mobile menu whenever the route hash changes (external system event)
    const onHash = () => setMobileOpen(false);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const isActive = (name: ViewName) => view.name === name || (name === "home" && view.name === "watch");

  const go = (name: ViewName) => {
    navigate({ name });
    setMobileOpen(false);
  };

  return (
    <>
      <motion.header
        initial={{ y: -70, opacity: 0 }}
        animate={{ y: hidden ? -90 : 0, opacity: 1 }}
        transition={{
          y: { type: "spring", stiffness: 260, damping: 30 },
          opacity: { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 },
        }}
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,border-color,box-shadow] duration-500",
          scrolled
            ? "border-b border-white/8 bg-[#0a0a0c]/85 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl"
            : "border-b border-transparent bg-gradient-to-b from-black/60 via-black/20 to-transparent"
        )}
        data-testid="tvora-nav"
      >
        <nav className="mx-auto flex h-16 max-w-[1600px] items-center gap-2 px-4 md:h-[72px] md:px-8 lg:px-12" aria-label="Main">
          <TvoraLogo size={30} compact={scrolled} onClick={() => go("home")} />

          {/* Desktop items */}
          <ul className="mx-4 hidden flex-1 items-center gap-1 lg:flex">
            {NAV_ITEMS.map((item) => (
              <li key={item.name}>
                <button
                  type="button"
                  data-testid={item.testid}
                  onClick={() => go(item.name)}
                  aria-current={isActive(item.name) ? "page" : undefined}
                  className={cn(
                    "tv-focusable group/navitem relative rounded-md px-3.5 py-2 text-[13.5px] font-semibold transition-colors",
                    isActive(item.name) ? "text-white" : "text-white/60 hover:text-white"
                  )}
                >
                  {/* hover glow pill */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-md bg-white/0 opacity-0 transition-all duration-300 group-hover/navitem:bg-white/6 group-hover/navitem:opacity-100 group-hover/navitem:shadow-[0_0_24px_-6px_rgba(207,224,238,0.35)]"
                  />
                  <span className="relative">{t(item.key)}</span>
                  {isActive(item.name) && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute inset-x-3 -bottom-0.5 h-[2px] rounded-full bg-gradient-to-r from-transparent via-[#cfe0ee] to-transparent"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                </button>
              </li>
            ))}
          </ul>

          <div className="flex flex-1 items-center justify-end gap-1.5 lg:flex-none">
            {/* Search */}
            <button
              type="button"
              data-testid="nav-search"
              onClick={() => setSearchOpen(true)}
              aria-label={t("nav.search")}
              className="tv-focusable flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/70 transition hover:border-white/30 hover:text-white"
            >
              <Search className="h-[18px] w-[18px]" />
            </button>

            {/* Language toggle */}
            <button
              type="button"
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              aria-label={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"}
              className="tv-focusable hidden h-10 items-center gap-1.5 rounded-full border border-white/10 px-3 text-xs font-bold text-white/70 transition hover:border-white/30 hover:text-white sm:flex"
            >
              <Languages className="h-3.5 w-3.5" aria-hidden />
              {lang === "ar" ? "EN" : "عربي"}
            </button>

            {/* Profile / Sign in */}
            {user ? (
              <button
                type="button"
                onClick={() => go("profile")}
                aria-label={t("nav.profile")}
                className="tv-focusable flex h-10 items-center gap-2 rounded-full border border-white/10 px-2 pe-3 transition hover:border-white/30"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-b from-[#2a2d33] to-[#1a1c20] text-[11px] font-extrabold text-[#cfe0ee]">
                  {(user.name || user.email).slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden max-w-24 truncate text-xs font-semibold text-white/80 md:block">
                  {user.name || user.email.split("@")[0]}
                </span>
              </button>
            ) : (
              <button
                type="button"
                data-testid="nav-signin"
                onClick={() => go("auth")}
                className="tv-focusable tv-btn-sheen flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[13px] font-extrabold text-black transition hover:bg-[#e8eef4] hover:shadow-[0_0_28px_-6px_rgba(207,224,238,0.6)]"
              >
                <User className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">{t("nav.signIn")}</span>
              </button>
            )}

            {/* Mobile menu button */}
            <button
              type="button"
              data-testid="nav-mobile-toggle"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? t("nav.close") : t("nav.menu")}
              aria-expanded={mobileOpen}
              className="tv-focusable flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/80 transition hover:border-white/30 lg:hidden"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>
      </motion.header>

      {/* Mobile expandable menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="fixed inset-x-3 top-[72px] z-40 overflow-hidden rounded-xl border border-white/10 bg-[#0d0d10]/95 shadow-2xl backdrop-blur-2xl lg:hidden"
            data-testid="mobile-menu"
          >
            <ul className="p-2">
              {NAV_ITEMS.map((item, i) => (
                <motion.li
                  key={item.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <button
                    type="button"
                    onClick={() => go(item.name)}
                    className={cn(
                      "tv-focusable w-full rounded-lg px-4 py-3.5 text-start text-[15px] font-semibold transition",
                      isActive(item.name) ? "bg-white/8 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    {t(item.key)}
                  </button>
                </motion.li>
              ))}
              <li className="my-1 border-t border-white/8" aria-hidden />
              <li>
                <button
                  type="button"
                  onClick={() => { navigate({ name: "continue" }); setMobileOpen(false); }}
                  className="tv-focusable flex w-full items-center gap-3 rounded-lg px-4 py-3 text-start text-[15px] font-semibold text-white/70 transition hover:bg-white/5 hover:text-white"
                >
                  <Clock className="h-4.5 w-4.5 text-white/40" aria-hidden /> {t("nav.continueWatching")}
                </button>
              </li>
              {user?.role === "admin" && (
                <li>
                  <button
                    type="button"
                    onClick={() => go("admin")}
                    className="tv-focusable flex w-full items-center gap-3 rounded-lg px-4 py-3 text-start text-[15px] font-semibold text-white/70 transition hover:bg-white/5 hover:text-white"
                  >
                    <LayoutDashboard className="h-4.5 w-4.5 text-white/40" aria-hidden /> {t("nav.admin")}
                  </button>
                </li>
              )}
              <li className="p-2">
                <button
                  type="button"
                  onClick={() => setLang(lang === "ar" ? "en" : "ar")}
                  className="tv-focusable flex w-full items-center justify-center gap-2 rounded-lg border border-white/12 py-3 text-sm font-bold text-white/80"
                >
                  <Languages className="h-4 w-4" aria-hidden /> {lang === "ar" ? "English" : "العربية"}
                </button>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

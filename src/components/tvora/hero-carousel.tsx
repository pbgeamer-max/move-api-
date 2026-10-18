"use client";
// TVORA hero carousel — cinematic full-bleed spotlight.
// Camera-dissolve crossfades + slow Ken-Burns drift on the backdrop, content
// parallax (background moves slower than copy) and scroll parallax via
// useScroll. Auto-advance is driven by the progress bar's CSS animation
// (onAnimationEnd) so pause/resume stays perfectly in sync; respects
// prefers-reduced-motion (no auto-advance, simple crossfades).
// Task 5-a: two-phase Ken-Burns (incoming 1.06 → settle 1.0 → drift 1.08 with a
// subtle translate), choreographed per-slide content reveals (badge → headline
// via SplitWords → meta → synopsis → CTAs), Magnetic + sheen primary CTA,
// ghost-glow secondary CTA, PulseRing live badge and glowing progress bars.
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, Info, Play, Plus } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { DemoTag, Rating, useMyList, useT } from "./shared";
import { Magnetic, SplitWords } from "./motion-fx";
import { FallbackImage } from "./fallback-image";
import { localized, parseGenres, GENRES_AR, type HeroSlide, type Lang, type TitleDTO } from "@/lib/types";
import { backdropFor } from "@/lib/artwork";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { cn } from "@/lib/utils";

const SLIDE_MS = 7000;

// ─── slide helpers ────────────────────────────────────────────────────────────

function slideTitle(s: HeroSlide, lang: Lang): string {
  return s.title ? localized(s.title, lang) : "";
}

function slideBackdropCandidates(s: HeroSlide): string[] {
  const t = s.title;
  if (!t) return [];
  return [t.backdropUrl, t.posterUrl].filter(Boolean) as string[];
}

function slideBackdropFallback(s: HeroSlide, lang: Lang): string {
  const t = s.title;
  if (!t) return backdropFor("tvora-hero", "TVORA");
  const name = localized(t, lang);
  return backdropFor(t.id + name, name, `TVORA · ${t.releaseYear}`);
}

// ─── main component ───────────────────────────────────────────────────────────

export function HeroCarousel({ slides, demoMode }: { slides: HeroSlide[]; demoMode: boolean }) {
  const { t, lang, dir } = useT();
  const reduced = useReducedMotion() ?? false;
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [touchPause, setTouchPause] = useState(false);
  const [hiddenTab, setHiddenTab] = useState(false);
  const touchTimer = useRef<number | undefined>(undefined);
  const sectionRef = useRef<HTMLElement | null>(null);

  const count = slides.length;
  const paused = hovered || touchPause || hiddenTab || reduced || count < 2;

  // Scroll parallax — backdrop lags, content leads (transform/opacity only)
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "14%"]);
  const ctY = useTransform(scrollYProgress, [0, 1], ["0%", "-38%"]);
  const ctOpacity = useTransform(scrollYProgress, [0, 0.92], [1, 0]);

  // Pause when the tab is hidden
  useEffect(() => {
    const onVis = () => setHiddenTab(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Touch pause auto-resumes after 10s of inactivity
  useEffect(() => () => window.clearTimeout(touchTimer.current), []);

  // Pre-warm the next slide's backdrop so the dissolve never shows a blank frame
  useEffect(() => {
    if (count < 2) return;
    const next = slides[(index + 1) % count];
    const src = slideBackdropCandidates(next)[0] || slideBackdropFallback(next, lang);
    const id = window.setTimeout(() => {
      const img = new Image();
      img.src = src;
    }, 1200);
    return () => window.clearTimeout(id);
  }, [index, slides, count, lang]);

  const goTo = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);
  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + count) % count), [count]);

  // The active progress bar's CSS animation IS the auto-advance clock.
  const advance = useCallback(
    (e: React.AnimationEvent) => {
      if (e.target !== e.currentTarget) return;
      next();
    },
    [next]
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (dir === "rtl") next();
      else prev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      if (dir === "rtl") prev();
      else next();
    }
  };

  if (count === 0) return null;
  const slide = slides[index];
  const label = slide.kind === "series" ? t("hero.featuredSeries") : t("hero.featuredMovie");

  return (
    <section
      ref={sectionRef}
      data-testid="hero"
      role="region"
      aria-roledescription="carousel"
      aria-label={t("hero.carousel")}
      className="relative h-[72vh] min-h-[520px] w-full overflow-hidden md:h-[88vh]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onTouchStart={() => {
        setTouchPause(true);
        window.clearTimeout(touchTimer.current);
        touchTimer.current = window.setTimeout(() => setTouchPause(false), 10000);
      }}
      onKeyDown={onKeyDown}
    >
      <style>{`@keyframes tvora-hero-fill{from{transform:scaleX(0)}to{transform:scaleX(1)}}`}</style>

      {/* Backdrop layers — camera dissolve + Ken-Burns drift */}
      <motion.div style={{ y: bgY }} className="absolute inset-0">
        <AnimatePresence initial={false}>
          <motion.div
            key={`bg-${index}`}
            className="absolute inset-0 will-change-transform"
            initial={reduced ? { opacity: 0, scale: 1 } : { opacity: 0, scale: 1.06, x: "0.4%", y: "0.2%" }}
            animate={
              reduced
                ? { opacity: 1, scale: 1 }
                : { opacity: 1, scale: [1.06, 1.0, 1.08], x: ["0.4%", "0.4%", "1.2%"], y: ["0.2%", "0.2%", "0.9%"] }
            }
            exit={{
              opacity: 0,
              scale: reduced ? 1 : 1.085,
              transition: { duration: reduced ? 0.4 : 1.05, ease: "easeInOut" },
            }}
            transition={
              reduced
                ? { opacity: { duration: 0.45, ease: "easeOut" } }
                : {
                    opacity: { duration: 1.05, ease: "easeOut" },
                    scale: { duration: 9.4, times: [0, 0.12, 1], ease: "linear" },
                    x: { duration: 9.4, times: [0, 0.12, 1], ease: "linear" },
                    y: { duration: 9.4, times: [0, 0.12, 1], ease: "linear" },
                  }
            }
          >
            <FallbackImage
              candidates={slideBackdropCandidates(slide)}
              fallback={slideBackdropFallback(slide, lang)}
              alt=""
              priority={index === 0}
              className="h-full w-full"
            />
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Cinematic gradients + texture */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#070708] via-[#070708]/25 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#070708]/85 via-[#070708]/25 to-transparent rtl:bg-gradient-to-l" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/55 to-transparent" />
      <div className="tv-grain pointer-events-none absolute inset-0" />
      <div className="tv-vignette pointer-events-none absolute inset-0" />

      {/* Content — parallax wrapper (leads on scroll) + keyed slide copy */}
      <motion.div style={{ y: ctY, opacity: ctOpacity }} className="absolute inset-x-0 bottom-0 z-10">
        <AnimatePresence initial={false}>
          <motion.div
            key={`ct-${index}`}
            className="absolute inset-x-0 bottom-0 px-4 pb-28 sm:pb-24 md:px-8 md:pb-20 lg:px-12"
            initial={{ opacity: 0, y: reduced ? 0 : 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : -20, transition: { duration: reduced ? 0.35 : 0.6, ease: "easeOut" } }}
            transition={{ duration: reduced ? 0.4 : 0.55, ease: EASE_OUT_EXPO, delay: reduced ? 0 : 0.05 }}
          >
            <SlideContent slide={slide} demoMode={demoMode} label={label} />
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Prev / next arrows (sm+; mobile navigates via progress bars) */}
      {count > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label={t("hero.prevSlide")}
            className="tv-focusable absolute top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white/85 backdrop-blur-md transition hover:border-white/45 hover:text-white sm:flex"
            style={{ insetInlineStart: "1.25rem" }}
          >
            <ChevronLeft className="h-5 w-5 rtl:rotate-180" aria-hidden />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label={t("hero.nextSlide")}
            className="tv-focusable absolute top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white/85 backdrop-blur-md transition hover:border-white/45 hover:text-white sm:flex"
            style={{ insetInlineEnd: "1.25rem" }}
          >
            <ChevronRight className="h-5 w-5 rtl:rotate-180" aria-hidden />
          </button>
        </>
      )}

      {/* Slide progress indicators — fill over 7s, click to jump */}
      {count > 1 && (
        <div className="absolute inset-x-4 bottom-5 z-20 flex justify-center gap-1.5 sm:inset-x-8 sm:justify-end lg:inset-x-12">
          {slides.map((_, i) => {
            const active = i === index;
            return (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`${t("hero.slide")} ${i + 1}`}
                aria-current={active ? "true" : undefined}
                className="tv-focusable flex h-6 items-center px-0.5"
              >
                <span
                  className={cn(
                    "relative block h-[3px] w-7 overflow-hidden rounded-full bg-white/20 sm:w-9",
                    active && !reduced && "tv-glow-breathe bg-white/30"
                  )}
                >
                  {active ? (
                    reduced ? (
                      <span className="absolute inset-0 rounded-full bg-white" />
                    ) : (
                      <span
                        key={`fill-${index}`}
                        onAnimationEnd={advance}
                        className={cn(
                          "absolute inset-0 rounded-full bg-gradient-to-r from-[#cfe0ee] to-white shadow-[0_0_12px_rgba(207,224,238,0.85)]",
                          "origin-left rtl:origin-right"
                        )}
                        style={{
                          animation: `tvora-hero-fill ${SLIDE_MS}ms linear forwards`,
                          animationPlayState: paused ? "paused" : "running",
                        }}
                      />
                    )
                  ) : (
                    i < index && <span className="absolute inset-0 rounded-full bg-white/55" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Polite announcement for screen readers */}
      <p className="sr-only" aria-live="polite">
        {`${slideTitle(slide, lang)} — ${index + 1} ${t("hero.of")} ${count}`}
      </p>
    </section>
  );
}

// ─── per-slide copy ───────────────────────────────────────────────────────────

function SlideContent({ slide, demoMode, label }: { slide: HeroSlide; demoMode: boolean; label: string }) {
  const { t, lang } = useT();
  const reduced = useReducedMotion() ?? false;
  const navigate = useAppStore((s) => s.navigate);
  const { has, toggle } = useMyList();

  // Choreographed rise — badge → headline → meta → synopsis → CTAs (~60–90ms steps)
  const rise = (delay: number) => ({
    initial: { opacity: 0, y: reduced ? 0 : 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55, ease: EASE_OUT_EXPO, delay: reduced ? 0 : delay },
  });

  const title = slide.title;

  // Honest watchability: titles need an authorized/demo source.
  const canWatch = !!title && title.playbackType !== "none";

  const goWatch = () => {
    if (title) navigate({ name: "watch", id: title.id });
  };
  const goInfo = () => {
    if (title) navigate({ name: "title", id: title.id });
  };

  return (
    <div className="max-w-2xl" role="group" aria-roledescription="slide" aria-label={label}>
      <motion.div {...rise(0.04)} className="mb-3.5 flex flex-wrap items-center gap-2.5">
        <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#9fb7cb]">{label}</span>
        {demoMode && <DemoTag />}
      </motion.div>

      <SplitWords
        as="h1"
        text={slideTitle(slide, lang)}
        delay={reduced ? 0 : 0.12}
        stagger={0.05}
        className="tv-title-glow text-3xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl"
      />

      <motion.div {...rise(0.3)}>
        {title && <TitleMeta title={title} />}
      </motion.div>

      {title && (
        <motion.p {...rise(0.38)} className="mt-4 line-clamp-3 max-w-xl text-sm leading-relaxed text-white/65 md:text-[15px]">
          {lang === "ar" ? title.synopsisAr : title.synopsisEn}
        </motion.p>
      )}

      <motion.div {...rise(0.46)} className="mt-7 flex flex-wrap items-center gap-3">
        {canWatch ? (
          <>
            <Magnetic strength={0.22}>
              <button
                type="button"
                data-testid="hero-watch"
                onClick={goWatch}
                className="tv-btn-sheen tv-focusable inline-flex h-12 items-center gap-2 rounded-md bg-white px-6 text-sm font-extrabold text-black transition hover:bg-[#e8eef4] active:scale-[0.98]"
              >
                <Play className="h-4 w-4 fill-black" aria-hidden />
                {t("hero.watchNow")}
              </button>
            </Magnetic>
            <button
              type="button"
              onClick={goInfo}
              className="tv-ghost-glow tv-focusable inline-flex h-12 items-center gap-2 rounded-md border border-white/25 px-6 text-sm font-bold text-white/90 backdrop-blur-sm"
            >
              <Info className="h-4 w-4" aria-hidden />
              {t("hero.moreInfo")}
            </button>
          </>
        ) : (
          <Magnetic strength={0.22}>
            <button
              type="button"
              onClick={goInfo}
              className="tv-btn-sheen tv-focusable inline-flex h-12 items-center gap-2 rounded-md bg-white px-6 text-sm font-extrabold text-black transition hover:bg-[#e8eef4]"
            >
              <Info className="h-4 w-4" aria-hidden />
              {t("hero.moreInfo")}
            </button>
          </Magnetic>
        )}

        {title && (
          <button
            type="button"
            onClick={() => void toggle(title)}
            aria-pressed={has(title.id)}
            aria-label={has(title.id) ? t("hero.inList") : t("hero.addToList")}
            className={cn(
              "tv-focusable flex h-12 w-12 items-center justify-center rounded-full border backdrop-blur-sm transition",
              has(title.id)
                ? "border-[#9fb7cb]/60 bg-[#9fb7cb]/15 text-[#cfe0ee]"
                : "border-white/30 text-white hover:border-white/70"
            )}
          >
            {has(title.id) ? <Check className="h-5 w-5" aria-hidden /> : <Plus className="h-5 w-5" aria-hidden />}
          </button>
        )}
      </motion.div>
    </div>
  );
}

function TitleMeta({ title }: { title: TitleDTO }) {
  const { t, lang } = useT();
  const genres = parseGenres(title.genres)
    .slice(0, 3)
    .map((g) => (lang === "ar" ? GENRES_AR[g] || g : g));

  return (
    <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-white/70">
      <span className="font-semibold tabular-nums">{title.releaseYear}</span>
      {genres.length > 0 && (
        <>
          <span className="text-white/30" aria-hidden>
            ·
          </span>
          <span className="line-clamp-1">{genres.join(" · ")}</span>
        </>
      )}
      {title.type === "movie" && title.runtime ? (
        <>
          <span className="text-white/30" aria-hidden>
            ·
          </span>
          <span className="tabular-nums">
            {title.runtime} {t("details.minutes")}
          </span>
        </>
      ) : null}
      {title.type === "series" && title.seasonsCount ? (
        <>
          <span className="text-white/30" aria-hidden>
            ·
          </span>
          <span className="tabular-nums">
            {title.seasonsCount} {t("hero.seasons")}
          </span>
        </>
      ) : null}
      {title.ageRating && (
        <span className="rounded-sm border border-white/25 px-1.5 py-0.5 text-[11px] font-bold tracking-wide">{title.ageRating}</span>
      )}
      <Rating value={title.rating} className="text-[13px]" />
    </div>
  );
}

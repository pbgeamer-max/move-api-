"use client";
// NOT FOUND — full-height cinematic 404: drifting light beams + floating mark.
// All ambience is transform/opacity only and honors prefers-reduced-motion.
import { motion, useReducedMotion } from "framer-motion";
import { Search } from "lucide-react";
import { useT } from "../shared";
import { Beam, SplitWords } from "../motion-fx";
import { useAppStore } from "@/lib/store";
import { TvoraMark } from "../logo";
import { EASE_OUT_EXPO } from "@/lib/motion";

export function NotFoundView() {
  const { t } = useT();
  const navigate = useAppStore((s) => s.navigate);
  const setSearchOpen = useAppStore((s) => s.setSearchOpen);
  const reduce = useReducedMotion();

  return (
    <div className="relative flex min-h-[92vh] flex-col items-center justify-center overflow-hidden px-4 py-24 text-center" data-testid="notfound-view">
      {/* Ambient light field — soft beams + 4 thin Beam accents (pure CSS, pointer-events-none) */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <motion.div
          initial={false}
          animate={reduce ? { opacity: 0.12 } : { y: [-26, 26, -26], opacity: [0.1, 0.28, 0.1] }}
          transition={reduce ? { duration: 0.4 } : { duration: 11, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[20%] start-[18%] h-[150%] w-40 -skew-x-12 bg-gradient-to-b from-transparent via-[#9fb7cb]/12 to-transparent blur-2xl"
        />
        <motion.div
          initial={false}
          animate={reduce ? { opacity: 0.08 } : { y: [18, -22, 18], opacity: [0.07, 0.2, 0.07] }}
          transition={reduce ? { duration: 0.4 } : { duration: 14, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          className="absolute -top-[10%] end-[14%] h-[130%] w-24 skew-x-6 bg-gradient-to-b from-transparent via-[#d8c9a3]/10 to-transparent blur-2xl"
        />
        {/* 5-c — Beam accents at varied positions/delays */}
        <Beam className="start-[12%]" delay={0.6} duration={10} height="44vh" />
        <Beam className="start-[38%]" delay={3.4} duration={13} height="28vh" width={2} />
        <Beam className="end-[30%]" delay={1.9} duration={11.5} height="52vh" />
        <Beam className="end-[9%]" delay={5.1} duration={9} height="26vh" width={2} />
        <div className="absolute inset-0 tv-vignette" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
        className="relative flex flex-col items-center gap-5"
      >
        <span className="tv-float inline-flex" aria-hidden>
          <TvoraMark size={44} className="opacity-80" />
        </span>
        <h1
          className="tv-metal-text select-none text-[26vw] font-extrabold leading-none tracking-tight sm:text-[170px]"
          style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}
          aria-label="404"
        >
          404
        </h1>
        {/* Word-by-word reveal on the message */}
        <SplitWords as="p" text={t("misc.notFound")} className="text-xl font-extrabold text-white/90" delay={0.2} />
        <p className="max-w-sm text-sm leading-relaxed text-white/45">{t("misc.notFoundHint")}</p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate("home")}
            className="tv-focusable rounded-md bg-white px-6 py-2.5 text-sm font-extrabold text-black transition hover:bg-[#e8eef4]"
          >
            {t("misc.goHome")}
          </button>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="tv-focusable flex items-center gap-2 rounded-md border border-white/15 px-5 py-2.5 text-sm font-bold text-white/75 transition hover:border-white/40 hover:text-white"
          >
            <Search className="h-4 w-4" aria-hidden /> {t("nav.search")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

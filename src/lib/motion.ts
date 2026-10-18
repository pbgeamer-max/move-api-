"use client";
// TVORA motion system — consistent durations & easings
import type { Variants } from "framer-motion";

export const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as const;
export const EASE_CINEMA = [0.33, 0, 0.15, 1] as const;

export const DUR = {
  fast: 0.22,
  base: 0.38,
  slow: 0.6,
  epic: 0.9,
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: DUR.slow, ease: EASE_OUT_EXPO, delay: i * 0.08 },
  }),
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: (i: number = 0) => ({ opacity: 1, transition: { duration: DUR.slow, ease: "easeOut", delay: i * 0.06 } }),
};

export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

export const scaleReveal: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 14 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: DUR.slow, ease: EASE_OUT_EXPO } },
};

export const viewportOnce = { once: true, margin: "-60px" } as const;

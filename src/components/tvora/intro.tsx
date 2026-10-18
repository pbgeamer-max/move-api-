"use client";
// TVORA cinematic intro — light beam → metallic particles → mark forms →
// reflection sweep → wordmark → gentle push-in. ~2.8s, skippable, reduced-motion aware.
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { TvoraMark } from "./logo";
import { useAppStore } from "@/lib/store";

export function Intro() {
  const introDone = useAppStore((s) => s.introDone);
  const setIntroDone = useAppStore((s) => s.setIntroDone);
  const reduced = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState(0); // 0 beam, 1 particles, 2 mark, 3 out

  useEffect(() => {
    if (introDone) return;
    if (reduced) {
      setIntroDone(true);
      return;
    }
    document.body.style.overflow = "hidden";
    const timers = [
      window.setTimeout(() => setPhase(1), 380),
      window.setTimeout(() => setPhase(2), 1250),
      window.setTimeout(() => setPhase(3), 2450),
      window.setTimeout(() => setIntroDone(true), 3050),
    ];
    return () => {
      timers.forEach(clearTimeout);
      document.body.style.overflow = "";
    };
  }, [introDone, reduced, setIntroDone]);

  // Metallic particle convergence
  useEffect(() => {
    if (introDone || reduced || phase === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = (canvas.width = window.innerWidth * dpr);
    let h = (canvas.height = window.innerHeight * dpr);
    const onResize = () => {
      w = canvas.width = window.innerWidth * dpr;
      h = canvas.height = window.innerHeight * dpr;
    };
    window.addEventListener("resize", onResize);

    const N = 70;
    const rand = (seed: number) => {
      const x = Math.sin(seed * 999.7) * 10000;
      return x - Math.floor(x);
    };
    const parts = Array.from({ length: N }, (_, i) => ({
      x: rand(i) * w,
      y: rand(i + 100) * h,
      size: (rand(i + 200) * 1.6 + 0.5) * dpr,
      delay: rand(i + 300) * 0.45,
      drift: (rand(i + 400) - 0.5) * 0.4,
    }));

    let raf = 0;
    const start = performance.now();
    const draw = (now: number) => {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      for (const p of parts) {
        const local = Math.max(0, t - 0.15 - p.delay);
        const k = Math.min(1, local / 1.15);
        const ease = 1 - Math.pow(1 - k, 3);
        const x = p.x + (cx - p.x) * ease;
        const y = p.y + (cy - p.y) * ease - p.drift * 20 * dpr;
        const alpha = k < 0.85 ? 0.55 + 0.45 * Math.sin(t * 6 + p.x) * 0.4 : Math.max(0, 1 - (k - 0.85) / 0.15);
        ctx.globalAlpha = Math.max(0, alpha * 0.9);
        ctx.fillStyle = "#c9d6e2";
        ctx.beginPath();
        ctx.arc(x, y, p.size * (0.8 + ease * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (t < 2.2) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [introDone, reduced, phase]);

  if (introDone) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050506] tv-grain"
        exit={{ opacity: 0, scale: 1.06 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        data-testid="tvora-intro"
      >
        {/* Skip */}
        <button
          type="button"
          onClick={() => setIntroDone(true)}
          className="tv-focusable absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-white/15 px-5 py-2 text-xs tracking-widest text-white/60 transition hover:border-white/40 hover:text-white"
          style={{ fontFamily: "var(--font-manrope)" }}
        >
          SKIP
        </button>

        {/* Beam of light */}
        <motion.div
          className="absolute h-px w-[46vw] bg-gradient-to-r from-transparent via-[#cfe0ee]/70 to-transparent"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: phase >= 1 ? 0.2 : 1, opacity: phase >= 2 ? 0 : [0, 0.9, 0.7] }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />

        {/* Particles */}
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

        {/* Mark forms from particles */}
        <AnimatePresence>
          {phase >= 2 && (
            <motion.div
              className="relative"
              initial={{ opacity: 0, scale: 0.82, rotateY: -26 }}
              animate={
                phase >= 3
                  ? { opacity: 1, scale: 1.12, rotateY: 0 }
                  : { opacity: 1, scale: 1, rotateY: 0 }
              }
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              style={{ perspective: 800 }}
            >
              <TvoraMark size={110} className="drop-shadow-[0_0_28px_rgba(159,183,203,0.35)]" />
              {/* Reflection sweep */}
              <motion.div
                className="pointer-events-none absolute inset-0 overflow-hidden"
                aria-hidden
              >
                <motion.div
                  className="absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/35 to-transparent"
                  initial={{ x: "-160%" }}
                  animate={{ x: "360%" }}
                  transition={{ duration: 0.85, delay: 0.55, ease: "easeInOut" }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Wordmark */}
        <AnimatePresence>
          {phase >= 2 && (
            <motion.div
              className="absolute bottom-[30%] flex flex-col items-center gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              <motion.div
                className="tv-metal-text font-extrabold text-3xl md:text-4xl"
                style={{ fontFamily: "var(--font-manrope)", letterSpacing: "0.34em" }}
                initial={{ y: 18, opacity: 0, letterSpacing: "0.6em" }}
                animate={{ y: 0, opacity: 1, letterSpacing: "0.34em" }}
                transition={{ duration: 0.85, delay: 0.75, ease: [0.22, 1, 0.36, 1] }}
              >
                TVORA
              </motion.div>
              <motion.div
                className="text-[11px] uppercase text-white/45"
                style={{ letterSpacing: "0.3em" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 1.15 }}
              >
                Cinema · Series · Live TV
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Vignette */}
        <div className="tv-vignette pointer-events-none absolute inset-0" />
      </motion.div>
    </AnimatePresence>
  );
}

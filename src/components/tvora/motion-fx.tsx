"use client";
// TVORA Motion FX engine — the central motion-graphics toolkit used across all views.
// Engineering contract:
//  - GPU-safe: transform/opacity only, DPR capped, canvases pause when hidden/offscreen.
//  - Accessible: every decorative effect degrades under prefers-reduced-motion.
//  - Self-disposing: no leaked rAF loops / listeners / GPU contexts.
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useReducedMotion,
  useInView,
  type Variants,
} from "framer-motion";
import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO, EASE_CINEMA } from "@/lib/motion";
import { useAppStore } from "@/lib/store";

// ─── Shared reduced-motion gate ───────────────────────────────────────────────

export function useMotionAllowed() {
  const reduced = useReducedMotion();
  return !reduced;
}

// ─── Aurora backdrop (CSS blobs — near-zero JS cost) ─────────────────────────

export function AuroraBackdrop({ className }: { className?: string }) {
  const allowed = useMotionAllowed();
  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)} aria-hidden>
      <div
        className="tv-aurora-blob left-[-12%] top-[-18%] h-[52vmax] w-[52vmax] bg-[#9fb7cb]/[0.055]"
        style={{ "--blob-o": 0.85, animationDelay: "-4s" } as CSSProperties}
      />
      <div
        className="tv-aurora-blob right-[-14%] top-[8%] h-[46vmax] w-[46vmax] bg-[#d8c9a3]/[0.04]"
        style={{ "--blob-o": 0.7, animationDelay: "-12s" } as CSSProperties}
      />
      <div
        className="tv-aurora-blob bottom-[-22%] left-[22%] h-[44vmax] w-[44vmax] bg-[#e5484d]/[0.025]"
        style={{ "--blob-o": 0.6, animationDelay: "-20s" } as CSSProperties}
      />
      {allowed && <div className="tv-grain absolute inset-0" />}
    </div>
  );
}

// ─── Ambient dust — canvas particle field (cinema grain in motion) ────────────

type DustSpec = { x: number; y: number; r: number; vy: number; sway: number; phase: number; alpha: number; hue: string };

export function AmbientDust({ className, maxParticles = 70 }: { className?: string; maxParticles?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const allowed = useMotionAllowed();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let running = true;
    let W = 0;
    let H = 0;
    let particles: DustSpec[] = [];

    const HUES = ["159, 183, 203", "216, 201, 163", "255, 255, 255"];

    const seed = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(maxParticles, Math.floor((W * H) / 24000));
      const scale = W < 640 ? 0.55 : 1;
      particles = Array.from({ length: Math.max(12, Math.floor(count * scale)) }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.5 + Math.random() * 1.4,
        vy: 0.06 + Math.random() * 0.22,
        sway: 0.4 + Math.random() * 1.1,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.08 + Math.random() * 0.26,
        hue: HUES[Math.random() < 0.72 ? 0 : Math.random() < 0.6 ? 1 : 2],
      }));
    };

    const draw = (t: number) => {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        p.y -= p.vy;
        if (p.y < -4) {
          p.y = H + 4;
          p.x = Math.random() * W;
        }
        const x = p.x + Math.sin(t / 2600 + p.phase) * p.sway * 14;
        const tw = 0.55 + 0.45 * Math.sin(t / 900 + p.phase * 3);
        ctx.beginPath();
        ctx.arc(x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.hue}, ${(p.alpha * tw).toFixed(3)})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    const start = () => {
      cancelAnimationFrame(raf);
      if (!allowed) {
        // Static single frame for reduced motion users
        draw(0);
        running = false;
        return;
      }
      running = true;
      raf = requestAnimationFrame(draw);
    };

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        running = false;
      } else {
        start();
      }
    };

    seed();
    start();
    window.addEventListener("resize", seed, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", seed);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [allowed, maxParticles]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn("absolute inset-0 h-full w-full", className)}
      style={{ mixBlendMode: "screen", opacity: 0.8 }}
    />
  );
}

// ─── Scroll progress — cinematic top bar ──────────────────────────────────────

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 28, restDelta: 0.001 });
  const lang = useAppStore((s) => s.lang);
  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[70] h-[2.5px] bg-gradient-to-r from-[#9fb7cb] via-[#e8eef4] to-[#d8c9a3] shadow-[0_0_12px_rgba(207,224,238,0.55)]"
      style={{
        scaleX,
        transformOrigin: lang === "ar" ? "right" : "left",
      }}
    />
  );
}

// ─── Cursor glow — desktop-only ambience that follows the pointer ─────────────

export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);
  const allowed = useMotionAllowed();

  useEffect(() => {
    if (!allowed) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    let x = tx;
    let y = ty;
    let visible = false;
    let alive = true;

    const loop = () => {
      if (!alive) return;
      x += (tx - x) * 0.12;
      y += (ty - y) * 0.12;
      el.style.transform = `translate3d(${x - 220}px, ${y - 220}px, 0)`;
      el.style.opacity = visible ? "1" : "0";
      raf = requestAnimationFrame(loop);
    };

    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      visible = true;
    };
    const onLeave = () => {
      visible = false;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(loop);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [allowed]);

  if (!allowed) return null;
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[45] hidden h-[440px] w-[440px] rounded-full md:block"
      style={{
        background: "radial-gradient(closest-side, rgba(159,183,203,0.075), rgba(159,183,203,0.02) 55%, transparent 75%)",
        mixBlendMode: "screen",
        opacity: 0,
        transition: "opacity 0.5s ease",
        willChange: "transform",
      }}
    />
  );
}

// ─── SplitWords — word-by-word cinematic reveal (Arabic-safe: words, not letters) ─

export function SplitWords({
  text,
  className,
  wordClassName,
  delay = 0,
  stagger = 0.055,
  as: Tag = "span",
  once = true,
}: {
  text: string;
  className?: string;
  wordClassName?: string;
  delay?: number;
  stagger?: number;
  as?: "span" | "h1" | "h2" | "h3" | "p";
  once?: boolean;
}) {
  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text]);
  const reduced = useReducedMotion();

  if (reduced) {
    return <Tag className={className}>{text}</Tag>;
  }

  const MotionTag = motion[Tag] as typeof motion.span;
  return (
    <MotionTag
      className={cn("inline-block", className)}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: "-40px" }}
      aria-label={text}
    >
      {words.map((w, i) => (
        <span key={`${w}-${i}`} className="inline-block overflow-hidden pb-[0.12em] align-bottom" aria-hidden>
          <motion.span
            className={cn("inline-block will-change-transform", wordClassName)}
            initial={{ y: "112%", opacity: 0, rotate: 2 }}
            whileInView={{ y: "0%", opacity: 1, rotate: 0 }}
            viewport={{ once, margin: "-40px" }}
            transition={{ duration: 0.75, ease: EASE_CINEMA, delay: delay + i * stagger }}
          >
            {w}
          </motion.span>
          {i < words.length - 1 ? <span>&nbsp;</span> : null}
        </span>
      ))}
    </MotionTag>
  );
}

// ─── CountUp — animated statistic ─────────────────────────────────────────────

export function CountUp({
  value,
  duration = 1.6,
  decimals = 0,
  className,
  format,
}: {
  value: number;
  duration?: number;
  decimals?: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-30px" });
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      const id = requestAnimationFrame(() => setDisplay(value));
      return () => cancelAnimationFrame(id);
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / (duration * 1000));
      const eased = 1 - Math.pow(2, -10 * p);
      setDisplay(p === 1 ? value : value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration, reduced]);

  const shown = format ? format(display) : display.toFixed(decimals);
  return (
    <span ref={ref} className={cn("tabular-nums", className)} dir="ltr">
      {shown}
    </span>
  );
}

// ─── TiltCard — physical 3D tilt with glare (pointer-fine only) ───────────────

export function TiltCard({
  children,
  className,
  max = 9,
  glare = true,
  scale = 1.015,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
  glare?: boolean;
  scale?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const allowed = useMotionAllowed();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const s = useMotionValue(1);
  const srx = useSpring(rx, { stiffness: 220, damping: 22 });
  const sry = useSpring(ry, { stiffness: 220, damping: 22 });
  const ss = useSpring(s, { stiffness: 260, damping: 24 });
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(50);
  const glareBg = useTransform(
    [glareX, glareY],
    ([gx, gy]) =>
      `radial-gradient(320px circle at ${gx}% ${gy}%, rgba(255,255,255,0.14), transparent 60%)`
  );

  const onMove = useCallback(
    (e: React.PointerEvent) => {
      if (!allowed || e.pointerType !== "mouse") return;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      ry.set((px - 0.5) * max * 2);
      rx.set(-(py - 0.5) * max * 2);
      s.set(scale);
      glareX.set(px * 100);
      glareY.set(py * 100);
    },
    [allowed, max, scale, rx, ry, s, glareX, glareY]
  );

  const onLeave = useCallback(() => {
    rx.set(0);
    ry.set(0);
    s.set(1);
  }, [rx, ry, s]);

  if (!allowed) return <div className={className}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ rotateX: srx, rotateY: sry, scale: ss, transformPerspective: 900 }}
      className={cn("tv-tilt relative", className)}
    >
      {children}
      {glare && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: glareBg }}
        />
      )}
    </motion.div>
  );
}

// ─── SpotlightCard — mouse-follow glow using CSS vars (no re-renders) ─────────

export function SpotlightCard({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "article" | "section";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = useCallback((e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }, []);
  const MotionTag = Tag as "div";
  return (
    <MotionTag ref={ref} onPointerMove={onMove} className={cn("tv-spotlight", className)}>
      {children}
    </MotionTag>
  );
}

// ─── Magnetic — element leans toward the cursor ───────────────────────────────

export function Magnetic({
  children,
  strength = 0.28,
  className,
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const allowed = useMotionAllowed();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 180, damping: 16 });
  const sy = useSpring(y, { stiffness: 180, damping: 16 });

  const onMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!allowed || e.pointerType !== "mouse") return;
      const rect = e.currentTarget.getBoundingClientRect();
      x.set((e.clientX - (rect.left + rect.width / 2)) * strength);
      y.set((e.clientY - (rect.top + rect.height / 2)) * strength);
    },
    [allowed, strength, x, y]
  );
  const onLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  if (!allowed) return <div className={className}>{children}</div>;
  return (
    <motion.div onPointerMove={onMove} onPointerLeave={onLeave} style={{ x: sx, y: sy }} className={cn("inline-block", className)}>
      {children}
    </motion.div>
  );
}

// ─── Marquee — infinite ticker strip ──────────────────────────────────────────

export function Marquee({
  children,
  reverse = false,
  duration = 34,
  className,
  trackClassName,
  pauseOnHover = true,
}: {
  children: ReactNode;
  reverse?: boolean;
  duration?: number;
  className?: string;
  trackClassName?: string;
  pauseOnHover?: boolean;
}) {
  return (
    <div className={cn("relative overflow-hidden", pauseOnHover && "tv-marquee-paused", className)} aria-hidden={false}>
      <div
        dir="ltr"
        className={cn("tv-marquee-track", reverse && "tv-marquee-reverse", trackClassName)}
        style={{ "--marquee-dur": `${duration}s` } as CSSProperties}
      >
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── PulseRing — expanding rings around a live dot ────────────────────────────

export function PulseRing({ className, color = "#e5484d" }: { className?: string; color?: string }) {
  return (
    <span className={cn("relative inline-flex h-2.5 w-2.5", className)} aria-hidden>
      <span className="tv-pulse-ring" style={{ color }} />
      <span className="tv-pulse-ring" style={{ color, animationDelay: "0.7s" }} />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: color }} />
    </span>
  );
}

// ─── Beam — drifting vertical light beam (pure CSS) ───────────────────────────

export function Beam({
  className,
  width = 1,
  duration = 11,
  delay = 0,
  height = "46vh",
}: {
  className?: string;
  width?: number;
  duration?: number;
  delay?: number;
  height?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("tv-beam", className)}
      style={{
        width,
        height,
        "--beam-dur": `${duration}s`,
        "--beam-delay": `${delay}s`,
      } as CSSProperties}
    />
  );
}

// ─── ScoreBump — flip/bump animation when a number changes ────────────────────

export function ScoreBump({ value, className }: { value: number | null | undefined; className?: string }) {
  const reduced = useReducedMotion();
  if (value == null) return null;
  return (
    <motion.span
      key={value}
      initial={reduced ? false : { scale: 1.45, color: "#ffffff", filter: "brightness(1.6)" }}
      animate={{ scale: 1, color: "#ffffff", filter: "brightness(1)" }}
      transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
      className={cn("inline-block tabular-nums", className)}
      dir="ltr"
    >
      {value}
    </motion.span>
  );
}

// ─── RevealX / RevealScale — directional reveals complementing shared Reveal ──

export function RevealX({
  children,
  className,
  delay = 0,
  from = "start",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  from?: "start" | "end";
}) {
  const x = from === "start" ? -34 : 34;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, ease: EASE_OUT_EXPO, delay }}
    >
      {children}
    </motion.div>
  );
}

export function RevealScale({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.92, y: 18 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.75, ease: EASE_CINEMA, delay }}
    >
      {children}
    </motion.div>
  );
}

// ─── Stagger — parent that staggers direct motion children ────────────────────

export function Stagger({
  children,
  className,
  stagger = 0.07,
  delay = 0.05,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-50px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
    >
      {children}
    </motion.div>
  );
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT_EXPO } },
};

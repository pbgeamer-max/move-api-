"use client";
// Interactive TVORA wordmark — the brand under Vo is ALIVE.
// • Each letter floats on its own idle bob and lifts magnetically as the
//   cursor approaches (proximity field, no hover needed).
// • Hovering a letter makes it jump + glow champagne; clicking sings its
//   pentatonic note (T-V-O-R-A is literally a melody), spins it and bursts
//   sparkles — and Vo reacts with a happy mood.
// • The wordmark mirrors Vo's mood: letters droop and desaturate when he
//   cries, do a happy wave when he laughs, hop once when surprised.
// • Reduced motion: static elegant wordmark, no schedulers.
import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { sfx } from "@/lib/vo-sounds";
import { useMotionAllowed } from "../motion-fx";
import { cn } from "@/lib/utils";

type WordMood = "idle" | "laugh" | "cry" | "surprised" | "happy";

const LETTERS = ["T", "V", "O", "R", "A"] as const;
// pentatonic C-major — hovering across the name plays a melody
const NOTES = [523.25, 587.33, 659.25, 783.99, 880.0] as const;

type Spark = { id: number; x: number; y: number };

function Letter({
  char, index, mood, allowed, onSpark,
}: {
  char: string;
  index: number;
  mood: WordMood;
  allowed: boolean;
  onSpark: (x: number, y: number, el: HTMLElement) => void;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [hover, setHover] = useState(false);
  const [burstKey, setBurstKey] = useState(0);

  // magnetic proximity lift
  const lift = useMotionValue(0);
  const y = useSpring(lift, { stiffness: 210, damping: 16, mass: 0.6 });

  useEffect(() => {
    if (!allowed) return;
    const onMove = (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
      lift.set(Math.max(0, 1 - d / 170) ** 1.6 * 15);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [allowed, lift]);

  const click = () => {
    sfx.pluck(NOTES[index]);
    if (allowed) {
      setBurstKey((k) => k + 1);
      const el = ref.current;
      if (el) {
        const r = el.getBoundingClientRect();
        onSpark(r.left + r.width / 2, r.top + r.height / 2, el);
      }
      window.dispatchEvent(new CustomEvent("tvora:face", { detail: { mood: "happy", dur: 1300 } }));
    }
  };

  // pose driven by Vo's mirrored mood
  const droop = mood === "cry";
  const wave = mood === "laugh";
  const hop = mood === "surprised" || mood === "happy";
  const waveY = wave ? (allowed ? [0, -9, 0] : 0) : 0;

  return (
    <motion.span
      ref={ref}
      className="relative inline-block cursor-pointer select-none"
      style={{ y }}
      aria-hidden
      data-testid={`gate-letter-${index}`}
      onMouseEnter={() => {
        setHover(true);
        sfx.pluck(NOTES[index], 0.07);
      }}
      onMouseLeave={() => setHover(false)}
      onClick={click}
      animate={
        allowed
          ? hover
            ? { scale: 1.22, y: -8, rotate: index % 2 ? 4 : -4 }
            : droop
              ? { scale: 0.97, y: 7, rotate: 0 }
              : hop
                ? { scale: [1, 1.12, 1], y: [0, -6, 0], rotate: 0 }
                : wave
                  ? { scale: 1, y: waveY, rotate: 0 }
                  : { scale: 1, y: 0, rotate: 0 }
          : undefined
      }
      transition={
        hop
          ? { duration: 0.5, delay: index * 0.06, ease: "easeOut" }
          : wave
            ? { duration: 0.55, delay: index * 0.08, ease: "easeInOut" }
            : { type: "spring", stiffness: 320, damping: 17 }
      }
    >
      {/* the glyph itself carries the gradient (own background-clip: text) and
          does a full playful spin on click (CSS keyframes, replayed via key) */}
      <span
        key={`glyph-${burstKey}`}
        className={burstKey > 0 ? "tv-letter-spin tv-metal-text" : "tv-metal-text"}
        style={{
          display: "inline-block",
          filter: droop ? "saturate(0.45) brightness(0.8)" : hover ? "brightness(1.18)" : undefined,
          transition: "filter 0.45s ease",
          backgroundImage: hover
            ? "linear-gradient(180deg,#fff6dd 0%,#e9d9ac 40%,#c9b586 55%,#fff2d2 70%,#ddc894 100%)"
            : droop
              ? "linear-gradient(180deg,#9fb7cb 0%,#7d94a8 45%,#5d7085 60%,#8fa3b5 100%)"
              : undefined,
        }}
      >
        {char}
      </span>
      {/* click sparkle burst */}
      {burstKey > 0 && allowed && (
        <span key={`burst-${burstKey}`} className="pointer-events-none absolute inset-0" aria-hidden>
          {Array.from({ length: 7 }).map((_, i) => {
            const a = (i / 7) * Math.PI * 2 + Math.random();
            const dist = 22 + Math.random() * 26;
            return (
              <motion.span
                key={i}
                className="absolute left-1/2 top-1/2 block h-1.5 w-1.5 rounded-full bg-[#ffe9b8]"
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{ x: Math.cos(a) * dist, y: Math.sin(a) * dist - 8, opacity: 0, scale: 0.4 }}
                transition={{ duration: 0.65, ease: "easeOut" }}
              />
            );
          })}
        </span>
      )}
    </motion.span>
  );
}

export function InteractiveWordmark({ className }: { className?: string }) {
  const allowed = useMotionAllowed();
  const [mood, setMood] = useState<WordMood>("idle");
  const [sparks, setSparks] = useState<Spark[]>([]);

  // mirror Vo's mood (broadcast by face-character on every mood change)
  useEffect(() => {
    if (!allowed) return;
    let t = 0;
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ mood?: WordMood; dur?: number }>).detail || {};
      if (!d.mood) return;
      setMood(d.mood);
      window.clearTimeout(t);
      t = window.setTimeout(() => setMood("idle"), Math.min(4200, d.dur ?? 2200));
    };
    window.addEventListener("tvora:face-mood", on);
    return () => {
      window.removeEventListener("tvora:face-mood", on);
      window.clearTimeout(t);
    };
  }, [allowed]);

  const addSpark = (x: number, y: number, el: HTMLElement) => {
    const id = Date.now() + Math.random();
    setSparks((s) => [...s.slice(-3), { id, x, y }]);
    window.setTimeout(() => setSparks((s) => s.filter((p) => p.id !== id)), 850);
  };

  return (
    <div className={cn("relative", className)}>
      <h1
        dir="ltr"
        className="text-5xl font-black tracking-[0.14em] sm:text-6xl"
        style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}
        aria-label="TVORA"
        role="heading"
        aria-level={1}
        data-testid="gate-wordmark"
      >
        {LETTERS.map((ch, i) => (
          <Letter key={ch} char={ch} index={i} mood={mood} allowed={allowed} onSpark={addSpark} />
        ))}
      </h1>

      {/* floating sparkles rendered at viewport level (fixed, from click position) */}
      {sparks.map((s) => (
        <span key={s.id} className="pointer-events-none fixed z-40" style={{ left: s.x, top: s.y }} aria-hidden>
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i / 8) * Math.PI * 2;
            const dist = 26 + Math.random() * 30;
            return (
              <motion.span
                key={i}
                className="absolute block rounded-full"
                style={{
                  width: 3 + Math.random() * 3,
                  height: 3 + Math.random() * 3,
                  background: i % 2 ? "#ffe9b8" : "#cfe0ee",
                }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{ x: Math.cos(a) * dist, y: Math.sin(a) * dist - 14, opacity: 0, scale: 0.3 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              />
            );
          })}
        </span>
      ))}
    </div>
  );
}

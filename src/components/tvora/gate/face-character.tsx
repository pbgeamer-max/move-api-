"use client";
// ڤو (Vo) — TVORA's living gatekeeper face.
// An expressive SVG character: eyes that track the cursor across the whole page,
// random blinking (with double-blinks), autonomous mood swings — sometimes it
// laughs (bounce + open mouth + blush + sparkles), sometimes it cries (falling
// tears, tilted brows, blue glow) — it gets surprised when the cursor comes
// close, dozes off with floating z's when ignored, and reacts to form events
// via the `tvora:face` CustomEvent { mood?, dur?, say? }.
// Reduced-motion: renders a calm static face, no schedulers.
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { sfx } from "@/lib/vo-sounds";
import { useT } from "../shared";
import { useMotionAllowed } from "../motion-fx";
import { cn } from "@/lib/utils";

type Mood = "idle" | "happy" | "laugh" | "cry" | "surprised" | "sleepy";

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

// Mouth shapes — identical command structure (M Q Q Z) so framer can morph `d`.
const MOUTH: Record<Mood, string> = {
  idle: "M142,231 Q170,243 198,231 Q170,250 142,231 Z",
  happy: "M138,229 Q170,251 202,229 Q170,257 138,229 Z",
  laugh: "M131,225 Q170,284 209,225 Q170,261 131,225 Z",
  cry: "M144,243 Q170,225 196,243 Q170,252 144,243 Z",
  surprised: "M157,233 Q170,219 183,233 Q170,248 157,233 Z",
  sleepy: "M152,237 Q170,245 188,237 Q170,252 152,237 Z",
};

const GLOW: Record<Mood, string> = {
  idle: "#d8c9a3",
  happy: "#e8d5ae",
  laugh: "#ffcf8f",
  cry: "#8fbcd9",
  surprised: "#cfe0ee",
  sleepy: "#6b7382",
};

// brow: [y, rotateLeft, rotateRight]
const BROW: Record<Mood, [number, number, number]> = {
  idle: [0, 0, 0],
  happy: [-5, 0, 0],
  laugh: [-7, 0, 0],
  cry: [-2, -9, 9],
  surprised: [-11, 0, 0],
  sleepy: [4, 7, -7],
};

export function FaceCharacter({ size = 300, className }: { size?: number; className?: string }) {
  const { t, lang } = useT();
  const allowed = useMotionAllowed();
  const uid = useId().replace(/[:]/g, "");

  const [mood, setMood] = useState<Mood>(allowed ? "idle" : "happy");
  const [blink, setBlink] = useState(false);
  const [bubble, setBubble] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [wobble, setWobble] = useState(0); // poke wiggle replay key

  const moodRef = useRef<Mood>(mood);
  const moodUntil = useRef(0);
  const backT = useRef<number>(0);
  const sayT = useRef<number>(0);
  const pokeT = useRef<number>(0);
  const surpriseT = useRef<number>(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const dir = lang === "ar" ? 1 : -1;

  // ── speech bubble with typewriter ──────────────────────────────────────────
  const say = useCallback(
    (key?: string) => {
      if (!key) return;
      const txt = t(`gate.face.${key}`);
      if (!txt) return;
      sfx.blip();
      setBubble(txt);
      window.clearTimeout(sayT.current);
      sayT.current = window.setTimeout(() => setBubble(null), Math.min(6400, 1700 + txt.length * 64));
    },
    [t],
  );

  useEffect(() => {
    if (!bubble || !allowed) return;
    let i = 0;
    const iv = window.setInterval(() => {
      i += 1;
      setTyped(bubble.slice(0, i));
      if (i >= bubble.length) window.clearInterval(iv);
    }, 26);
    const reset = window.setTimeout(() => setTyped(""), 0);
    return () => {
      window.clearInterval(iv);
      window.clearTimeout(reset);
    };
  }, [bubble, allowed]);

  // what the bubble shows: partial text while typing, full text when done
  const shown = bubble
    ? typed.length < bubble.length && bubble.startsWith(typed)
      ? typed
      : bubble
    : "";

  // ── opening greeting (once, shortly after mount) ───────────────────────────
  useEffect(() => {
    if (!allowed) return;
    const t = window.setTimeout(() => {
      if (Date.now() >= moodUntil.current) say("hello");
    }, 900);
    return () => window.clearTimeout(t);
  }, [allowed, say]);

  // ── mood setter with auto-return to idle ───────────────────────────────────
  // every mood change also SINGS (synthesized voice) and is broadcast on
  // `tvora:face-mood` so the interactive wordmark can dance along.
  const setMoodFor = useCallback((m: Mood, dur: number) => {
    moodRef.current = m;
    moodUntil.current = Date.now() + dur;
    setMood(m);
    window.dispatchEvent(new CustomEvent("tvora:face-mood", { detail: { mood: m, dur } }));
    if (allowed) {
      if (m === "laugh") sfx.giggle();
      else if (m === "cry") sfx.cry();
      else if (m === "surprised") sfx.surprise();
      else if (m === "happy") sfx.happy();
      else if (m === "sleepy") sfx.yawn();
    }
    window.clearTimeout(backT.current);
    backT.current = window.setTimeout(
      () => {
        if (moodRef.current === m && Date.now() >= moodUntil.current) {
          moodRef.current = "idle";
          setMood("idle");
        }
      },
      dur + 80,
    );
  }, [allowed]);

  // ── external events: { mood?, dur?, say? } ─────────────────────────────────
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ mood?: Mood; dur?: number; say?: string }>).detail || {};
      if (d.say) say(d.say);
      if (d.mood && allowed) setMoodFor(d.mood, d.dur ?? 2400);
    };
    window.addEventListener("tvora:face", on);
    return () => window.removeEventListener("tvora:face", on);
  }, [say, setMoodFor, allowed]);

  // ── autonomous mood swings: sometimes laughs, sometimes cries ──────────────
  useEffect(() => {
    if (!allowed) return;
    let alive = true;
    let t = 0;
    const plan = () => {
      if (!alive) return;
      t = window.setTimeout(
        () => {
          if (!alive) return;
          if (Date.now() < moodUntil.current) {
            plan();
            return;
          }
          const roll = Math.random();
          if (roll < 0.3) {
            setMoodFor("laugh", 2800);
            if (Math.random() < 0.45) say("laugh");
          } else if (roll < 0.58) {
            setMoodFor("cry", 3400);
            if (Math.random() < 0.45) say("cry");
          } else if (roll < 0.76) {
            setMoodFor("surprised", 1500);
          } else {
            setMoodFor("happy", 2300);
          }
          plan();
        },
        5400 + Math.random() * 4300,
      );
    };
    plan();
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [allowed, setMoodFor, say]);

  // ── blinking (with occasional double-blink) ────────────────────────────────
  useEffect(() => {
    if (!allowed) return;
    let alive = true;
    let t1 = 0;
    let t2 = 0;
    const loop = () => {
      if (!alive) return;
      t1 = window.setTimeout(
        () => {
          if (!alive) return;
          if (moodRef.current === "sleepy") {
            loop();
            return;
          }
          setBlink(true);
          sfx.pop();
          t2 = window.setTimeout(() => {
            setBlink(false);
            if (Math.random() < 0.17) {
              t2 = window.setTimeout(() => {
                setBlink(true);
                t2 = window.setTimeout(() => {
                  setBlink(false);
                  loop();
                }, 105);
              }, 135);
            } else loop();
          }, 125);
        },
        2300 + Math.random() * 3300,
      );
    };
    loop();
    return () => {
      alive = false;
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [allowed]);

  // ── sleepy when ignored, wakes on any activity ─────────────────────────────
  useEffect(() => {
    if (!allowed) return;
    let t = 0;
    const reset = () => {
      window.clearTimeout(t);
      if (moodRef.current === "sleepy") {
        sfx.wake();
        setMoodFor("surprised", 1000);
      }
      t = window.setTimeout(() => {
        setMoodFor("sleepy", 9999999);
        say("sleepy");
      }, 26000);
    };
    reset();
    window.addEventListener("mousemove", reset, { passive: true });
    window.addEventListener("keydown", reset);
    window.addEventListener("touchstart", reset, { passive: true });
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("mousemove", reset);
      window.removeEventListener("keydown", reset);
      window.removeEventListener("touchstart", reset);
    };
  }, [allowed, setMoodFor, say]);

  // ── eyes track the cursor + surprise on close approach ─────────────────────
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 140, damping: 15, mass: 0.55 });
  const sy = useSpring(py, { stiffness: 140, damping: 15, mass: 0.55 });

  useEffect(() => {
    if (!allowed) return;
    const on = (e: MouseEvent) => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const nx = clamp((e.clientX - cx) / (r.width * 0.95), -1, 1);
      const ny = clamp((e.clientY - cy) / (r.height * 0.95), -1, 1);
      px.set(nx * 9);
      py.set(ny * 7.5);
      if (Math.hypot(e.clientX - cx, e.clientY - cy) < 170) {
        const now = Date.now();
        if (now > surpriseT.current && moodRef.current !== "sleepy" && now >= moodUntil.current) {
          surpriseT.current = now + 7500;
          setMoodFor("surprised", 1150);
        }
      }
    };
    window.addEventListener("mousemove", on, { passive: true });
    return () => window.removeEventListener("mousemove", on);
  }, [allowed, px, py, setMoodFor]);

  // ── poke → laugh ───────────────────────────────────────────────────────────
  const poke = () => {
    if (!allowed) return;
    const now = Date.now();
    if (now < pokeT.current) return;
    pokeT.current = now + 2600;
    setWobble((w) => w + 1);
    sfx.boing();
    window.setTimeout(() => sfx.giggle(), 240);
    setMoodFor("laugh", 2300);
    say("poke");
  };

  // ── derived pose ───────────────────────────────────────────────────────────
  const laughing = mood === "laugh";
  const crying = mood === "cry";
  const sleepy = mood === "sleepy";
  const surprised = mood === "surprised";

  const lidAnim = sleepy
    ? { y: 181, height: 22 }
    : laughing
      ? { y: 141, height: 50 }
      : blink
        ? { y: 184, height: 17 }
        : { y: 120, height: 78 };
  const lidTransition = blink ? { duration: 0.09, ease: "linear" as const } : { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const };

  const [browY, browL, browR] = BROW[mood];
  const glow = GLOW[mood];

  const headPose = crying
    ? { rotate: -3 * dir, y: 5, scale: 0.99 }
    : surprised
      ? { rotate: 0, y: -4, scale: 1.045 }
      : sleepy
        ? { rotate: 4 * dir, y: 7, scale: 0.985 }
        : { rotate: 0, y: 0, scale: 1 };

  return (
    <div ref={wrapRef} className={cn("relative select-none", className)} style={{ width: size, height: size }}>
      {/* mood halo behind the character */}
      <motion.div
        aria-hidden
        className="absolute inset-[-14%] rounded-full"
        animate={allowed ? { opacity: [0.5, 0.72, 0.5] } : { opacity: 0.55 }}
        transition={allowed ? { duration: 3.4, repeat: Infinity, ease: "easeInOut" } : undefined}
        style={{ background: `radial-gradient(closest-side, ${glow}2e, ${glow}14 55%, transparent 72%)`, transition: "background 0.6s ease" }}
      />

      {/* orbital dashed ring with two drifting stars */}
      {allowed && (
        <motion.svg
          aria-hidden
          viewBox="0 0 340 340"
          className="pointer-events-none absolute inset-0 h-full w-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}
        >
          <ellipse cx="170" cy="182" rx="152" ry="46" fill="none" stroke="#d8c9a3" strokeOpacity="0.16" strokeWidth="1.4" strokeDasharray="3 11" transform="rotate(-13 170 182)" />
          <circle cx="316" cy="176" r="3" fill="#d8c9a3" fillOpacity="0.5" />
          <circle cx="30" cy="196" r="2.2" fill="#9fb7cb" fillOpacity="0.5" />
        </motion.svg>
      )}

      {/* the face */}
      <motion.svg
        viewBox="0 0 340 340"
        className="relative h-full w-full cursor-pointer"
        onClick={poke}
        role="img"
        aria-label="Vo — TVORA mascot"
        data-testid="face-character"
        animate={allowed ? { rotate: wobble ? [0, -5, 5, -3, 3, 0] : 0 } : undefined}
        key={wobble}
        transition={{ duration: 0.55, ease: "easeInOut" }}
      >
        <defs>
          <radialGradient id={`skin${uid}`} cx="42%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#23262d" />
            <stop offset="55%" stopColor="#17191f" />
            <stop offset="100%" stopColor="#0d0e12" />
          </radialGradient>
          <linearGradient id={`sclera${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f6f9fc" />
            <stop offset="100%" stopColor="#c9d6e2" />
          </linearGradient>
          <radialGradient id={`iris${uid}`} cx="38%" cy="32%" r="75%">
            <stop offset="0%" stopColor="#4a5568" />
            <stop offset="100%" stopColor="#1d222c" />
          </radialGradient>
          <clipPath id={`lidL${uid}`}>
            <motion.rect x={94} animate={lidAnim} transition={lidTransition} width={68} height={78} fill="#fff" />
          </clipPath>
          <clipPath id={`lidR${uid}`}>
            <motion.rect x={178} animate={lidAnim} transition={lidTransition} width={68} height={78} fill="#fff" />
          </clipPath>
          <filter id={`soft${uid}`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="22" />
          </filter>
        </defs>

        {/* ambient glow (color follows the mood) */}
        <motion.ellipse cx="170" cy="182" rx="112" ry="104" fill={glow} opacity="0.16" filter={`url(#soft${uid})`} animate={{ fill: glow }} transition={{ duration: 0.6 }} />

        <motion.g animate={headPose} transition={{ type: "spring", stiffness: 210, damping: 16 }}>
          {/* antenna */}
          <motion.g
            animate={allowed ? { rotate: [-3.5, 3.5, -3.5] } : undefined}
            transition={allowed ? { duration: 4.2, repeat: Infinity, ease: "easeInOut" } : undefined}
            style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
          >
            <path d="M170,76 L133,30" stroke="#3a3f4a" strokeWidth="5" strokeLinecap="round" fill="none" />
            <path d="M170,76 L207,30" stroke="#3a3f4a" strokeWidth="5" strokeLinecap="round" fill="none" />
            <motion.circle cx="133" cy="30" r="7.5" animate={{ fill: glow }} transition={{ duration: 0.6 }} />
            <motion.circle cx="207" cy="30" r="7.5" animate={{ fill: glow }} transition={{ duration: 0.6 }} />
            <circle cx="133" cy="30" r="3" fill="#ffffff" fillOpacity="0.55" />
            <circle cx="207" cy="30" r="3" fill="#ffffff" fillOpacity="0.55" />
          </motion.g>

          {/* laughing bounce wrapper */}
          <motion.g
            animate={allowed && laughing ? { y: [0, -7, 0] } : { y: 0 }}
            transition={allowed && laughing ? { duration: 0.42, repeat: Infinity, ease: "easeInOut" } : { duration: 0.25 }}
          >
            {/* head */}
            <ellipse cx="170" cy="182" rx="118" ry="110" fill={`url(#skin${uid})`} stroke="#3d4350" strokeOpacity="0.55" strokeWidth="1.6" />
            {/* glass sheen */}
            <ellipse cx="132" cy="126" rx="72" ry="46" fill="#ffffff" fillOpacity="0.045" />
            {/* rim light */}
            <path d="M62,142 A112,106 0 0 1 170,74" fill="none" stroke="#d8c9a3" strokeOpacity="0.28" strokeWidth="2" strokeLinecap="round" />
            {/* rec dot */}
            {allowed && !sleepy && (
              <motion.circle cx="90" cy="118" r="4.2" fill="#e5484d" animate={{ opacity: [1, 0.18, 1] }} transition={{ duration: 2.7, repeat: Infinity, ease: "easeInOut" }} />
            )}

            {/* brows */}
            <motion.path
              d="M106,118 Q127,108 148,116"
              fill="none" stroke="#cfd8e3" strokeWidth="6" strokeLinecap="round"
              animate={{ y: browY, rotate: browL }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}
            />
            <motion.path
              d="M192,116 Q213,108 234,118"
              fill="none" stroke="#cfd8e3" strokeWidth="6" strokeLinecap="round"
              animate={{ y: browY, rotate: browR }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}
            />

            {/* eyes */}
            {[
              { cx: 128, clip: `lidL${uid}` },
              { cx: 212, clip: `lidR${uid}` },
            ].map((eye) => (
              <g key={eye.cx}>
                <g clipPath={`url(#${eye.clip})`}>
                  <ellipse cx={eye.cx} cy="158" rx="27" ry="31" fill={`url(#sclera${uid})`} />
                  {crying && <ellipse cx={eye.cx} cy="178" rx="20" ry="9" fill="#bfe3ff" fillOpacity="0.4" />}
                  <motion.g style={{ x: sleepy ? 0 : sx, y: sleepy ? 0 : sy }}>
                    <circle cx={eye.cx} cy="158" r="13.5" fill={`url(#iris${uid})`} />
                    <circle cx={eye.cx} cy="158" r="6.8" fill="#07080b" />
                    <circle cx={eye.cx - 4.5} cy="152.5" r="4.4" fill="#ffffff" fillOpacity="0.95" />
                    <circle cx={eye.cx + 4} cy="163.5" r="2" fill="#ffffff" fillOpacity="0.6" />
                  </motion.g>
                </g>
                <ellipse cx={eye.cx} cy="158" rx="27" ry="31" fill="none" stroke="#05060a" strokeOpacity="0.65" strokeWidth="2" />
              </g>
            ))}

            {/* blush */}
            <motion.ellipse cx="100" cy="208" rx="15" ry="8" fill="#ff8a8e" initial={{ opacity: 0 }} animate={{ opacity: laughing ? 0.5 : mood === "happy" ? 0.28 : 0 }} transition={{ duration: 0.4 }} />
            <motion.ellipse cx="240" cy="208" rx="15" ry="8" fill="#ff8a8e" initial={{ opacity: 0 }} animate={{ opacity: laughing ? 0.5 : mood === "happy" ? 0.28 : 0 }} transition={{ duration: 0.4 }} />

            {/* mouth (morphing) */}
            <motion.path d={MOUTH[mood]} fill="#0a0b0f" stroke="#05060a" strokeOpacity="0.6" strokeWidth="1.5" animate={{ d: MOUTH[mood] }} transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }} />
            {/* tongue on laugh */}
            <motion.ellipse cx="170" cy="256" rx="17" ry="9" fill="#ff7f8d" initial={{ opacity: 0 }} animate={{ opacity: laughing ? 1 : 0 }} transition={{ duration: 0.3 }} style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }} />

            {/* tears */}
            {crying &&
              [
                { cx: 114, delay: 0 },
                { cx: 140, delay: 0.5 },
                { cx: 200, delay: 0.25 },
                { cx: 226, delay: 0.75 },
              ].map((d) => (
                <motion.path
                  key={d.cx}
                  d="M0,-6.5 C4.2,-2.2 5.4,2 0,6.8 C-5.4,2 -4.2,-2.2 0,-6.5"
                  fill="#9fc7e8"
                  initial={{ x: d.cx, y: 192, opacity: 0 }}
                  animate={{ y: [192, 200, 246], x: [d.cx, d.cx + 2.5, d.cx - 1], opacity: [0, 1, 0], scale: [0.7, 1, 0.75] }}
                  transition={{ duration: 1.05, repeat: Infinity, delay: d.delay, ease: "easeIn" }}
                />
              ))}

            {/* laugh sparkles */}
            {laughing &&
              [
                { x: 58, y: 96, delay: 0 },
                { x: 276, y: 88, delay: 0.35 },
                { x: 250, y: 250, delay: 0.7 },
              ].map((s) => (
                <motion.path
                  key={s.x}
                  d="M0,-7 L1.9,-1.9 L7,0 L1.9,1.9 L0,7 L-1.9,1.9 L-7,0 L-1.9,-1.9 Z"
                  fill="#ffe9b8"
                  animate={{ y: [s.y, s.y - 30], opacity: [0, 1, 0], rotate: [0, 95], scale: [0.6, 1.05, 0.7] }}
                  transition={{ duration: 1.35, repeat: Infinity, delay: s.delay, ease: "easeOut" }}
                  style={{ x: s.x }}
                />
              ))}

            {/* sleepy z's */}
            {sleepy &&
              [
                { x: 252, y: 96, delay: 0 },
                { x: 272, y: 74, delay: 0.8 },
                { x: 288, y: 54, delay: 1.6 },
              ].map((z, i) => (
                <motion.text
                  key={i}
                  x={z.x}
                  y={z.y}
                  fontSize={16 + i * 3}
                  fontWeight="800"
                  fill="#9aa4b2"
                  animate={{ y: [z.y, z.y - 26], x: [z.x, z.x + 9], opacity: [0, 0.9, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: z.delay, ease: "easeOut" }}
                >
                  z
                </motion.text>
              ))}
          </motion.g>
        </motion.g>
      </motion.svg>

      {/* speech bubble */}
      <div className="pointer-events-none absolute inset-x-0 top-[-14px] z-10 flex justify-center" dir={lang === "ar" ? "rtl" : "ltr"}>
        <motion.div
          initial={false}
          animate={bubble ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 8, scale: 0.92 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="relative max-w-[300px] rounded-2xl bg-[#edf1f6] px-4 py-2.5 text-center text-[13px] font-bold leading-snug text-[#0b0c10] shadow-[0_18px_50px_-12px_rgba(0,0,0,0.9)]"
          data-testid="face-bubble"
          aria-live="polite"
        >
          {shown}
          <span className="absolute bottom-[-7px] left-1/2 h-3.5 w-3.5 -translate-x-1/2 rotate-45 rounded-[3px] bg-[#edf1f6]" aria-hidden />
        </motion.div>
      </div>
    </div>
  );
}

"use client";
// TVORA voice engine — 100% synthesized Web Audio. No audio files, zero latency.
// Every sound is "performed" procedurally with slight random pitch variance so
// repetition never feels robotic:
//   giggle()   cute "hihihi" — accelerating rising blips (laughing Vo)
//   cry()      soft cartoon wail with vibrato + a little hiccup (crying Vo)
//   surprise() quick rising "oh!"
//   happy()    two-note ascending purr
//   yawn()     sleepy descending slide, wake() to wake up
//   pop()      micro tick used for blinks (heavily throttled)
//   blip()     speech-bubble tick
//   boing()    springy poke response
//   pluck(f)   pentatonic musical note for the interactive TVORA letters
//   chord()/chime()/err() — UI celebration & error feedback
// Autoplay-safe: the AudioContext is created/resumed on the first user gesture.
// Mute state persists in localStorage("tvora.sound"); everything fails silently
// when disabled or unsupported.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let armed = false;

const LS_KEY = "tvora.sound";

export function soundEnabled(): boolean {
  try {
    return window.localStorage.getItem(LS_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean) {
  try {
    window.localStorage.setItem(LS_KEY, on ? "1" : "0");
  } catch {
    /* private mode */
  }
}

/** Wire one-time gesture listeners that bring the AudioContext to life. */
function arm() {
  if (armed || typeof window === "undefined") return;
  armed = true;
  const kick = () => {
    ensureCtx();
    window.removeEventListener("pointerdown", kick);
    window.removeEventListener("keydown", kick);
    window.removeEventListener("touchstart", kick);
  };
  window.addEventListener("pointerdown", kick, { passive: true });
  window.addEventListener("keydown", kick);
  window.addEventListener("touchstart", kick, { passive: true });
}

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!ctx) {
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 6;
      master = ctx.createGain();
      master.gain.value = 0.85;
      master.connect(comp);
      comp.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

// tiny pitch variance so repeats sound organic
const v = (hz: number) => hz * (1 + (Math.random() - 0.5) * 0.06);

type ToneOpts = {
  type?: OscillatorType;
  from: number;
  to?: number;
  dur: number;
  gain?: number;
  delay?: number;
  vibrato?: { rate: number; depth: number };
  glideCurve?: "exp" | "lin";
};

function tone({ type = "sine", from, to, dur, gain = 0.12, delay = 0, vibrato, glideCurve = "exp" }: ToneOpts) {
  const c = ensureCtx();
  if (!c || !master || !soundEnabled()) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(30, v(from)), t0);
  if (to && to !== from) {
    if (glideCurve === "exp") osc.frequency.exponentialRampToValueAtTime(Math.max(30, v(to)), t0 + dur);
    else osc.frequency.linearRampToValueAtTime(Math.max(30, v(to)), t0 + dur);
  }
  if (vibrato) {
    const lfo = c.createOscillator();
    lfo.frequency.value = vibrato.rate;
    const lfoGain = c.createGain();
    lfoGain.gain.value = vibrato.depth;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start(t0);
    lfo.stop(t0 + dur + 0.05);
  }
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.03, dur * 0.25));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/** filtered noise burst — used for breathy edges (sniff, sparkles) */
function noise(dur: number, gain = 0.05, delay = 0, freq = 2400, q = 1.2) {
  const c = ensureCtx();
  if (!c || !master || !soundEnabled()) return;
  const t0 = c.currentTime + delay;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = freq;
  bp.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(bp);
  bp.connect(g);
  g.connect(master);
  src.start(t0);
}

// ── throttling map (prevent spam, e.g. blink ticks) ──────────────────────────
const last: Record<string, number> = {};
function throttled(key: string, ms: number): boolean {
  const now = Date.now();
  if ((last[key] ?? 0) > now) return true;
  last[key] = now + ms;
  return false;
}

// ── the performance ───────────────────────────────────────────────────────────
export const sfx = {
  /** cute accelerating giggle "hi-hi-hi-hihihihi" */
  giggle() {
    if (!soundEnabled() || throttled("giggle", 1400)) return;
    let delay = 0;
    let gap = 0.115;
    for (let i = 0; i < 6; i++) {
      const f = 780 + i * 62 + Math.random() * 40;
      tone({ type: "triangle", from: f, to: f * 1.22, dur: 0.075, gain: 0.085, delay });
      tone({ type: "sine", from: f * 2, to: f * 2.2, dur: 0.05, gain: 0.03, delay });
      delay += gap;
      gap = Math.max(0.052, gap * 0.82); // accelerates like real laughter
    }
  },

  /** soft cartoon wail + hiccup — sad but adorable, never annoying */
  cry() {
    if (!soundEnabled() || throttled("cry", 2400)) return;
    // main wail
    tone({ type: "sawtooth", from: 560, to: 300, dur: 0.85, gain: 0.05, vibrato: { rate: 6.4, depth: 16 } });
    tone({ type: "sine", from: 560, to: 300, dur: 0.85, gain: 0.07, vibrato: { rate: 6.4, depth: 16 } });
    // little hiccup sob
    tone({ type: "triangle", from: 480, to: 620, dur: 0.16, gain: 0.06, delay: 1.0 });
    tone({ type: "triangle", from: 430, to: 560, dur: 0.14, gain: 0.05, delay: 1.24 });
    noise(0.28, 0.02, 0.82, 1200, 0.8); // sniff
  },

  surprise() {
    if (!soundEnabled() || throttled("surprise", 1200)) return;
    tone({ type: "sine", from: 420, to: 760, dur: 0.14, gain: 0.09 });
    tone({ type: "sine", from: 760, to: 620, dur: 0.1, gain: 0.05, delay: 0.15 });
  },

  /** two-note ascending purr */
  happy() {
    if (!soundEnabled() || throttled("happy", 1200)) return;
    tone({ type: "triangle", from: 523, to: 523, dur: 0.11, gain: 0.07 });
    tone({ type: "triangle", from: 784, to: 784, dur: 0.16, gain: 0.07, delay: 0.12 });
  },

  yawn() {
    if (!soundEnabled() || throttled("yawn", 4000)) return;
    tone({ type: "sine", from: 400, to: 210, dur: 0.7, gain: 0.05 });
  },

  wake() {
    if (!soundEnabled()) return;
    tone({ type: "sine", from: 500, to: 880, dur: 0.1, gain: 0.08 });
    tone({ type: "sine", from: 880, to: 1040, dur: 0.12, gain: 0.07, delay: 0.11 });
  },

  /** micro tick for eye blinks — whisper level */
  pop() {
    if (!soundEnabled() || throttled("pop", 900)) return;
    tone({ type: "sine", from: 1500, to: 900, dur: 0.045, gain: 0.028 });
  },

  /** speech bubble appears */
  blip() {
    if (!soundEnabled() || throttled("blip", 700)) return;
    tone({ type: "triangle", from: 900, to: 1200, dur: 0.06, gain: 0.045 });
  },

  /** springy poke! */
  boing() {
    if (!soundEnabled()) return;
    tone({ type: "triangle", from: 330, to: 130, dur: 0.34, gain: 0.11, vibrato: { rate: 13, depth: 34 } });
  },

  /** pentatonic pluck — one letter of TVORA sings */
  pluck(freq: number, gain = 0.11) {
    if (!soundEnabled()) return;
    tone({ type: "triangle", from: freq, to: freq, dur: 0.5, gain });
    tone({ type: "sine", from: freq * 2, to: freq * 2, dur: 0.32, gain: gain * 0.35 });
    tone({ type: "sine", from: freq * 3.01, to: freq * 3.01, dur: 0.16, gain: gain * 0.14 });
  },

  /** success sparkle arpeggio */
  chime() {
    if (!soundEnabled()) return;
    const seq = [523.25, 659.25, 783.99, 1046.5];
    seq.forEach((f, i) => {
      tone({ type: "triangle", from: f, to: f, dur: 0.42, gain: 0.09, delay: i * 0.09 });
      tone({ type: "sine", from: f * 2, to: f * 2, dur: 0.22, gain: 0.03, delay: i * 0.09 });
    });
    noise(0.5, 0.018, 0.36, 5200, 0.7); // glitter
  },

  /** soft low double-buzz for errors */
  err() {
    if (!soundEnabled() || throttled("err", 900)) return;
    tone({ type: "square", from: 190, to: 160, dur: 0.11, gain: 0.045 });
    tone({ type: "square", from: 165, to: 135, dur: 0.13, gain: 0.045, delay: 0.14 });
  },
};

// arm the gesture unlock as soon as this module is imported anywhere
if (typeof window !== "undefined") arm();

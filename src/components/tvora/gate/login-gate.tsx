"use client";
// TVORA login gate — the cinematic entry screen shown before the app itself.
// X-inspired split layout that mirrors with direction (RTL: face left / form
// right — exactly like the reference; LTR: form left / face right).
// Left panel: the living character "Vo" above the TVORA wordmark.
// Right panel: social buttons (playful "soon"), a two-step email → password
// flow on the real auth API, inline register, guest entry, demo quick-fill.
// Success: Vo laughs + confetti burst → the gate dissolves into the app.
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationControls, type Variants } from "framer-motion";
import { Apple, Eye, EyeOff, Languages, Loader2, Smartphone, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { sfx, soundEnabled, setSoundEnabled } from "@/lib/vo-sounds";
import type { SessionUser } from "@/lib/types";
import { useT } from "../shared";
import { useMotionAllowed, AuroraBackdrop, AmbientDust } from "../motion-fx";
import { FaceCharacter } from "./face-character";
import { InteractiveWordmark } from "./interactive-wordmark";
import { cn } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Step = "email" | "password" | "register";

const formParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } },
};
const formItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

// multi-color Google "G"
function GoogleG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-[18px] w-[18px]", className)} aria-hidden>
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.46a5.53 5.53 0 0 1-2.4 3.63v3.01h3.88c2.27-2.09 3.56-5.17 3.56-8.83Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.88-3.01c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.28v3.11A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.28 14.29A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.57.38-2.29V6.6H1.28a12 12 0 0 0 0 10.8l4-3.11Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.28 6.6l4 3.11C6.22 6.88 8.87 4.77 12 4.77Z" />
    </svg>
  );
}

function faceSay(key: string) {
  window.dispatchEvent(new CustomEvent("tvora:face", { detail: { say: key } }));
}
function faceMood(mood: string, dur?: number) {
  window.dispatchEvent(new CustomEvent("tvora:face", { detail: { mood, dur } }));
}

// ─── confetti burst (DOM pieces, self-cleaning) ───────────────────────────────
function Confetti({ show }: { show: boolean }) {
  const colors = ["#d8c9a3", "#9fb7cb", "#e5484d", "#7fb09e", "#ffffff", "#ffcf8f"];
  if (!show) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden" aria-hidden data-testid="gate-confetti">
      {Array.from({ length: 30 }).map((_, i) => {
        const angle = (i / 30) * Math.PI * 2 + Math.random() * 0.5;
        const dist = 130 + Math.random() * 210;
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-[34%] block rounded-[2px]"
            style={{ width: 7 + Math.random() * 5, height: 9 + Math.random() * 6, background: colors[i % colors.length] }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
            animate={{
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist * 0.8 + 140,
              opacity: 0,
              rotate: (Math.random() - 0.5) * 720,
              scale: 0.7,
            }}
            transition={{ duration: 1.25 + Math.random() * 0.6, ease: [0.15, 0.85, 0.35, 1] }}
          />
        );
      })}
    </div>
  );
}

// ─── the gate ─────────────────────────────────────────────────────────────────
export function LoginGate({ onEnter }: { onEnter: (user: SessionUser | null) => void }) {
  const { t, lang } = useT();
  const allowed = useMotionAllowed();
  const setLang = useAppStore((s) => s.setLang);
  const setListIds = useAppStore((s) => s.setListIds);
  const shake = useAnimationControls();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [sound, setSound] = useState(true);
  const enteredRef = useRef(false);

  const field =
    "tv-focusable h-12 w-full rounded-lg border border-white/12 bg-[#111114] px-4 text-[15px] text-white outline-none transition placeholder:text-white/25 focus:border-white/40 focus:bg-[#131318]";

  const fail = (sayKey: string, msg: string) => {
    setError(msg);
    sfx.err();
    faceMood("cry", 2600);
    faceSay(sayKey);
    if (allowed) void shake.start({ x: [0, -7, 7, -4, 4, -2, 2, 0], transition: { duration: 0.42, ease: "easeInOut" } });
  };

  const enter = useCallback(
    (user: SessionUser | null) => {
      if (enteredRef.current) return;
      enteredRef.current = true;
      onEnter(user);
    },
    [onEnter],
  );

  const celebrateAndEnter = useCallback(
    (user: SessionUser | null, named?: string) => {
      setCelebrate(true);
      sfx.chime();
      faceMood("laugh", 3600);
      faceSay("success");
      toast.success(`${t("gate.welcomeNamed")}${named ? ` ${named}` : ""} 🎉`);
      // sync my-list like auth-view does (session cookie is already set by the API)
      if (user) {
        api
          .listGet()
          .then((list) => {
            const merged = Array.from(new Set([...list.items.map((i) => i.id), ...useAppStore.getState().listIds]));
            setListIds(merged);
          })
          .catch(() => {});
      }
      // let the visitor enjoy the celebration BEFORE handing over to the app
      window.setTimeout(() => enter(user), 1500);
    },
    [enter, setListIds, t],
  );

  // ── step 1: email ────────────────────────────────────────────────────────────
  const submitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!EMAIL_RE.test(email.trim())) {
      fail("badEmail", t("auth.invalidEmail"));
      return;
    }
    faceMood("happy", 1600);
    setStep("password");
  };

  // ── step 2: sign in ─────────────────────────────────────────────────────────
  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!password) {
      fail("wrong", t("auth.required"));
      return;
    }
    setBusy(true);
    faceMood("surprised", 1200);
    try {
      const res = await api.login(email.trim(), password);
      celebrateAndEnter(res.user, res.user.name || undefined);
    } catch {
      fail("wrong", t("auth.invalid"));
    } finally {
      setBusy(false);
    }
  };

  // ── step 2b: register ───────────────────────────────────────────────────────
  const submitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      fail("weak", t("auth.weakPassword"));
      return;
    }
    if (confirm !== password) {
      fail("mismatch", t("auth.passwordMismatch"));
      return;
    }
    setBusy(true);
    faceMood("surprised", 1200);
    try {
      const res = await api.register(email.trim(), password, name.trim() || email.split("@")[0]);
      celebrateAndEnter(res.user, res.user.name || undefined);
    } catch (err) {
      const code = (err as Error).message;
      if (code === "email_taken") {
        fail("taken", t("auth.emailTaken"));
        setStep("password");
      } else if (code === "weak_password") fail("weak", t("auth.weakPassword"));
      else fail("wrong", t("auth.invalid"));
    } finally {
      setBusy(false);
    }
  };

  const guest = () => {
    faceSay("guest");
    faceMood("happy", 2000);
    window.setTimeout(() => enter(null), 700);
  };

  const social = () => {
    faceSay("soon");
    faceMood("surprised", 1300);
    toast.info(t("gate.soon"));
  };

  const fillDemo = (em: string, pw: string) => {
    setEmail(em);
    setPassword(pw);
    setError(null);
    setStep("password");
    faceSay("demo");
    faceMood("happy", 1800);
  };

  useEffect(() => {
    setSound(soundEnabled());
  }, []);

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    setSoundEnabled(next);
    if (next) {
      sfx.chime();
      faceMood("happy", 1600);
      toast.success(t("gate.sound.on"));
    } else {
      toast.info(t("gate.sound.off"));
    }
  };

  const stepSlide = {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const },
  };

  return (
    <div className="relative min-h-full overflow-y-auto bg-[#070708] text-white" data-testid="login-gate">
      {/* ambient cinema stack */}
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        <AuroraBackdrop />
        <AmbientDust maxParticles={50} />
        <div className="absolute inset-0 tv-vignette" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#070708] to-transparent" />
      </div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-4 pb-10 pt-12 sm:px-6 lg:grid-cols-2 lg:gap-6 lg:px-10 lg:py-8">
        {/* language toggle — top start corner */}
        <button
          type="button"
          onClick={() => setLang(lang === "ar" ? "en" : "ar")}
          data-testid="gate-lang"
          aria-label={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"}
          className="tv-focusable absolute end-5 top-5 z-20 flex h-9 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.03] px-3.5 text-xs font-bold text-white/60 transition hover:border-white/35 hover:text-white sm:end-8 sm:top-7"
        >
          <Languages className="h-3.5 w-3.5" aria-hidden />
          {lang === "ar" ? "EN" : "عربي"}
        </button>
        {/* sound toggle — next to the language toggle */}
        <button
          type="button"
          onClick={toggleSound}
          data-testid="gate-sound"
          aria-pressed={sound}
          aria-label={sound ? t("gate.sound.offAria") : t("gate.sound.onAria")}
          title={sound ? t("gate.sound.offAria") : t("gate.sound.onAria")}
          className="tv-focusable absolute end-[5.5rem] top-5 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] text-white/60 transition hover:border-white/35 hover:text-white sm:end-[7.5rem] sm:top-7"
        >
          {sound ? <Volume2 className="h-4 w-4" aria-hidden /> : <VolumeX className="h-4 w-4" aria-hidden />}
        </button>
        {/* ── face + wordmark panel (left in RTL — mirrors like X) ─────────── */}
        <section className="order-1 flex flex-col items-center justify-center text-center lg:order-2 lg:min-h-[640px]" aria-label="TVORA">
          <Confetti show={celebrate} />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <FaceCharacter size={300} className="max-sm:!h-[230px] max-sm:!w-[230px]" />
          </motion.div>

          {/* wordmark — sits UNDER the character as requested */}
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="mt-2"
          >
            <InteractiveWordmark />
            {lang === "ar" && <p className="mt-1 text-lg font-bold text-white/85">{t("brand")}</p>}
            <div className="mx-auto mt-4 h-px w-28 bg-gradient-to-r from-transparent via-[#d8c9a3]/60 to-transparent" />
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.32em] text-white/40">{t("gate.studio")}</p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {[t("gate.chips.films"), t("gate.chips.series"), t("gate.chips.live")].map((chip) => (
                <span key={chip} className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-semibold text-white/60">
                  {chip}
                </span>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ── form panel ───────────────────────────────────────────────────── */}
        <section className="order-2 lg:order-1 lg:min-h-[640px]">
          <motion.div variants={formParent} initial="hidden" animate="show" className="mx-auto flex w-full max-w-md flex-col justify-center py-2">
            <motion.h2 variants={formItem} className="text-4xl font-extrabold tracking-tight sm:text-[44px] sm:leading-[1.15]" data-testid="gate-headline">
              {t("gate.happening")}
            </motion.h2>
            <motion.p variants={formItem} className="mt-3 text-[15px] leading-relaxed text-white/50">
              {t("gate.joinSub")}
            </motion.p>

            {/* social buttons */}
            <motion.div variants={formItem} className="mt-8 space-y-3">
              {[
                { icon: <Smartphone className="h-[18px] w-[18px]" aria-hidden />, label: t("gate.phone"), test: "gate-phone" },
                { icon: <GoogleG />, label: t("gate.google"), test: "gate-google" },
                { icon: <Apple className="h-[19px] w-[19px]" aria-hidden />, label: t("gate.apple"), test: "gate-apple" },
              ].map((b) => (
                <button
                  key={b.test}
                  type="button"
                  onClick={social}
                  data-testid={b.test}
                  className="tv-btn-sheen tv-focusable flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-[#e9eef4] text-[15px] font-extrabold text-black transition hover:bg-white active:scale-[0.99]"
                >
                  {b.icon}
                  {b.label}
                </button>
              ))}
            </motion.div>

            {/* divider */}
            <motion.div variants={formItem} className="my-6 flex items-center gap-4" aria-hidden>
              <span className="h-px flex-1 bg-white/10" />
              <span className="text-xs font-semibold text-white/40">{t("gate.or")}</span>
              <span className="h-px flex-1 bg-white/10" />
            </motion.div>

            {/* steps + error (shake wrapper for failed attempts) */}
            <motion.div variants={formItem}>
             <motion.div animate={shake}>
              <AnimatePresence mode="wait">
                {step === "email" && (
                  <motion.form key="step-email" {...stepSlide} onSubmit={submitEmail} className="space-y-4" noValidate>
                    <div className="relative">
                      <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => faceSay("email")}
                        type="email"
                        dir="ltr"
                        placeholder={t("gate.emailPlaceholder")}
                        aria-label={t("auth.email")}
                        className={cn(field, "text-start")}
                        autoComplete="email"
                        data-testid="gate-email"
                      />
                    </div>
                    <button
                      type="submit"
                      className="tv-btn-sheen tv-focusable flex h-12 w-full items-center justify-center rounded-full bg-white text-[15px] font-extrabold text-black transition hover:bg-[#e8eef4] active:scale-[0.99]"
                      data-testid="gate-next"
                    >
                      {t("gate.next")}
                    </button>
                  </motion.form>
                )}

                {step === "password" && (
                  <motion.form key="step-password" {...stepSlide} onSubmit={submitLogin} className="space-y-4" noValidate>
                    <div className="flex items-center justify-between text-xs">
                      <span dir="ltr" className="truncate font-semibold text-white/70">{email}</span>
                      <button
                        type="button"
                        onClick={() => { setStep("email"); setError(null); }}
                        className="tv-focusable shrink-0 font-bold text-[#9fb7cb] transition hover:text-white"
                        data-testid="gate-back-email"
                      >
                        {t("gate.backToStart")}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => faceSay("password")}
                        type={showPw ? "text" : "password"}
                        dir="ltr"
                        placeholder={t("auth.password")}
                        aria-label={t("auth.password")}
                        className={cn(field, "pe-12 text-start")}
                        autoComplete="current-password"
                        data-testid="gate-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        aria-label={showPw ? t("auth.hidePassword") : t("auth.showPassword")}
                        className="tv-focusable absolute end-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-white/45 transition hover:text-white"
                      >
                        {showPw ? <EyeOff className="h-4.5 w-4.5" aria-hidden /> : <Eye className="h-4.5 w-4.5" aria-hidden />}
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={busy}
                      className="tv-btn-sheen tv-focusable flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-[15px] font-extrabold text-black transition hover:bg-[#e8eef4] active:scale-[0.99] disabled:opacity-60"
                      data-testid="gate-signin"
                    >
                      {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                      {t("gate.signIn")}
                    </button>
                    <div className="flex items-center justify-between text-xs">
                      <button type="button" onClick={() => { setStep("register"); setError(null); faceMood("happy", 1600); }} className="tv-focusable font-bold text-[#9fb7cb] transition hover:text-white" data-testid="gate-to-register">
                        {t("auth.register")}
                      </button>
                      <span className="text-white/30" dir="ltr">{t("auth.demoCreds")}</span>
                    </div>
                  </motion.form>
                )}

                {step === "register" && (
                  <motion.form key="step-register" {...stepSlide} onSubmit={submitRegister} className="space-y-4" noValidate>
                    <p className="text-sm font-bold text-[#d8c9a3]">{t("gate.createTitle")}</p>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onFocus={() => faceSay("name")}
                      placeholder={t("auth.nameOptional")}
                      aria-label={t("auth.nameOptional")}
                      className={field}
                      autoComplete="name"
                      data-testid="gate-name"
                    />
                    <div className="relative">
                      <input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => faceSay("password")}
                        type={showPw ? "text" : "password"}
                        dir="ltr"
                        placeholder={t("auth.password")}
                        aria-label={t("auth.password")}
                        className={cn(field, "pe-12 text-start")}
                        autoComplete="new-password"
                        data-testid="gate-reg-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        aria-label={showPw ? t("auth.hidePassword") : t("auth.showPassword")}
                        className="tv-focusable absolute end-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-white/45 transition hover:text-white"
                      >
                        {showPw ? <EyeOff className="h-4.5 w-4.5" aria-hidden /> : <Eye className="h-4.5 w-4.5" aria-hidden />}
                      </button>
                    </div>
                    <input
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      type="password"
                      dir="ltr"
                      placeholder={t("auth.confirmPassword")}
                      aria-label={t("auth.confirmPassword")}
                      className={cn(field, "text-start")}
                      autoComplete="new-password"
                      data-testid="gate-reg-confirm"
                    />
                    <button
                      type="submit"
                      disabled={busy}
                      className="tv-btn-sheen tv-focusable flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-[15px] font-extrabold text-black transition hover:bg-[#e8eef4] active:scale-[0.99] disabled:opacity-60"
                      data-testid="gate-register"
                    >
                      {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                      {t("auth.register")}
                    </button>
                    <button type="button" onClick={() => { setStep("password"); setError(null); }} className="tv-focusable text-xs font-bold text-white/45 transition hover:text-white" data-testid="gate-back-login">
                      {t("auth.backToSignIn")}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* error */}
              <AnimatePresence>
                {error && (
                  <motion.p
                    key="gate-error"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    role="alert"
                    data-testid="gate-error"
                    className="mt-4 rounded-md border border-[#e5484d]/30 bg-[#e5484d]/10 px-3.5 py-2.5 text-xs font-semibold text-[#ff8a8e]"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
             </motion.div>
            </motion.div>

            {/* demo quick-fill */}
            <motion.div variants={formItem} className="mt-7 grid grid-cols-2 gap-2.5" dir={lang === "ar" ? "rtl" : "ltr"}>
              <button
                type="button"
                onClick={() => fillDemo("demo@tvora.tv", "demo1234")}
                data-testid="gate-demo-fill"
                className="tv-focusable rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 text-start transition hover:border-white/30"
              >
                <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">{t("auth.demoTitle")}</span>
                <span dir="ltr" className="mt-1 block truncate font-mono text-[11px] text-white/60">demo@tvora.tv</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo("admin@tvora.tv", "tvora-admin-2025")}
                data-testid="gate-admin-fill"
                className="tv-focusable rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 text-start transition hover:border-white/30"
              >
                <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">{t("nav.admin")}</span>
                <span dir="ltr" className="mt-1 block truncate font-mono text-[11px] text-white/60">admin@tvora.tv</span>
              </button>
            </motion.div>

            {/* guest + terms */}
            <motion.div variants={formItem} className="mt-7 text-center">
              <button
                type="button"
                onClick={guest}
                data-testid="gate-guest"
                className="tv-focusable text-sm font-bold text-white/50 underline decoration-white/20 underline-offset-4 transition hover:text-white"
              >
                {t("gate.guest")}
              </button>
              <p className="mx-auto mt-5 max-w-sm text-[11px] leading-relaxed text-white/30">{t("gate.terms")}</p>
            </motion.div>
          </motion.div>
        </section>
      </div>
    </div>
  );
}

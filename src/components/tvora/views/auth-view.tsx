"use client";
// AUTH — premium split layout: cinematic art panel (slow ken-burns) + focused form column.
// Login / register / forgot with inline validation, API error mapping,
// password strength meter, demo-credentials fill, list sync on success.
import { useState } from "react";
import { motion, useAnimationControls, type Variants } from "framer-motion";
import { Eye, EyeOff, Loader2, MailCheck, Quote } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAppStore, type ViewName } from "@/lib/store";
import { useT, Reveal } from "../shared";
import { useMotionAllowed } from "../motion-fx";
import { TvoraMark } from "../logo";
import { backdropFor } from "@/lib/artwork";
import { SmartImage } from "../smart-image";
import { cn } from "@/lib/utils";

// 5-c — staggered field entrance (transform/opacity only)
const formParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};
const formItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

type Mode = "login" | "register" | "forgot";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RETURN_VIEWS: ViewName[] = ["home", "movies", "series", "channels", "mylist", "continue", "profile", "pricing"];

export function AuthView({ mode }: { mode: Mode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-3 pb-16 pt-24 sm:px-4 md:px-8 md:pt-28" data-testid="auth-view">
      <Reveal className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0e] shadow-[0_50px_140px_-40px_rgba(0,0,0,1)]">
        <div className="grid lg:grid-cols-2">
          <ArtPanel />
          <AuthForm key={mode} mode={mode} />
        </div>
      </Reveal>
    </div>
  );
}

// ─── Cinematic art panel (desktop) ────────────────────────────────────────────

function ArtPanel() {
  const { t, lang } = useT();
  const allowed = useMotionAllowed();
  const fallback = backdropFor("tvora-auth-art", "TVORA", "CINEMA · SERIES · FOOTBALL");
  return (
    <div className="relative hidden min-h-[660px] lg:block" aria-hidden>
      {/* Ken-burns — 12s alternate drift, transform only, reduced-motion safe */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute inset-0 will-change-transform"
          initial={false}
          animate={allowed ? { scale: [1, 1.09], x: ["0%", "-2%"], y: ["0%", "1.5%"] } : { scale: 1 }}
          transition={{ duration: 12, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        >
          <SmartImage src="/images/hero-sands.jpg" fallback={fallback} alt="" className="absolute inset-0 h-full w-full object-cover" />
        </motion.div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#070708] via-[#070708]/45 to-[#070708]/20" />
      <div className="absolute inset-0 tv-vignette" />
      <div className="relative flex h-full min-h-[660px] flex-col justify-between p-10 xl:p-12">
        <div className="flex items-center gap-3">
          <TvoraMark size={46} />
          <span className="tv-metal-text text-2xl font-extrabold tracking-[0.24em]" style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}>
            TVORA
          </span>
        </div>
        <div className="max-w-sm space-y-5">
          <Quote className="h-6 w-6 text-[#d8c9a3]/70" aria-hidden />
          <p className="text-lg font-semibold leading-relaxed text-white/90">{t("auth.artQuote")}</p>
          <p className="text-sm text-white/50">{t("tagline")}</p>
          <div className="h-px w-24 bg-gradient-to-r from-[#d8c9a3]/60 to-transparent" />
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/35">
            {lang === "ar" ? "دار العرض الرقمية" : "The digital screening room"}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Form column (keyed by mode → fresh state per mode) ──────────────────────

function AuthForm({ mode }: { mode: Mode }) {
  const { t, lang } = useT();
  const navigate = useAppStore((s) => s.navigate);
  const setUser = useAppStore((s) => s.setUser);
  const setListIds = useAppStore((s) => s.setListIds);
  const allowed = useMotionAllowed();
  const shake = useAnimationControls();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);

  const field =
    "tv-focusable h-11 w-full rounded-md border border-white/12 bg-[#121216] px-3.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/35 aria-[invalid=true]:border-[#e5484d]/60";

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!email.trim()) errs.email = t("auth.required");
    else if (!EMAIL_RE.test(email.trim())) errs.email = t("auth.invalidEmail");
    if (mode !== "forgot") {
      if (!password) errs.password = t("auth.required");
      else if (mode === "register" && password.length < 8) errs.password = t("auth.weakPassword");
      if (mode === "register" && confirm !== password) errs.confirm = t("auth.passwordMismatch");
    }
    return errs;
  };

  const syncList = async () => {
    try {
      const list = await api.listGet();
      const merged = Array.from(new Set([...list.items.map((i) => i.id), ...useAppStore.getState().listIds]));
      setListIds(merged);
    } catch {
      /* keep local list */
    }
  };

  const leave = () => {
    let target: ViewName = "home";
    try {
      const raw = sessionStorage.getItem("tvora.returnView");
      sessionStorage.removeItem("tvora.returnView");
      if (raw && RETURN_VIEWS.includes(raw as ViewName)) target = raw as ViewName;
    } catch {
      /* no session storage */
    }
    navigate(target);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setBusy(true);
    try {
      if (mode === "login") {
        const res = await api.login(email.trim(), password);
        setUser(res.user);
        toast.success(t("auth.welcome"));
        await syncList();
        leave();
      } else if (mode === "register") {
        const res = await api.register(email.trim(), password, name.trim() || email.split("@")[0]);
        setUser(res.user);
        toast.success(t("auth.welcome"));
        await syncList();
        leave();
      } else {
        await api.forgot(email.trim());
        setSent(true);
      }
    } catch (err) {
      const code = (err as Error).message;
      if (code === "email_taken") setFormError(t("auth.emailTaken"));
      else if (code === "weak_password") setFieldErrors({ password: t("auth.weakPassword") });
      else if (code === "invalid_email") setFieldErrors({ email: t("auth.invalidEmail") });
      else setFormError(t("auth.invalid"));
      // 5-c — horizontal shake on the error card (~0.4s), skipped under reduced motion
      if (allowed) {
        void shake.start({ x: [0, -6, 6, -4, 4, -2, 2, 0], transition: { duration: 0.42, ease: "easeInOut" } });
      }
    } finally {
      setBusy(false);
    }
  };

  const fill = (em: string, pw: string) => {
    setEmail(em);
    setPassword(pw);
    setFieldErrors({});
    setFormError(null);
  };

  const strength = mode === "register" ? pwScore(password) : 0;
  const strengthMeta: Array<{ label: string; color: string }> = [
    { label: t("auth.pwWeak"), color: "#e5484d" },
    { label: t("auth.pwGood"), color: "#d8c9a3" },
    { label: t("auth.pwStrong"), color: "#7fb09e" },
  ];

  const title = mode === "login" ? t("auth.signInTitle") : mode === "register" ? t("auth.registerTitle") : t("auth.forgotTitle");
  const sub = mode === "login" ? t("auth.signInSub") : mode === "register" ? t("auth.registerSub") : t("auth.forgotSub");

  return (
    <motion.div
      variants={formParent}
      initial="hidden"
      animate="show"
      className="flex flex-col justify-center px-5 py-10 sm:px-10 lg:px-14 lg:py-14"
    >
      {/* Mobile brand row */}
      <motion.div variants={formItem} className="mb-8 flex items-center gap-2.5 lg:hidden">
        <TvoraMark size={28} />
        <span className="tv-metal-text font-extrabold tracking-[0.22em]" style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif", fontSize: 18 }}>
          TVORA
        </span>
      </motion.div>

      <motion.h1 variants={formItem} className="text-2xl font-extrabold tracking-tight text-white md:text-[28px]">{title}</motion.h1>
      <motion.p variants={formItem} className="mt-2 text-sm text-white/50">{sub}</motion.p>

      {sent ? (
        <motion.div variants={formItem} className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#9fb7cb]/30 bg-[#9fb7cb]/10">
            <MailCheck className="h-5 w-5 text-[#9fb7cb]" aria-hidden />
          </span>
          <p className="mt-4 text-sm leading-relaxed text-white/70">{t("auth.resetSent")}</p>
          <button
            type="button"
            onClick={() => navigate({ name: "auth", mode: "login" })}
            className="tv-focusable mt-5 w-full rounded-md bg-white px-5 py-2.5 text-sm font-extrabold text-black transition hover:bg-[#e8eef4]"
          >
            {t("auth.backToSignIn")}
          </button>
        </motion.div>
      ) : (
        <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
          {mode === "register" && (
            <Field label={t("auth.nameOptional")} error={fieldErrors.name}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("auth.name")}
                aria-label={t("auth.nameOptional")}
                className={field}
                autoComplete="name"
              />
            </Field>
          )}

          <Field label={t("auth.email")} error={fieldErrors.email}>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              dir="ltr"
              required
              placeholder="you@example.com"
              aria-label={t("auth.email")}
              aria-invalid={Boolean(fieldErrors.email)}
              className={field}
              autoComplete="email"
            />
          </Field>

          {mode !== "forgot" && (
            <Field label={t("auth.password")} error={fieldErrors.password}>
              <div className="relative">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPw ? "text" : "password"}
                  dir="ltr"
                  required
                  minLength={mode === "register" ? 8 : 1}
                  placeholder="••••••••"
                  aria-label={t("auth.password")}
                  aria-invalid={Boolean(fieldErrors.password)}
                  className={cn(field, "pe-11")}
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? t("auth.hidePassword") : t("auth.showPassword")}
                  aria-pressed={showPw}
                  className="tv-focusable absolute end-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-white/45 transition hover:text-white"
                >
                  {showPw ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                </button>
              </div>
              {mode === "register" && password.length > 0 && (
                <div className="mt-2" aria-label={t("auth.pwStrength")}>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3].map((seg) => (
                      <span
                        key={seg}
                        className="h-1 flex-1 rounded-full transition-colors duration-300"
                        style={{ background: seg <= strength ? strengthMeta[strength - 1].color : "rgba(255,255,255,0.09)" }}
                        aria-hidden
                      />
                    ))}
                    <span className="ms-1 text-[10px] font-bold" style={{ color: strength > 0 ? strengthMeta[strength - 1].color : undefined }}>
                      {strength > 0 ? strengthMeta[strength - 1].label : ""}
                    </span>
                  </div>
                </div>
              )}
            </Field>
          )}

          {mode === "register" && (
            <Field label={t("auth.confirmPassword")} error={fieldErrors.confirm}>
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                type="password"
                dir="ltr"
                required
                placeholder="••••••••"
                aria-label={t("auth.confirmPassword")}
                aria-invalid={Boolean(fieldErrors.confirm)}
                className={field}
                autoComplete="new-password"
              />
            </Field>
          )}

          {formError && (
            <motion.p
              role="alert"
              animate={shake}
              className="rounded-md border border-[#e5484d]/30 bg-[#e5484d]/10 px-3.5 py-2.5 text-xs font-semibold text-[#ff8a8e]"
            >
              {formError}
            </motion.p>
          )}

          <motion.button
            type="submit"
            disabled={busy}
            data-testid="auth-submit"
            variants={formItem}
            whileTap={allowed ? { scale: 0.985 } : undefined}
            className="tv-btn-sheen tv-focusable flex h-11 w-full items-center justify-center gap-2 rounded-md bg-white text-sm font-extrabold text-black transition hover:bg-[#e8eef4] disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {mode === "login" ? t("auth.signIn") : mode === "register" ? t("auth.register") : t("auth.sendReset")}
          </motion.button>
        </form>
      )}

      {/* Links */}
      {!sent && (
        <motion.div variants={formItem} className="mt-5 space-y-2.5 text-center text-sm">
          {mode === "login" && (
            <>
              <p className="text-white/50">
                {t("auth.noAccount")}{" "}
                <button
                  type="button"
                  onClick={() => navigate({ name: "auth", mode: "register" })}
                  className="tv-focusable font-bold text-[#9fb7cb] transition hover:text-white hover:underline"
                >
                  {t("auth.register")}
                </button>
              </p>
              <button
                type="button"
                onClick={() => navigate({ name: "auth", mode: "forgot" })}
                className="tv-focusable text-xs text-white/40 transition hover:text-white/75"
              >
                {t("auth.forgot")}
              </button>
            </>
          )}
          {mode === "register" && (
            <p className="text-white/50">
              {t("auth.haveAccount")}{" "}
              <button
                type="button"
                onClick={() => navigate({ name: "auth", mode: "login" })}
                className="tv-focusable font-bold text-[#9fb7cb] transition hover:text-white hover:underline"
              >
                {t("auth.signIn")}
              </button>
            </p>
          )}
          {mode === "forgot" && (
            <button
              type="button"
              onClick={() => navigate({ name: "auth", mode: "login" })}
              className="tv-focusable text-xs text-white/40 transition hover:text-white/75"
            >
              {t("auth.backToSignIn")}
            </button>
          )}
        </motion.div>
      )}

    </motion.div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <motion.label variants={formItem} className="block">
      <span className="mb-1.5 block text-xs font-semibold text-white/55">{label}</span>
      <span className="relative block">{children}</span>
      {error && (
        <span role="alert" className="mt-1.5 block text-[11px] font-semibold text-[#ff8a8e]">
          {error}
        </span>
      )}
    </motion.label>
  );
}

function pwScore(pw: string): 0 | 1 | 2 | 3 {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12 || (/\d/.test(pw) && /[a-zA-Z]/.test(pw) && /[^a-zA-Z0-9]/.test(pw))) score += 1;
  if (pw.length >= 10 && /\d/.test(pw) && /[a-zA-Z]/.test(pw)) score += 1;
  return Math.min(3, score) as 0 | 1 | 2 | 3;
}

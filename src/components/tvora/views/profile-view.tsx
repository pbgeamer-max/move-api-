"use client";
// PROFILE — account hub: guest CTA, identity, plan, activity, language, admin link.
import { useEffect, useRef, useState } from "react";
import { LayoutDashboard, Languages, LogOut, UserRound, BarChart3, Bookmark, MonitorPlay, Crown } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useT, SectionHeader, Reveal } from "../shared";
import { CountUp, RevealScale } from "../motion-fx";
import { TvoraMark } from "../logo";
import { cn } from "@/lib/utils";

const card = "rounded-xl border border-white/8 bg-white/[0.015] p-5";
const cardTitle = "flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/40";

export function ProfileView() {
  const { t, lang } = useT();
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const navigate = useAppStore((s) => s.navigate);
  const listIds = useAppStore((s) => s.listIds);
  const setListIds = useAppStore((s) => s.setListIds);
  const setLang = useAppStore((s) => s.setLang);
  const nameRef = useRef("");
  const [progressCount, setProgressCount] = useState<number | null>(null);

  useEffect(() => {
    document.title = `${t("nav.profile")} | TVORA`;
  }, [t]);

  useEffect(() => {
    api
      .progressGet()
      .then((r) => setProgressCount(r.items.length))
      .catch(() => setProgressCount(0));
  }, []);

  // ── Guest ───────────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 pb-16 pt-24 md:pt-28" data-testid="profile-view">
        <Reveal className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-[#121216]">
            <UserRound className="h-6 w-6 text-white/40" aria-hidden />
          </span>
          <TvoraMark size={30} />
          <h1 className="text-xl font-extrabold text-white">{t("profile.guestTitle")}</h1>
          <p className="max-w-xs text-sm text-white/50">{t("profile.signInPrompt")}</p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              data-testid="profile-signin"
              onClick={() => navigate({ name: "auth", mode: "login" })}
              className="tv-focusable rounded-md bg-white px-6 py-2.5 text-sm font-extrabold text-black transition hover:bg-[#e8eef4]"
            >
              {t("nav.signIn")}
            </button>
            <button
              type="button"
              onClick={() => navigate({ name: "auth", mode: "register" })}
              className="tv-focusable rounded-md border border-white/15 px-6 py-2.5 text-sm font-bold text-white/80 transition hover:border-white/40 hover:text-white"
            >
              {t("auth.register")}
            </button>
          </div>
          <p className="mt-3 max-w-xs text-[11px] leading-relaxed text-white/35">{t("auth.guestNote")}</p>
        </Reveal>
      </div>
    );
  }

  // ── Signed in ───────────────────────────────────────────────────────────────
  const save = async () => {
    try {
      const res = await api.updateProfile({ name: nameRef.current });
      setUser(res.user);
      toast.success(t("profile.saved"));
    } catch {
      toast.error(t("misc.error"));
    }
  };

  const switchLang = (l: "ar" | "en") => {
    if (l === lang) return;
    setLang(l);
    void api.updateProfile({ preferredLanguage: l }).catch(() => {});
    toast.success(t("profile.saved"), { duration: 1600 });
  };

  const signOut = async () => {
    await api.logout().catch(() => {});
    window.localStorage.removeItem("tvora.guest"); // returning visitors see the login gate again
    setUser(null);
    setListIds([]);
    toast(t("auth.bye"));
    navigate("home");
  };

  const initial = (user.name || user.email).slice(0, 1).toUpperCase();

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-24 md:pt-28" data-testid="profile-view">
      <SectionHeader kicker={t("nav.profile")} title={t("profile.title")} sub={user.email} />

      {/* Identity card — RevealScale cascade */}
      <RevealScale className={cn(card, "flex items-center gap-4")}>
        <span className="relative flex h-14 w-14 shrink-0 items-center justify-center" aria-hidden>
          {/* Breathing halo (opacity-only CSS animation) */}
          <span className="tv-glow-breathe absolute -inset-1.5 rounded-full bg-[#9fb7cb]/25 blur-md" />
          <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-b from-[#2a2d33] to-[#17191d] text-lg font-extrabold text-[#cfe0ee] shadow-inner">
            {initial}
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-extrabold text-white">{user.name || user.email.split("@")[0]}</p>
          <p className="truncate text-sm text-white/45" dir="ltr">
            {user.email}
          </p>
        </div>
        <span className="hidden shrink-0 items-center gap-1 rounded-full border border-[#d8c9a3]/35 bg-[#d8c9a3]/10 px-3 py-1 text-[11px] font-bold capitalize text-[#d8c9a3] sm:inline-flex">
          <Crown className="h-3 w-3" aria-hidden />
          {user.plan}
        </span>
      </RevealScale>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {/* Plan */}
        <RevealScale className={card} delay={0.05}>
          <p className={cardTitle}>
            <Crown className="h-3.5 w-3.5" aria-hidden /> {t("profile.plan")}
          </p>
          <p className="mt-2 text-2xl font-extrabold capitalize text-[#d8c9a3]">{user.plan}</p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-white/35">{t("profile.demoDataNote")}</p>
          <button
            type="button"
            onClick={() => navigate("pricing")}
            className="tv-focusable mt-3 rounded-md border border-white/12 px-3 py-1.5 text-xs font-bold text-white/70 transition hover:border-white/40 hover:text-white"
          >
            {t("pricing.title")}
          </button>
        </RevealScale>

        {/* Activity — real counts animated with CountUp */}
        <RevealScale className={card} delay={0.1}>
          <p className={cardTitle}>
            <BarChart3 className="h-3.5 w-3.5" aria-hidden /> {t("profile.stats")}
          </p>
          <div className="mt-3 space-y-2.5">
            <button
              type="button"
              onClick={() => navigate("mylist")}
              className="tv-focusable flex w-full items-center justify-between gap-2 rounded-md bg-black/25 px-3 py-2 text-start transition hover:bg-black/40"
            >
              <span className="flex items-center gap-2 text-xs text-white/60">
                <Bookmark className="h-3.5 w-3.5 text-[#9fb7cb]" aria-hidden /> {t("nav.myList")}
              </span>
              <span className="text-sm font-extrabold tabular-nums text-white">
                <CountUp value={listIds.length} duration={1.2} /> <span className="text-[10px] font-medium text-white/40">{t("profile.listCount")}</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => navigate("continue")}
              className="tv-focusable flex w-full items-center justify-between gap-2 rounded-md bg-black/25 px-3 py-2 text-start transition hover:bg-black/40"
            >
              <span className="flex items-center gap-2 text-xs text-white/60">
                <MonitorPlay className="h-3.5 w-3.5 text-[#9fb7cb]" aria-hidden /> {t("nav.continueWatching")}
              </span>
              <span className="text-sm font-extrabold tabular-nums text-white">
                {progressCount != null ? <CountUp value={progressCount} duration={1.2} /> : "—"} <span className="text-[10px] font-medium text-white/40">{t("profile.watchCount")}</span>
              </span>
            </button>
          </div>
        </RevealScale>
      </div>

      {/* Name */}
      <RevealScale className={cn(card, "mt-4")} delay={0.12}>
        <label className={cardTitle} htmlFor="profile-name">
          <UserRound className="h-3.5 w-3.5" aria-hidden /> {t("auth.name")}
        </label>
        <div className="mt-2.5 flex gap-2">
          <input
            id="profile-name"
            key={user.id}
            data-testid="profile-name-input"
            defaultValue={user.name || ""}
            onChange={(e) => (nameRef.current = e.target.value)}
            className="tv-focusable h-10 flex-1 rounded-md border border-white/12 bg-[#121216] px-3.5 text-sm text-white outline-none transition focus:border-white/35"
          />
          <button
            type="button"
            onClick={() => void save()}
            className="tv-focusable h-10 rounded-md bg-white px-5 text-sm font-extrabold text-black transition hover:bg-[#e8eef4]"
          >
            {t("admin.save")}
          </button>
        </div>
      </RevealScale>

      {/* Language */}
      <RevealScale className={cn(card, "mt-4")} delay={0.15}>
        <p className={cardTitle}>
          <Languages className="h-3.5 w-3.5" aria-hidden /> {t("profile.language")}
        </p>
        <div className="mt-3 flex gap-2" role="group" aria-label={t("profile.language")}>
          {(["ar", "en"] as const).map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={lang === l}
              onClick={() => switchLang(l)}
              className={cn(
                "tv-focusable rounded-full px-5 py-2 text-sm font-bold transition",
                lang === l ? "bg-white text-black" : "border border-white/15 text-white/70 hover:border-white/40 hover:text-white"
              )}
            >
              {l === "ar" ? "العربية" : "English"}
            </button>
          ))}
        </div>
      </RevealScale>

      {/* Admin console */}
      {user.role === "admin" && (
        <RevealScale className={cn(card, "mt-4 flex items-center justify-between gap-4 border-[#9fb7cb]/25 bg-[#9fb7cb]/[0.04]")} delay={0.18}>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#9fb7cb]/30 bg-[#9fb7cb]/10">
              <LayoutDashboard className="h-4.5 w-4.5 text-[#9fb7cb]" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-extrabold text-white">{t("nav.admin")}</p>
              <p className="text-xs text-white/45">{t("profile.adminHint")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("admin")}
            className="tv-focusable shrink-0 rounded-md bg-[#9fb7cb] px-4 py-2 text-xs font-extrabold text-[#0b0e12] transition hover:bg-[#cfe0ee]"
          >
            {t("admin.overview")}
          </button>
        </RevealScale>
      )}

      {/* Sign out */}
      <button
        type="button"
        onClick={() => void signOut()}
        data-testid="signout"
        className="tv-focusable mt-6 flex w-full items-center justify-center gap-2 rounded-md border border-[#e5484d]/40 px-5 py-3 text-sm font-bold text-[#ff8a8e] transition hover:bg-[#e5484d]/10"
      >
        <LogOut className="h-4 w-4" aria-hidden /> {t("nav.signOut")}
      </button>
    </div>
  );
}

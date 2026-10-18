"use client";
// STATIC PAGES — Pricing / About / Privacy / Terms. Honest, cinematic, RTL-safe.
import { useEffect } from "react";
import { motion, type Variants } from "framer-motion";
import { Check, Clock, ShieldCheck, Sparkles, Clapperboard, Radio, Languages } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { EASE_OUT_EXPO, viewportOnce } from "@/lib/motion";
import { useT, SectionHeader, Reveal } from "../shared";
import { RevealX, SpotlightCard, TiltCard } from "../motion-fx";
import { TvoraMark } from "../logo";
import { cn } from "@/lib/utils";

// 5-c — staggered feature lists (per plan card)
const featsParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.18 } },
};
const featItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT_EXPO } },
};

// ─── Pricing ──────────────────────────────────────────────────────────────────

export function PricingView() {
  const { t } = useT();
  const user = useAppStore((s) => s.user);
  useEffect(() => {
    document.title = `${t("pricing.title")} | TVORA`;
  }, [t]);

  const plans: Array<{ key: "free" | "premium" | "family"; features: string[]; highlight: boolean }> = [
    { key: "free", features: ["f1", "f2"], highlight: false },
    { key: "premium", features: ["f1", "f2", "f3", "f4"], highlight: true },
    { key: "family", features: ["f1", "f2", "f3", "f4", "f5", "f6"], highlight: false },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-24 md:pt-28" data-testid="pricing-view">
      <SectionHeader kicker={t("footer.pricing")} title={t("pricing.title")} sub={t("pricing.sub")} />

      <div className="grid gap-4 md:grid-cols-3 md:gap-5">
        {plans.map((p, i) => {
          const isCurrent = user?.plan === p.key;

          const body = (
            <>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-extrabold text-white">{t(`pricing.${p.key}`)}</h2>
                {p.highlight ? (
                  <Sparkles className="h-4 w-4 text-[#d8c9a3]" aria-hidden />
                ) : (
                  <span className="h-4 w-4" aria-hidden />
                )}
              </div>

              <p className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold tracking-tight text-white">
                  {p.key === "free" ? "0" : "—"}
                  {p.key === "free" && <span className="text-base font-bold text-white/40">$</span>}
                </span>
                <span className="inline-flex items-center gap-1 rounded-sm border border-white/10 bg-black/30 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/40">
                  <Clock className="h-2.5 w-2.5" aria-hidden /> {t("pricing.pending")}
                </span>
              </p>

              {/* Feature list — staggered entrance */}
              <motion.ul
                className="mt-5 flex-1 space-y-2.5"
                initial="hidden"
                whileInView="show"
                viewport={viewportOnce}
                variants={featsParent}
              >
                {p.features.map((f) => (
                  <motion.li key={f} variants={featItem} className="flex items-start gap-2 text-sm text-white/70">
                    <Check className={cn("mt-0.5 h-4 w-4 shrink-0", p.highlight ? "text-[#d8c9a3]" : "text-[#9fb7cb]")} aria-hidden />
                    {t(`pricing.${f}`)}
                  </motion.li>
                ))}
              </motion.ul>

              <p className="mt-6 rounded-md border border-white/8 bg-black/30 px-3 py-2 text-center text-[11px] text-white/40">
                {t("pricing.pending")}
              </p>
            </>
          );

          return (
            <Reveal key={p.key} delay={i * 0.08} className={cn("relative", p.highlight && "group md:-my-2")}>
              {isCurrent && (
                <span className="absolute -top-2.5 end-4 z-20 inline-flex items-center gap-1 rounded-full bg-[#d8c9a3] px-2.5 py-0.5 text-[10px] font-extrabold text-black shadow-lg">
                  <Check className="h-2.5 w-2.5" aria-hidden /> {t("pricing.current")}
                </span>
              )}
              {p.highlight ? (
                /* Featured (Premium) — panning glow border + mouse spotlight + gentle 3D tilt */
                <TiltCard max={5} className="h-full rounded-xl">
                  <div
                    className="tv-gradient-pan h-full rounded-xl p-px shadow-[0_30px_90px_-40px_rgba(216,201,163,0.35)]"
                    style={{
                      backgroundImage:
                        "linear-gradient(120deg, rgba(216,201,163,0.8), rgba(159,183,203,0.45) 32%, rgba(229,72,77,0.35) 62%, rgba(216,201,163,0.8))",
                    }}
                  >
                    <SpotlightCard className="relative flex h-full flex-col rounded-[11px] bg-[#0c0c0f] p-6">
                      {body}
                    </SpotlightCard>
                  </div>
                </TiltCard>
              ) : (
                /* Non-featured — plain hover lift */
                <div className="flex h-full flex-col rounded-xl border border-white/10 bg-white/[0.015] p-6 transition-[transform,border-color,box-shadow] duration-300 ease-out hover:-translate-y-1.5 hover:border-white/20 hover:shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)]">
                  {body}
                </div>
              )}
            </Reveal>
          );
        })}
      </div>

      <Reveal className="mt-8 flex items-start justify-center gap-2 rounded-xl border border-white/8 bg-white/[0.015] px-5 py-4 text-center">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#7fb09e]" aria-hidden />
        <p className="text-xs leading-relaxed text-white/50">{t("pricing.note")}</p>
      </Reveal>
    </div>
  );
}

// ─── About ────────────────────────────────────────────────────────────────────

export function AboutView() {
  const { t } = useT();
  useEffect(() => {
    document.title = `${t("static.aboutTitle")} | TVORA`;
  }, [t]);

  const values = [
    { icon: Clapperboard, title: t("static.valueCinema"), desc: t("static.valueCinemaD") },
    { icon: Radio, title: t("static.valueLive"), desc: t("static.valueLiveD") },
    { icon: Languages, title: t("static.valueLanguage"), desc: t("static.valueLanguageD") },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-24 md:pt-28" data-testid="about-view">
      <SectionHeader kicker={t("footer.about")} title={t("static.aboutTitle")} />

      <div className="space-y-5 leading-relaxed text-white/70">
        <Reveal>
          <p>{t("static.aboutP1")}</p>
        </Reveal>
        <Reveal delay={0.06}>
          <p>{t("static.aboutP2")}</p>
        </Reveal>
        <Reveal delay={0.12}>
          <p className="flex items-start gap-2 text-sm text-white/50">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#9fb7cb]" aria-hidden /> {t("static.aboutP3")}
          </p>
        </Reveal>
      </div>

      {/* Logo showcase */}
      <Reveal
        delay={0.1}
        className="mt-10 flex flex-col items-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent px-6 py-12 text-center"
      >
        <div className="tv-grain relative rounded-full border border-white/10 bg-[#0b0b0d] p-8 shadow-[0_30px_80px_-30px_rgba(0,0,0,1)]">
          <TvoraMark size={84} />
        </div>
        <span
          className="tv-metal-text text-5xl font-extrabold tracking-[0.3em]"
          style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}
          aria-label="TVORA"
        >
          TVORA
        </span>
        <p className="text-xs text-white/40">{t("static.markCaption")}</p>
      </Reveal>

      {/* Values — directional trio */}
      <h2 className="mb-4 mt-10 text-sm font-bold uppercase tracking-[0.25em] text-white/50">{t("static.valuesTitle")}</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {values.map((v, i) => (
          <RevealX
            key={v.title}
            delay={i * 0.08}
            from={i === 1 ? "end" : "start"}
            className="rounded-xl border border-white/8 bg-white/[0.015] p-5 transition-colors duration-300 hover:border-[#9fb7cb]/30"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#9fb7cb]/25 bg-[#9fb7cb]/10">
              <v.icon className="h-4.5 w-4.5 text-[#9fb7cb]" aria-hidden />
            </span>
            <h3 className="mt-3 text-sm font-extrabold text-white">{v.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-white/45">{v.desc}</p>
          </RevealX>
        ))}
      </div>
    </div>
  );
}

// ─── Legal pages ──────────────────────────────────────────────────────────────

const LAST_UPDATED = "2025-01-15";

function LegalPage({ titleKey, clauses, testid }: { titleKey: string; clauses: string[]; testid: string }) {
  const { t, lang } = useT();
  const title = t(titleKey);
  useEffect(() => {
    document.title = `${title} | TVORA`;
  }, [title]);

  const updated = new Date(LAST_UPDATED).toLocaleDateString(lang === "ar" ? "ar-IQ" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-24 md:pt-28" data-testid={testid}>
      <SectionHeader kicker={t("footer.legal")} title={title} />
      <div className="space-y-5">
        {clauses.map((clause, i) => (
          <Reveal key={clause} delay={i * 0.05} className="flex items-start gap-3">
            <span className="mt-2.5 h-px w-7 shrink-0 bg-gradient-to-r from-[#9fb7cb]/70 to-transparent" aria-hidden />
            <p className="leading-relaxed text-white/70">{t(clause)}</p>
          </Reveal>
        ))}
      </div>
      <Reveal delay={0.2} className="mt-10 border-t border-white/8 pt-4">
        <p className="text-xs text-white/35" suppressHydrationWarning>
          {t("static.lastUpdated")}: {updated}
        </p>
      </Reveal>
    </div>
  );
}

export function PrivacyView() {
  return (
    <LegalPage
      titleKey="static.privacyTitle"
      testid="privacy-view"
      clauses={["static.privacy1", "static.privacy2", "static.privacy3", "static.privacy4"]}
    />
  );
}

export function TermsView() {
  return (
    <LegalPage
      titleKey="static.termsTitle"
      testid="terms-view"
      clauses={["static.terms1", "static.terms2", "static.terms3", "static.terms4"]}
    />
  );
}

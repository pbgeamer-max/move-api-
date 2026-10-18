"use client";
// TVORA footer — sticks to the bottom via mt-auto, pushed naturally on long pages.
// Motion: panning hairline, staggered column reveal, sheen logo, magnetic back-to-top.
import { ArrowUp } from "lucide-react";
import { motion } from "framer-motion";
import { TvoraLogo } from "./logo";
import { Magnetic } from "./motion-fx";
import { useAppStore } from "@/lib/store";
import { makeT } from "@/lib/i18n";
import { DemoTag } from "./shared";

export function Footer() {
  const lang = useAppStore((s) => s.lang);
  const navigate = useAppStore((s) => s.navigate);
  const t = makeT(lang);

  const link = (name: Parameters<typeof navigate>[0], label: string) => (
    <button
      type="button"
      onClick={() => navigate(name)}
      className="tv-focusable group/link relative block w-fit text-start text-[13px] text-white/50 transition-all duration-300 hover:text-white hover:ps-1.5"
    >
      <span
        aria-hidden
        className="absolute bottom-0 start-0 h-px w-0 bg-gradient-to-r from-[#cfe0ee] to-transparent transition-all duration-400 group-hover/link:w-full"
      />
      {label}
    </button>
  );

  const columns = [
    {
      title: t("footer.explore"),
      links: [
        { name: { name: "movies" } as Parameters<typeof navigate>[0], label: t("nav.movies") },
        { name: { name: "series" } as Parameters<typeof navigate>[0], label: t("nav.series") },
        { name: { name: "channels" } as Parameters<typeof navigate>[0], label: t("nav.channels") },
      ],
    },
    {
      title: t("footer.account"),
      links: [
        { name: { name: "mylist" } as Parameters<typeof navigate>[0], label: t("nav.myList") },
        { name: { name: "continue" } as Parameters<typeof navigate>[0], label: t("nav.continueWatching") },
        { name: { name: "auth" } as Parameters<typeof navigate>[0], label: t("nav.signIn") },
        { name: { name: "pricing" } as Parameters<typeof navigate>[0], label: t("footer.pricing") },
      ],
    },
    {
      title: t("footer.legal"),
      links: [
        { name: { name: "about" } as Parameters<typeof navigate>[0], label: t("footer.about") },
        { name: { name: "privacy" } as Parameters<typeof navigate>[0], label: t("footer.privacy") },
        { name: { name: "terms" } as Parameters<typeof navigate>[0], label: t("footer.terms") },
      ],
    },
  ];

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="relative mt-auto overflow-hidden border-t border-white/6 bg-[#08080a]"
      data-testid="tvora-footer"
    >
      {/* Panning hairline */}
      <div
        aria-hidden
        className="tv-gradient-pan absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#9fb7cb]/50 to-transparent"
      />
      {/* Ambient corner glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 start-1/4 h-48 w-96 rounded-full bg-[#9fb7cb]/[0.04] blur-3xl"
      />

      <div className="relative mx-auto max-w-[1600px] px-4 pb-24 pt-12 md:px-8 md:pb-10 lg:px-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="col-span-2 md:col-span-1"
          >
            <TvoraLogo size={26} onClick={() => navigate({ name: "home" })} />
            <p className="mt-3 max-w-60 text-xs leading-relaxed text-white/40">{t("tagline")}</p>
            <p className="mt-4 text-[11px] text-white/30">{t("footer.madeWith")}</p>
          </motion.div>

          {columns.map((col, ci) => (
            <motion.div
              key={col.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.08 * (ci + 1) }}
            >
              <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-white/70">{col.title}</h3>
              <div className="space-y-2.5">
                {col.links.map((l) => (
                  <div key={l.label}>{link(l.name, l.label)}</div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="mt-10 flex flex-col gap-3 border-t border-white/6 pt-5 md:flex-row md:items-center md:justify-between"
        >
          <p className="text-[11px] text-white/35">
            © {new Date().getFullYear()} {t("footer.copyright")}
          </p>
          <div className="flex items-center gap-2">
            <DemoTag />
            <p className="text-[11px] text-white/35">{t("footer.demoNotice")}</p>
          </div>
          <Magnetic strength={0.35}>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              aria-label={t("footer.top")}
              title={t("footer.top")}
              className="tv-focusable tv-btn-sheen flex h-10 w-10 items-center justify-center rounded-full border border-white/12 text-white/60 transition hover:border-[#9fb7cb]/60 hover:text-white hover:shadow-[0_0_24px_-6px_rgba(207,224,238,0.5)]"
            >
              <ArrowUp className="h-4 w-4" aria-hidden />
            </button>
          </Magnetic>
        </motion.div>
      </div>
    </motion.footer>
  );
}

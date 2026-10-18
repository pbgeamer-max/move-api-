"use client";
// TVORA ADMIN — protected admin panel inside the SPA (task 2-d).
// Client UX gate (server routes enforce authz independently): authReady loader,
// sign-in prompt for guests, access-denied for non-admins.
import { useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { ExternalLink, LogIn, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { DemoTag, useT, ViewLoader } from "../shared";
import { TvoraMark } from "../logo";
import { AdminOverview } from "./admin/admin-overview";
import { AdminContent } from "./admin/admin-content";
import { AdminChannels } from "./admin/admin-channels";
import { AdminSettings } from "./admin/admin-settings";

const TABS = ["overview", "content", "channels", "settings"] as const;
type AdminTab = (typeof TABS)[number];

function GateCard({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: typeof LogIn;
  title: string;
  hint: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 pb-16 pt-24 md:pt-28">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
        className="w-full max-w-md rounded-xl border border-white/10 bg-gradient-to-b from-[#141416] to-[#0e0e10] p-8 text-center"
        role="alert"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#e5484d]/25 bg-[#e5484d]/10">
          <Icon className="h-5 w-5 text-[#ff8a8e]" aria-hidden />
        </div>
        <h1 className="text-lg font-bold text-white">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/50">{hint}</p>
        {action && <div className="mt-6">{action}</div>}
      </motion.div>
    </div>
  );
}

export function AdminView({ tab }: { tab?: string }) {
  const { t } = useT();
  const navigate = useAppStore((s) => s.navigate);
  const user = useAppStore((s) => s.user);
  const authReady = useAppStore((s) => s.authReady);

  useEffect(() => {
    document.title = `${t("admin.title")} | TVORA`;
  }, [t]);

  const active: AdminTab = (TABS as readonly string[]).includes(tab ?? "") ? (tab as AdminTab) : "overview";

  const selectTab = useCallback(
    (next: AdminTab) => {
      navigate({ name: "admin", q: `tab=${next}` });
    },
    [navigate]
  );

  const onTablistKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const idx = TABS.indexOf(active);
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (idx + 1) % TABS.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (idx - 1 + TABS.length) % TABS.length;
    if (next >= 0) {
      e.preventDefault();
      const target = TABS[next];
      selectTab(target);
      requestAnimationFrame(() => {
        const el = document.getElementById(`admin-tab-${target}`);
        if (el) el.focus();
      });
    }
  };

  // ── Access gate ─────────────────────────────────────────────────────────────
  if (!authReady) {
    return (
      <div className="px-4 pt-24 md:pt-28">
        <ViewLoader label={t("misc.loading")} />
      </div>
    );
  }

  if (!user) {
    return (
      <GateCard
        icon={LogIn}
        title={t("admin.signInRequired")}
        hint={t("admin.accessDenied")}
        action={
          <Button
            type="button"
            onClick={() => navigate({ name: "auth", mode: "login" })}
            className="bg-[#9fb7cb] font-bold text-[#0a0c10] hover:bg-[#cfe0ee]"
          >
            <LogIn className="h-4 w-4" aria-hidden />
            {t("nav.signIn")}
          </Button>
        }
      />
    );
  }

  if (user.role !== "admin") {
    return <GateCard icon={ShieldAlert} title={t("admin.accessDenied")} hint={t("admin.signInRequired")} />;
  }

  // ── Panel ───────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-24 md:px-8 md:pt-28" data-testid="admin-view">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <TvoraMark size={40} />
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white md:text-2xl">{t("admin.title")}</h1>
            <p className="mt-1 flex items-center gap-2 text-xs text-white/45">
              <DemoTag />
              <span>
                {t("admin.signedInAs")}{" "}
                <span dir="ltr" className="tabular-nums text-white/65">
                  {user.email}
                </span>
              </span>
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("home")}
          className="border-white/15 bg-transparent text-white/80 hover:bg-white/5 hover:text-white"
        >
          <ExternalLink className="h-4 w-4" aria-hidden />
          {t("admin.viewSite")}
        </Button>
      </header>

      {/* Tab bar — hash-synced */}
      <div
        role="tablist"
        aria-label={t("admin.title")}
        onKeyDown={onTablistKeyDown}
        className="mb-8 flex gap-1 overflow-x-auto rounded-xl border border-white/8 bg-white/[0.02] p-1"
      >
        {TABS.map((id) => (
          <button
            key={id}
            id={`admin-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={active === id}
            aria-controls={`admin-panel-${id}`}
            tabIndex={active === id ? 0 : -1}
            onClick={() => selectTab(id)}
            className={cn(
              "tv-focusable flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition",
              active === id
                ? "bg-[#9fb7cb]/15 text-[#cfe0ee] shadow-[inset_0_0_0_1px_rgba(159,183,203,0.28)]"
                : "text-white/55 hover:text-white/85"
            )}
          >
            {t(`admin.${id}`)}
          </button>
        ))}
      </div>

      <motion.div
        key={active}
        id={`admin-panel-${active}`}
        role="tabpanel"
        aria-labelledby={`admin-tab-${active}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
      >
        {active === "overview" && <AdminOverview />}
        {active === "content" && <AdminContent />}
        {active === "channels" && <AdminChannels />}
        {active === "settings" && <AdminSettings />}
      </motion.div>
    </div>
  );
}

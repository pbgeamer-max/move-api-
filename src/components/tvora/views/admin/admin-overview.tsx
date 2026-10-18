"use client";
// ADMIN — Overview tab: real counts, honest provider status, recent activity
// (derived events only — never fabricated analytics).
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, BarChart3, Bookmark, Database, Film, Layers, RefreshCw, Tv, Users } from "lucide-react";
import { api } from "@/lib/api";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { ErrorState, LiveDot, useT } from "../../shared";
import { AdminSkeleton, CountUp, NoteRow, PanelCard, StatusChip } from "./admin-kit";

type OverviewData = Awaited<ReturnType<typeof api.adminOverview>>;

function StatCard({
  icon: Icon,
  label,
  value,
  live,
  index,
}: {
  icon: typeof Film;
  label: string;
  value: number;
  live?: boolean;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE_OUT_EXPO, delay: Math.min(index * 0.04, 0.3) }}
      className="rounded-xl border border-white/8 bg-gradient-to-b from-[#141416] to-[#0e0e10] p-4"
    >
      <div className="flex items-center justify-between">
        <Icon className="h-4 w-4 text-[#9fb7cb]/70" aria-hidden />
        {live && <LiveDot />}
      </div>
      <p className="mt-3 text-2xl font-extrabold text-white md:text-[26px]">
        <CountUp value={value} />
      </p>
      <p className="mt-0.5 text-xs text-white/45">{label}</p>
    </motion.div>
  );
}

export function AdminOverview() {
  const { t } = useT();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.adminOverview();
      setData(res);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error && !data) return <ErrorState onRetry={() => void load()} />;

  if (loading || !data) {
    return (
      <div className="space-y-5" aria-busy="true">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <AdminSkeleton key={i} className="h-[104px]" />
          ))}
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <AdminSkeleton className="h-[180px]" />
          <AdminSkeleton className="h-[220px]" />
        </div>
      </div>
    );
  }

  const stats = [
    { icon: Film, label: t("admin.movies"), value: data.counts.movies },
    { icon: Tv, label: t("admin.series"), value: data.counts.series },
    { icon: Layers, label: t("admin.episodes"), value: data.counts.episodes },
    { icon: Tv, label: t("admin.channelCount"), value: data.counts.channels },
    { icon: Users, label: t("admin.users"), value: data.counts.users },
    { icon: Bookmark, label: t("admin.myListItems"), value: data.counts.listItems },
  ];

  const providers = [{ label: t("admin.tmdb"), configured: data.providerStatus.tmdbConfigured }];

  return (
    <div className="space-y-5" data-testid="admin-overview">
      {/* Stat cards */}
      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs text-white/45">{t("admin.overviewSub")}</p>
          <button
            type="button"
            onClick={() => void load()}
            aria-label={t("admin.refresh")}
            className="tv-focusable inline-flex items-center gap-1.5 rounded-md border border-white/12 px-2.5 py-1.5 text-[11px] font-semibold text-white/65 transition hover:border-white/30 hover:text-white"
          >
            <RefreshCw className="h-3 w-3" aria-hidden />
            {t("admin.refresh")}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {stats.map((s, i) => (
            <StatCard key={s.label} icon={s.icon} label={s.label} value={s.value} index={i} />
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Provider status — honest */}
        <PanelCard title={t("admin.providerStatus")} icon={<Database className="h-4 w-4 text-[#9fb7cb]/70" aria-hidden />}>
          <ul className="space-y-2.5">
            {providers.map((p) => (
              <li key={p.label} className="flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2.5">
                <span className="text-xs font-semibold text-white/75">{p.label}</span>
                {p.configured ? (
                  <StatusChip label={t("admin.connected")} tone="ok" />
                ) : (
                  <StatusChip label={t("admin.notConfigured")} tone="warn" />
                )}
              </li>
            ))}
            <li className="flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2.5">
              <span className="text-xs font-semibold text-white/75">{t("admin.demoMode")}</span>
              <StatusChip
                label={data.providerStatus.demoMode ? t("admin.enabled") : t("admin.disabled")}
                tone={data.providerStatus.demoMode ? "info" : "muted"}
              />
            </li>
          </ul>
        </PanelCard>

        {/* Recent admin activity — derived events only */}
        <PanelCard title={t("admin.recentActivity")} icon={<Activity className="h-4 w-4 text-[#9fb7cb]/70" aria-hidden />}>
          {data.recentActivity.length === 0 ? (
            <p className="py-4 text-center text-xs text-white/40">{t("admin.noActivity")}</p>
          ) : (
            <ol className="relative space-y-3 ps-5">
              <span className="absolute inset-y-1 start-[3px] w-px bg-white/10" aria-hidden />
              {data.recentActivity.map((line, i) => (
                <li key={i} className="relative">
                  <span
                    className="absolute -start-[17px] top-[7px] h-[7px] w-[7px] rounded-full border border-[#9fb7cb]/40 bg-[#0e0e10]"
                    aria-hidden
                  />
                  <span dir="auto" className="line-clamp-2 text-xs leading-relaxed text-white/65">
                    {line}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </PanelCard>

        {/* Honest analytics note */}
        <NoteRow icon={<BarChart3 className="h-4 w-4" aria-hidden />}>{t("admin.analyticsNote")}</NoteRow>
        <NoteRow icon={<Tv className="h-4 w-4" aria-hidden />}>{t("admin.syncNote")}</NoteRow>
      </div>
    </div>
  );
}

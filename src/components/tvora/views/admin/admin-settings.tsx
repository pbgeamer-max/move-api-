"use client";
// ADMIN — Settings tab: honest, read-only system settings. Maintenance toggle is
// server-managed and never faked in the browser. Task 2-d.
import { useCallback, useEffect, useState } from "react";
import {
  FlaskConical,
  Languages as LanguagesIcon,
  LayoutTemplate,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { api } from "@/lib/api";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ErrorState, useT } from "../../shared";
import { AdminSkeleton, NoteRow, PanelCard, StatusChip } from "./admin-kit";

type SettingsData = Awaited<ReturnType<typeof api.adminSettings>>;

function ReadOnlyChip() {
  const { t } = useT();
  return <StatusChip label={t("admin.readOnly")} tone="muted" />;
}

export function AdminSettings() {
  const { t } = useT();
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.adminSettings();
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
        {Array.from({ length: 4 }).map((_, i) => (
          <AdminSkeleton key={i} className="h-[150px]" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="admin-settings">
      {/* Demo mode */}
      <PanelCard
        title={t("admin.demoMode")}
        icon={<FlaskConical className="h-4 w-4 text-[#9fb7cb]/70" aria-hidden />}
        action={<ReadOnlyChip />}
      >
        <div className="flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2.5">
          <span className="text-xs font-semibold text-white/75">{t("admin.status")}</span>
          <StatusChip
            label={data.demoMode.enabled ? t("admin.enabled") : t("admin.disabled")}
            tone={data.demoMode.enabled ? "info" : "muted"}
          />
        </div>
        {data.demoMode.reason && (
          <p dir="ltr" className="mt-3 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2.5 text-start text-xs leading-relaxed text-white/55">
            {data.demoMode.reason}
          </p>
        )}
        <div className="mt-3">
          <NoteRow>{t("admin.demoModeNote")}</NoteRow>
        </div>
      </PanelCard>

      {/* Homepage sections — ordered, read-only */}
      <PanelCard
        title={t("admin.homepageSections")}
        icon={<LayoutTemplate className="h-4 w-4 text-[#9fb7cb]/70" aria-hidden />}
        action={<ReadOnlyChip />}
      >
        {data.homepageSections.length === 0 ? (
          <p className="py-4 text-center text-xs text-white/40">{t("admin.noResults")}</p>
        ) : (
          <ol className="flex flex-wrap gap-2">
            {data.homepageSections.map((key, i) => (
              <li
                key={`${key}-${i}`}
                className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-[#101012] px-2.5 py-1.5 text-xs text-white/70"
              >
                <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#9fb7cb]/15 text-[9px] font-bold tabular-nums text-[#cfe0ee]">
                  {i + 1}
                </span>
                <span dir="ltr" className="font-mono text-[11px]">
                  {key}
                </span>
              </li>
            ))}
          </ol>
        )}
      </PanelCard>

      {/* Maintenance mode — server-managed, never faked */}
      <PanelCard
        title={t("admin.maintenance")}
        icon={<Wrench className="h-4 w-4 text-[#9fb7cb]/70" aria-hidden />}
        action={<ReadOnlyChip />}
      >
        <div className="flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2.5">
          <span className="text-xs font-semibold text-white/75">{t("admin.status")}</span>
          <StatusChip
            label={data.maintenanceMode.enabled ? t("admin.enabled") : t("admin.disabled")}
            tone={data.maintenanceMode.enabled ? "warn" : "muted"}
          />
        </div>
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              {/* Disabled on purpose: this build manages maintenance from the server. */}
              <span tabIndex={0} className="mt-3 inline-flex w-fit cursor-not-allowed items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#9fb7cb]/50">
                <Switch
                  checked={data.maintenanceMode.enabled}
                  disabled
                  aria-label={t("admin.maintenance")}
                  aria-readonly
                  className="data-[state=checked]:bg-[#e8a04c]/70 data-[state=unchecked]:bg-white/15"
                />
                <span className="text-[11px] text-white/40">{t("admin.serverManaged")}</span>
              </span>
            </TooltipTrigger>
            <TooltipContent className="border-white/10 bg-[#17171a] text-xs text-white/80">
              {t("admin.serverManaged")}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </PanelCard>

      {/* Languages */}
      <PanelCard
        title={t("admin.languages")}
        icon={<LanguagesIcon className="h-4 w-4 text-[#9fb7cb]/70" aria-hidden />}
        action={<ReadOnlyChip />}
      >
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-[#9fb7cb]/30 bg-[#9fb7cb]/10 px-3 py-1.5 text-xs font-semibold text-[#cfe0ee]">
            العربية
            <span className="rounded-sm bg-[#9fb7cb]/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">{t("admin.defaultLang")}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-[#101012] px-3 py-1.5 text-xs text-white/65">
            English
          </span>
        </div>
        <p className="mt-3 text-xs text-white/50">{t("admin.langNote")}</p>
      </PanelCard>

      {/* Security note */}
      <section className="flex items-start gap-3 rounded-xl border border-white/10 bg-gradient-to-b from-[#141416] to-[#0e0e10] p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#9fb7cb]/25 bg-[#9fb7cb]/10">
          <ShieldCheck className="h-4 w-4 text-[#cfe0ee]" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-bold text-white/85">{t("admin.settings")} — security</p>
          <p className="mt-1 text-xs leading-relaxed text-white/50">{t("admin.brandNote")}</p>
        </div>
      </section>
    </div>
  );
}

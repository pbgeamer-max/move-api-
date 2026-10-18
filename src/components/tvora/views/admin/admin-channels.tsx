"use client";
// ADMIN — Channels tab: full CRUD for live TV channels (list, edit, create,
// toggle visibility, delete). Server-enforced authz; this UI is admin-only.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, RefreshCw, Save, Trash2, Tv, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { CHANNEL_CATEGORIES, type ChannelDTO } from "@/lib/types";
import { channelLogo } from "@/lib/artwork";
import { useT, LiveDot } from "../../shared";
import { AdminSkeleton, PanelCard, StatusChip } from "./admin-kit";
import { cn } from "@/lib/utils";

type Draft = {
  id?: string;
  code: string;
  nameAr: string;
  nameEn: string;
  category: string;
  descriptionAr: string;
  descriptionEn: string;
  nowPlayingAr: string;
  nowPlayingEn: string;
  colorA: string;
  colorB: string;
  quality: string;
  streamUrl: string;
  visible: boolean;
};

const emptyDraft: Draft = {
  code: "",
  nameAr: "",
  nameEn: "",
  category: "general",
  descriptionAr: "",
  descriptionEn: "",
  nowPlayingAr: "",
  nowPlayingEn: "",
  colorA: "#9fb7cb",
  colorB: "#171719",
  quality: "HD",
  streamUrl: "",
  visible: true,
};

function draftFrom(c: ChannelDTO): Draft {
  return {
    id: c.id,
    code: c.code,
    nameAr: c.nameAr,
    nameEn: c.nameEn,
    category: c.category,
    descriptionAr: c.descriptionAr,
    descriptionEn: c.descriptionEn,
    nowPlayingAr: c.nowPlayingAr,
    nowPlayingEn: c.nowPlayingEn,
    colorA: c.colorA,
    colorB: c.colorB,
    quality: c.quality,
    streamUrl: c.streamUrl ?? "",
    visible: true,
  };
}

export function AdminChannels() {
  const { t, lang } = useT();
  const [items, setItems] = useState<ChannelDTO[] | null>(null);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setError(false);
    try {
      const r = await api.adminChannels();
      setItems(r.items);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.nameAr.includes(search.trim()) ||
        c.nameEn.toLowerCase().includes(q)
    );
  }, [items, search]);

  const name = (c: ChannelDTO) => (lang === "ar" ? c.nameAr : c.nameEn);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const openCreate = () => setDraft({ ...emptyDraft });

  const save = async () => {
    if (!draft) return;
    if (!/^[A-Za-z0-9-]{2,24}$/.test(draft.code.trim())) {
      toast.error(t("admin.codeRequired"));
      return;
    }
    if (!draft.nameAr.trim() || !draft.nameEn.trim()) {
      toast.error(t("admin.namesRequired"));
      return;
    }
    setSaving(true);
    try {
      if (draft.id) {
        await api.adminUpdateChannel(draft.id, { ...draft, code: undefined });
        toast.success(t("admin.savedOk"));
      } else {
        await api.adminCreateChannel({ ...draft, code: draft.code.trim().toUpperCase() });
        toast.success(t("admin.created"));
      }
      setDraft(null);
      await load();
    } catch (e) {
      const message = (e as { message?: string }).message || "";
      toast.error(message.includes("duplicate") ? t("admin.duplicateCode") : t("admin.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const toggleVisible = async (c: ChannelDTO) => {
    setBusyId(c.id);
    try {
      await api.adminUpdateChannel(c.id, { visible: !c.visible });
      await load();
    } catch {
      toast.error(t("admin.saveError"));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (c: ChannelDTO) => {
    if (!window.confirm(t("admin.deleteConfirm"))) return;
    setBusyId(c.id);
    try {
      await api.adminDeleteChannel(c.id);
      toast.success(t("admin.deleted"));
      await load();
    } catch {
      toast.error(t("admin.saveError"));
    } finally {
      setBusyId(null);
    }
  };

  if (error && !items) {
    return (
      <div className="flex flex-col items-center gap-3 py-10">
        <p className="text-sm text-white/55">{t("misc.error")}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="tv-focusable rounded-md border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:border-white/40 hover:text-white"
        >
          {t("misc.retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="admin-channels">
      <PanelCard
        title={t("admin.channelsList")}
        icon={<Tv className="h-4 w-4 text-[#9fb7cb]/70" aria-hidden />}
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              aria-label={t("admin.refresh")}
              className="tv-focusable flex h-8 w-8 items-center justify-center rounded-md border border-white/12 text-white/60 transition hover:border-white/30 hover:text-white"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={openCreate}
              data-testid="admin-channel-create"
              className="tv-focusable inline-flex min-h-[36px] items-center gap-1.5 rounded-md bg-white px-3 text-xs font-extrabold text-black transition hover:bg-[#e8eef4]"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              {t("admin.newChannel")}
            </button>
          </div>
        }
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("admin.search")}
          aria-label={t("admin.search")}
          className="tv-focusable mb-4 min-h-[40px] w-full max-w-xs rounded-md border border-white/12 bg-[#121216] px-3 text-sm placeholder:text-white/30"
        />

        {items === null ? (
          <div className="space-y-2" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <AdminSkeleton key={i} className="h-[64px]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/40">{t("admin.noResults")}</p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-white/8 bg-white/[0.02] p-3"
                data-testid="admin-channel-row"
              >
                <img
                  src={channelLogo(c, 96)}
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 shrink-0 rounded-md"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-bold text-white/88">
                    {name(c)}
                    {c.visible ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-widest text-[#ff6b70]">
                        <LiveDot /> {t("hero.live")}
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-[11px] text-white/40" dir="ltr">
                    {c.code} · {t(`channels.${c.category}`)} · {c.quality}
                  </p>
                </div>
                <StatusChip label={c.visible ? t("admin.visible") : t("admin.hidden")} tone={c.visible ? "ok" : "muted"} />
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void toggleVisible(c)}
                    disabled={busyId === c.id}
                    className="tv-focusable min-h-[36px] rounded-md border border-white/12 px-3 text-xs font-bold text-white/70 transition hover:border-white/35 hover:text-white disabled:opacity-40"
                  >
                    {busyId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : c.visible ? t("admin.hidden") : t("admin.visible")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraft(draftFrom(c))}
                    aria-label={`${t("admin.edit")} — ${name(c)}`}
                    className="tv-focusable flex h-9 w-9 items-center justify-center rounded-md border border-white/12 text-white/65 transition hover:border-white/35 hover:text-white"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(c)}
                    aria-label={`${t("admin.deleteChannel")} — ${name(c)}`}
                    className="tv-focusable flex h-9 w-9 items-center justify-center rounded-md border border-[#e5484d]/25 text-[#ff8a8e] transition hover:border-[#e5484d]/60 hover:bg-[#e5484d]/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PanelCard>

      {/* Edit / create drawer */}
      {draft && (
        <PanelCard
          title={draft.id ? `${t("admin.edit")} — ${draft.code}` : t("admin.newChannel")}
          icon={<Tv className="h-4 w-4 text-[#9fb7cb]/70" aria-hidden />}
          action={
            <button
              type="button"
              onClick={() => setDraft(null)}
              aria-label={t("admin.cancel")}
              className="tv-focusable flex h-8 w-8 items-center justify-center rounded-md border border-white/12 text-white/60 transition hover:border-white/35 hover:text-white"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2" data-testid="admin-channel-form">
            <Field label={t("admin.channelCode")} dir="ltr">
              <input
                value={draft.code}
                onChange={(e) => set("code", e.target.value.toUpperCase())}
                disabled={Boolean(draft.id)}
                className={cn(inputCls, draft.id && "opacity-50")}
                placeholder="TVORA-SPORTS-3"
              />
            </Field>
            <Field label={t("admin.channelCategory")}>
              <select value={draft.category} onChange={(e) => set("category", e.target.value)} className={inputCls}>
                {CHANNEL_CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-[#121216]">
                    {t(`channels.${c}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("admin.fieldTitleAr")}>
              <input value={draft.nameAr} onChange={(e) => set("nameAr", e.target.value)} className={inputCls} />
            </Field>
            <Field label={t("admin.fieldTitleEn")} dir="ltr">
              <input value={draft.nameEn} onChange={(e) => set("nameEn", e.target.value)} className={inputCls} />
            </Field>
            <Field label={t("admin.descriptionAr")}>
              <textarea value={draft.descriptionAr} onChange={(e) => set("descriptionAr", e.target.value)} rows={2} className={inputCls} />
            </Field>
            <Field label={t("admin.descriptionEn")} dir="ltr">
              <textarea value={draft.descriptionEn} onChange={(e) => set("descriptionEn", e.target.value)} rows={2} className={inputCls} />
            </Field>
            <Field label={t("admin.nowPlaying")}>
              <input value={draft.nowPlayingAr} onChange={(e) => set("nowPlayingAr", e.target.value)} className={inputCls} />
            </Field>
            <Field label={`${t("admin.nowPlaying")} (EN)`} dir="ltr">
              <input value={draft.nowPlayingEn} onChange={(e) => set("nowPlayingEn", e.target.value)} className={inputCls} />
            </Field>
            <Field label={t("admin.playbackUrl")} dir="ltr">
              <input value={draft.streamUrl} onChange={(e) => set("streamUrl", e.target.value)} className={inputCls} placeholder="/media/demo-film.mp4" />
            </Field>
            <Field label={t("admin.qualityField")}>
              <select value={draft.quality} onChange={(e) => set("quality", e.target.value)} className={inputCls}>
                {["SD", "HD", "4K"].map((q) => (
                  <option key={q} value={q} className="bg-[#121216]">
                    {q}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("admin.colorA")}>
              <div className="flex items-center gap-2">
                <input type="color" value={draft.colorA} onChange={(e) => set("colorA", e.target.value)} className="h-10 w-12 cursor-pointer rounded-md border border-white/12 bg-transparent" aria-label={t("admin.colorA")} />
                <span className="text-xs text-white/45" dir="ltr">{draft.colorA}</span>
              </div>
            </Field>
            <Field label={t("admin.colorB")}>
              <div className="flex items-center gap-2">
                <input type="color" value={draft.colorB} onChange={(e) => set("colorB", e.target.value)} className="h-10 w-12 cursor-pointer rounded-md border border-white/12 bg-transparent" aria-label={t("admin.colorB")} />
                <span className="text-xs text-white/45" dir="ltr">{draft.colorB}</span>
              </div>
            </Field>
          </div>

          {/* Live logo preview */}
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.02] p-3">
            <img src={channelLogo(draft, 96)} alt="" width={56} height={56} className="h-14 w-14 rounded-md" aria-hidden />
            <p className="text-xs text-white/45">{t("admin.brandNote")}</p>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="tv-focusable min-h-[40px] rounded-md border border-white/15 px-4 text-sm font-semibold text-white/75 transition hover:border-white/40 hover:text-white"
            >
              {t("admin.cancel")}
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              data-testid="admin-channel-save"
              className="tv-focusable inline-flex min-h-[40px] items-center gap-2 rounded-md bg-white px-4 text-sm font-extrabold text-black transition hover:bg-[#e8eef4] disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
              {saving ? t("admin.saving") : t("admin.save")}
            </button>
          </div>
        </PanelCard>
      )}
    </div>
  );
}

const inputCls =
  "tv-focusable min-h-[40px] w-full rounded-md border border-white/12 bg-[#121216] px-3 text-sm text-white/90 placeholder:text-white/30";

function Field({ label, dir, children }: { label: string; dir?: "ltr" | "rtl"; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-white/50">{label}</span>
      <span dir={dir} className="block">
        {children}
      </span>
    </label>
  );
}

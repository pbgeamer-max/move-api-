"use client";
// ADMIN — Content tab: movies/series management with search, visibility flags
// (optimistic switches) and a full edit dialog. Task 2-d.
import { useCallback, useEffect, useState } from "react";
import { Edit3, Film, Loader2, Search, Sparkles, Tv } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { localized, type TitleDTO } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorState, Poster, useT } from "../../shared";
import { AdminSkeleton, PanelCard } from "./admin-kit";

type AdminTitle = TitleDTO & { visible?: boolean; episodesCount?: number };
type FlagField = "featured" | "trending" | "isNew" | "visible";

interface EditForm {
  titleAr: string;
  titleEn: string;
  synopsisAr: string;
  synopsisEn: string;
  releaseYear: string;
  runtime: string;
  rating: string;
  ageRating: string;
  genres: string;
  playbackType: string;
  playbackUrl: string;
  posterUrl: string;
  backdropUrl: string;
}

function toForm(item: AdminTitle): EditForm {
  return {
    titleAr: item.titleAr ?? "",
    titleEn: item.titleEn ?? "",
    synopsisAr: item.synopsisAr ?? "",
    synopsisEn: item.synopsisEn ?? "",
    releaseYear: String(item.releaseYear ?? ""),
    runtime: item.runtime != null ? String(item.runtime) : "",
    rating: item.rating != null ? String(Math.round(item.rating * 10) / 10) : "",
    ageRating: item.ageRating ?? "",
    genres: (item.genres ?? []).join(", "),
    playbackType: item.playbackType === "demo" ? "demo" : "none",
    playbackUrl: item.playbackUrl ?? "",
    posterUrl: item.posterUrl ?? "",
    backdropUrl: item.backdropUrl ?? "",
  };
}

function Field({
  label,
  htmlFor,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-xs text-white/70">
        {label}
      </Label>
      {children}
      {error && (
        <p className="text-[11px] font-semibold text-[#ff8a8e]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

const inputCls =
  "tv-focusable h-9 w-full rounded-md border border-white/12 bg-[#101012] px-3 text-sm text-white placeholder:text-white/25 focus:border-[#9fb7cb]/50";

// ─── Edit dialog (mounted only while editing — form initializes once) ─────────

function EditTitleDialog({
  item,
  onClose,
  onSaved,
}: {
  item: AdminTitle;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t, lang } = useT();
  const [form, setForm] = useState<EditForm>(() => toForm(item));
  const [busy, setBusy] = useState(false);
  const [gen, setGen] = useState(false);
  const [errors, setErrors] = useState<{ titleEn?: string; releaseYear?: string }>({});

  const set = (patch: Partial<EditForm>) => setForm((f) => ({ ...f, ...patch }));

  // AI draft — fills both synopsis fields for review; nothing is saved until the admin saves
  const generateSynopsis = async () => {
    setGen(true);
    try {
      const r = await api.aiSynopsis(item.id);
      set({ synopsisAr: r.synopsisAr, synopsisEn: r.synopsisEn });
      toast.success(t("ai.done"), { description: t("ai.fillHint") });
    } catch {
      toast.error(t("ai.error"));
    } finally {
      setGen(false);
    }
  };

  const save = async () => {
    const nextErrors: typeof errors = {};
    if (!form.titleEn.trim()) nextErrors.titleEn = t("admin.titleRequired");
    const year = Number(form.releaseYear);
    if (!form.releaseYear || !Number.isInteger(year) || year < 1900 || year > 2100) {
      nextErrors.releaseYear = t("admin.yearInvalid");
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setBusy(true);
    try {
      await api.adminUpdateTitle(item.id, {
        titleAr: form.titleAr.trim() || undefined,
        titleEn: form.titleEn.trim(),
        synopsisAr: form.synopsisAr,
        synopsisEn: form.synopsisEn,
        releaseYear: year,
        runtime: item.type === "movie" ? (form.runtime === "" ? null : Number(form.runtime)) : undefined,
        rating: form.rating === "" ? null : Math.min(10, Math.max(0, Number(form.rating))),
        ageRating: form.ageRating.trim() || null,
        genres: form.genres
          .split(",")
          .map((g) => g.trim())
          .filter(Boolean)
          .slice(0, 10),
        playbackType: form.playbackType === "demo" ? "demo" : "none",
        playbackUrl:
          form.playbackType === "demo" && form.playbackUrl.trim() ? form.playbackUrl.trim() : null,
        posterUrl: form.posterUrl.trim() || null,
        backdropUrl: form.backdropUrl.trim() || null,
      });
      toast.success(t("admin.savedOk"));
      onSaved();
    } catch {
      toast.error(t("admin.saveError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[86vh] overflow-y-auto border-white/10 bg-[#101012] sm:max-w-2xl">
        <DialogHeader className="text-start">
          <DialogTitle className="flex items-center gap-2 text-white">
            <Edit3 className="h-4 w-4 text-[#9fb7cb]" aria-hidden />
            {t("admin.editTitle")}
          </DialogTitle>
          <DialogDescription dir="ltr" className="text-start font-mono text-xs text-white/40">
            {item.slug}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("admin.fieldTitleEn")} htmlFor="edit-titleEn" error={errors.titleEn}>
            <Input
              id="edit-titleEn"
              dir="ltr"
              value={form.titleEn}
              onChange={(e) => set({ titleEn: e.target.value })}
              className={inputCls}
              aria-invalid={Boolean(errors.titleEn)}
            />
          </Field>
          <Field label={t("admin.fieldTitleAr")} htmlFor="edit-titleAr">
            <Input
              id="edit-titleAr"
              value={form.titleAr}
              onChange={(e) => set({ titleAr: e.target.value })}
              className={inputCls}
            />
          </Field>
          <div className="flex items-center justify-end sm:col-span-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void generateSynopsis()}
              disabled={gen || busy}
              aria-label={t("ai.generate")}
              data-testid="ai-synopsis-btn"
              className="h-8 border-[#d8c9a3]/35 bg-[#d8c9a3]/10 px-3 text-xs font-bold text-[#d8c9a3] hover:bg-[#d8c9a3]/20 hover:text-[#ead9b5]"
            >
              {gen ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Sparkles className="h-3.5 w-3.5" aria-hidden />}
              {gen ? t("ai.generating") : t("ai.generate")}
            </Button>
          </div>
          <Field label={t("admin.synopsisAr")} htmlFor="edit-synAr" className="sm:col-span-2">
            <Textarea
              id="edit-synAr"
              rows={2}
              value={form.synopsisAr}
              onChange={(e) => set({ synopsisAr: e.target.value })}
              className="tv-focusable min-h-[60px] w-full rounded-md border border-white/12 bg-[#101012] p-3 text-sm text-white focus:border-[#9fb7cb]/50"
            />
          </Field>
          <Field label={t("admin.synopsisEn")} htmlFor="edit-synEn" className="sm:col-span-2">
            <Textarea
              id="edit-synEn"
              rows={2}
              value={form.synopsisEn}
              onChange={(e) => set({ synopsisEn: e.target.value })}
              className="tv-focusable min-h-[60px] w-full rounded-md border border-white/12 bg-[#101012] p-3 text-sm text-white focus:border-[#9fb7cb]/50"
            />
          </Field>
          <Field label={t("admin.year")} htmlFor="edit-year" error={errors.releaseYear}>
            <Input
              id="edit-year"
              type="number"
              inputMode="numeric"
              min={1900}
              max={2100}
              value={form.releaseYear}
              onChange={(e) => set({ releaseYear: e.target.value })}
              className={cn(inputCls, "tabular-nums")}
              aria-invalid={Boolean(errors.releaseYear)}
            />
          </Field>
          {item.type === "movie" && (
            <Field label={t("admin.runtime")} htmlFor="edit-runtime">
              <Input
                id="edit-runtime"
                type="number"
                inputMode="numeric"
                min={0}
                max={600}
                value={form.runtime}
                onChange={(e) => set({ runtime: e.target.value })}
                className={cn(inputCls, "tabular-nums")}
              />
            </Field>
          )}
          <Field label={t("admin.rating")} htmlFor="edit-rating">
            <Input
              id="edit-rating"
              type="number"
              inputMode="decimal"
              step={0.1}
              min={0}
              max={10}
              value={form.rating}
              onChange={(e) => set({ rating: e.target.value })}
              className={cn(inputCls, "tabular-nums")}
            />
          </Field>
          <Field label={t("admin.ageRating")} htmlFor="edit-age">
            <Input
              id="edit-age"
              value={form.ageRating}
              onChange={(e) => set({ ageRating: e.target.value })}
              placeholder="PG-13"
              className={inputCls}
            />
          </Field>
          <Field label={t("admin.genres")} htmlFor="edit-genres" className="sm:col-span-2">
            <Input
              id="edit-genres"
              value={form.genres}
              onChange={(e) => set({ genres: e.target.value })}
              placeholder="Action, Drama"
              dir="ltr"
              className={inputCls}
            />
          </Field>
          <Field label={t("admin.playbackType")} htmlFor="edit-playbackType">
            <Select value={form.playbackType} onValueChange={(v) => set({ playbackType: v })}>
              <SelectTrigger id="edit-playbackType" className="tv-focusable h-9 border-white/12 bg-[#101012] text-sm text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-[#141416] text-white">
                <SelectItem value="demo">{t("player.demoNotice")}</SelectItem>
                <SelectItem value="none">{t("details.notAvailableStream")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {form.playbackType === "demo" && (
            <Field label={t("admin.playbackUrl")} htmlFor="edit-playbackUrl">
              <Input
                id="edit-playbackUrl"
                dir="ltr"
                value={form.playbackUrl}
                onChange={(e) => set({ playbackUrl: e.target.value })}
                placeholder="/media/demo-film.mp4"
                className={cn(inputCls, "font-mono text-xs")}
              />
            </Field>
          )}
          <Field label={t("admin.posterUrl")} htmlFor="edit-posterUrl">
            <Input
              id="edit-posterUrl"
              dir="ltr"
              value={form.posterUrl}
              onChange={(e) => set({ posterUrl: e.target.value })}
              className={cn(inputCls, "font-mono text-xs")}
            />
          </Field>
          <Field label={t("admin.backdropUrl")} htmlFor="edit-backdropUrl">
            <Input
              id="edit-backdropUrl"
              dir="ltr"
              value={form.backdropUrl}
              onChange={(e) => set({ backdropUrl: e.target.value })}
              className={cn(inputCls, "font-mono text-xs")}
            />
          </Field>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-white/15 bg-transparent text-white/75 hover:bg-white/5 hover:text-white"
          >
            {t("admin.cancel")}
          </Button>
          <Button
            type="button"
            onClick={() => void save()}
            disabled={busy}
            className="bg-[#9fb7cb] font-bold text-[#0a0c10] hover:bg-[#cfe0ee]"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
            {busy ? t("admin.saving") : t("admin.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Flag switch cell (shared by table row & mobile card) ─────────────────────

function FlagSwitch({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <Switch
      checked={checked}
      onCheckedChange={onToggle}
      aria-label={label}
      className="data-[state=checked]:bg-[#9fb7cb] data-[state=unchecked]:bg-white/15"
    />
  );
}

// ─── Main content tab ─────────────────────────────────────────────────────────

export function AdminContent() {
  const { t, lang } = useT();
  const [type, setType] = useState<"movie" | "series">("movie");
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [items, setItems] = useState<AdminTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState<AdminTitle | null>(null);

  // Debounce search input (300ms)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(id);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.adminTitles({ type, q: debounced || undefined });
      setItems(res.items as AdminTitle[]);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [type, debounced]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchFlag = async (item: AdminTitle, field: FlagField, value: boolean) => {
    setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, [field]: value } : x)));
    try {
      await api.adminUpdateTitle(item.id, { [field]: value });
    } catch {
      setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, [field]: !value } : x)));
      toast.error(t("admin.saveError"));
    }
  };

  const flags: Array<{ field: FlagField; label: string }> = [
    { field: "featured", label: t("admin.featured") },
    { field: "trending", label: t("admin.trending") },
    { field: "isNew", label: t("admin.isNew") },
    { field: "visible", label: t("admin.visible") },
  ];

  return (
    <div className="space-y-4" data-testid="admin-content">
      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="group"
          aria-label={t("admin.content")}
          className="flex w-fit gap-1 rounded-lg border border-white/8 bg-white/[0.02] p-1"
        >
          {(
            [
              { id: "movie", label: t("admin.movies"), icon: Film },
              { id: "series", label: t("admin.series"), icon: Tv },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setType(opt.id)}
              aria-pressed={type === opt.id}
              className={cn(
                "tv-focusable inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-semibold transition",
                type === opt.id ? "bg-[#9fb7cb]/15 text-[#cfe0ee]" : "text-white/55 hover:text-white/85"
              )}
            >
              <opt.icon className="h-3.5 w-3.5" aria-hidden />
              {opt.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search
            className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-white/30"
            style={{ insetInlineStart: 12 }}
            aria-hidden
          />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("admin.search")}
            aria-label={t("admin.search")}
            className="tv-focusable h-9 w-full rounded-md border border-white/12 bg-[#101012] text-sm text-white placeholder:text-white/25 focus:border-[#9fb7cb]/50"
            style={{ paddingInlineStart: 36, paddingInlineEnd: 12 }}
          />
        </div>
      </div>

      {error && items.length === 0 ? (
        <ErrorState onRetry={() => void load()} />
      ) : loading && items.length === 0 ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <AdminSkeleton key={i} className="h-[72px]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <PanelCard>
          <p className="py-10 text-center text-sm text-white/40">{t("admin.noResults")}</p>
        </PanelCard>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-xl border border-white/8 md:block">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <caption className="sr-only">{t("admin.content")}</caption>
              <thead>
                <tr className="border-b border-white/8 bg-white/[0.02] text-start text-[11px] uppercase tracking-wider text-white/45">
                  <th scope="col" className="px-4 py-3 text-start font-semibold">
                    {t("search.titles")}
                  </th>
                  <th scope="col" className="px-3 py-3 text-start font-semibold">
                    {t("admin.year")}
                  </th>
                  <th scope="col" className="px-3 py-3 text-start font-semibold">
                    {t("details.rating")}
                  </th>
                  <th scope="col" className="px-3 py-3 text-center font-semibold">
                    {t("admin.featured")}
                  </th>
                  <th scope="col" className="px-3 py-3 text-center font-semibold">
                    {t("admin.trending")}
                  </th>
                  <th scope="col" className="px-3 py-3 text-center font-semibold">
                    {t("admin.isNew")}
                  </th>
                  <th scope="col" className="px-3 py-3 text-center font-semibold">
                    {t("admin.visible")}
                  </th>
                  <th scope="col" className="px-3 py-3 text-end font-semibold">
                    <span className="sr-only">{t("admin.edit")}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {items.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded border border-white/8">
                          <Poster title={item} lang={lang} sizes="40px" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-white/90">{localized(item, lang)}</p>
                          <p dir="ltr" className="truncate font-mono text-[10px] text-white/35">
                            {item.slug}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-white/65">{item.releaseYear}</td>
                    <td className="px-3 py-2.5 tabular-nums text-white/65">{item.rating != null ? item.rating.toFixed(1) : "—"}</td>
                    {flags.map((f) => (
                      <td key={f.field} className="px-3 py-2.5 text-center">
                        <div className="flex justify-center">
                          <FlagSwitch
                            label={`${f.label}: ${localized(item, lang)}`}
                            checked={Boolean(item[f.field])}
                            onToggle={(v) => void patchFlag(item, f.field, v)}
                          />
                        </div>
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing(item)}
                        aria-label={`${t("admin.edit")}: ${localized(item, lang)}`}
                        className="h-7 border-white/15 bg-transparent px-2.5 text-xs text-white/75 hover:bg-white/5 hover:text-white"
                      >
                        <Edit3 className="h-3 w-3" aria-hidden />
                        {t("admin.edit")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-2.5 md:hidden">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-white/8 bg-gradient-to-b from-[#141416] to-[#0e0e10] p-3.5"
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded border border-white/8">
                    <Poster title={item} lang={lang} sizes="44px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white/90">{localized(item, lang)}</p>
                    <p className="mt-0.5 text-[11px] tabular-nums text-white/45">
                      {item.releaseYear} · {item.rating != null ? item.rating.toFixed(1) : "—"}
                    </p>
                    <p dir="ltr" className="truncate font-mono text-[10px] text-white/30">
                      {item.slug}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing(item)}
                    aria-label={`${t("admin.edit")}: ${localized(item, lang)}`}
                    className="h-8 border-white/15 bg-transparent px-2.5 text-xs text-white/75 hover:bg-white/5 hover:text-white"
                  >
                    <Edit3 className="h-3 w-3" aria-hidden />
                    {t("admin.edit")}
                  </Button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-white/6 pt-3">
                  {flags.map((f) => (
                    <label
                      key={f.field}
                      className="flex cursor-pointer items-center justify-between gap-2 text-xs text-white/60"
                    >
                      <span>{f.label}</span>
                      <FlagSwitch
                        label={`${f.label}: ${localized(item, lang)}`}
                        checked={Boolean(item[f.field])}
                        onToggle={(v) => void patchFlag(item, f.field, v)}
                      />
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Edit dialog — mounted only while editing so the form initializes fresh */}
      {editing && (
        <EditTitleDialog
          key={editing.id}
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

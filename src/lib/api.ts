"use client";
// TVORA API client — typed fetch helpers with guest device header
import type {
  ChannelDTO,
  HomePayload,
  Lang,
  ProgressDTO,
  SearchPayload,
  SessionUser,
  SeriesDetailsDTO,
  TitleDTO,
} from "./types";
import { deviceId, useAppStore } from "./store";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("X-Device-Id", deviceId());
  if (init?.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const res = await fetch(path, { ...init, headers, cache: "no-store" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as Record<string, unknown>);
    const message = (body as { error?: string }).error || `HTTP ${res.status}`;
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

// ─── Catalog ─────────────────────────────────────────────────────────────────

export const api = {
  home: () => req<HomePayload>("/api/home"),

  titles: (params: { type?: string; genre?: string; year?: string; sort?: string; q?: string; page?: number; limit?: number }) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== "") sp.set(k, String(v));
    });
    return req<{ items: TitleDTO[]; total: number; page: number; pages: number }>(`/api/titles?${sp}`);
  },

  title: (id: string) => req<TitleDTO | SeriesDetailsDTO>(`/api/titles/${id}`),

  channels: (category?: string) => {
    const sp = new URLSearchParams();
    if (category) sp.set("category", category);
    return req<{ items: ChannelDTO[] }>(`/api/channels?${sp}`);
  },

  search: (q: string) => req<SearchPayload>(`/api/search?q=${encodeURIComponent(q)}`),

  // ── AI (task 6-a) ────────────────────────────────────────────────────────────
  aiSearch: (q: string, lang: Lang) =>
    req<{ answer: string | null; items: TitleDTO[]; fallback: boolean }>("/api/ai/search", {
      method: "POST",
      body: JSON.stringify({ q, lang }),
    }),
  aiRecommendations: () => {
    const lang = useAppStore.getState().lang;
    return req<{ items: TitleDTO[]; answer: string | null; coldStart?: boolean }>(
      `/api/ai/recommendations?lang=${lang}`
    );
  },
  aiSynopsis: (titleId: string) =>
    req<{ synopsisAr: string; synopsisEn: string }>("/api/ai/synopsis", {
      method: "POST",
      body: JSON.stringify({ titleId }),
    }),

  // ── Auth ───────────────────────────────────────────────────────────────────
  me: () => req<{ user: SessionUser | null }>("/api/auth/me"),
  login: (email: string, password: string) =>
    req<{ user: SessionUser }>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (email: string, password: string, name: string) =>
    req<{ user: SessionUser }>("/api/auth/register", { method: "POST", body: JSON.stringify({ email, password, name }) }),
  logout: () => req<{ ok: true }>("/api/auth/logout", { method: "POST" }),
  forgot: (email: string) => req<{ ok: true }>("/api/auth/forgot", { method: "POST", body: JSON.stringify({ email }) }),

  // ── My list ────────────────────────────────────────────────────────────────
  listGet: () => req<{ items: TitleDTO[] }>("/api/list"),
  listAdd: (titleId: string) => req<{ ok: true }>("/api/list", { method: "POST", body: JSON.stringify({ titleId }) }),
  listRemove: (titleId: string) => req<{ ok: true }>(`/api/list?titleId=${titleId}`, { method: "DELETE" }),

  // ── Progress ───────────────────────────────────────────────────────────────
  progressGet: () => req<{ items: ProgressDTO[] }>("/api/progress"),
  progressSave: (data: { titleId: string; episodeId?: string | null; positionSeconds: number; durationSeconds: number }) =>
    req<{ ok: true }>("/api/progress", { method: "POST", body: JSON.stringify(data) }),

  // ── Profile ────────────────────────────────────────────────────────────────
  updateProfile: (data: { name?: string; preferredLanguage?: string }) =>
    req<{ user: SessionUser }>("/api/auth/profile", { method: "PATCH", body: JSON.stringify(data) }),

  // ── Admin ──────────────────────────────────────────────────────────────────
  adminOverview: () =>
    req<{
      counts: { movies: number; series: number; episodes: number; channels: number; users: number; listItems: number };
      providerStatus: { tmdbConfigured: boolean; demoMode: boolean };
      recentActivity: string[];
    }>("/api/admin/overview"),
  adminTitles: (params: { type?: string; q?: string }) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v && sp.set(k, v));
    return req<{ items: TitleDTO[] }>(`/api/admin/titles?${sp}`);
  },
  adminUpdateTitle: (id: string, data: Record<string, unknown>) =>
    req<{ ok: true }>(`/api/admin/titles/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  adminChannels: () => req<{ items: ChannelDTO[] }>("/api/admin/channels"),
  adminCreateChannel: (data: Record<string, unknown>) =>
    req<{ channel: ChannelDTO }>("/api/admin/channels", { method: "POST", body: JSON.stringify(data) }),
  adminUpdateChannel: (id: string, data: Record<string, unknown>) =>
    req<{ channel: ChannelDTO }>(`/api/admin/channels/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  adminDeleteChannel: (id: string) => req<{ ok: true }>(`/api/admin/channels/${id}`, { method: "DELETE" }),
  adminSettings: () => req<{ demoMode: { enabled: boolean; reason: string }; homepageSections: string[]; maintenanceMode: { enabled: boolean } }>("/api/admin/settings"),
};

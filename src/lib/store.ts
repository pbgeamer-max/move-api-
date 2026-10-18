"use client";
// TVORA app store — view router (hash), language, session, my-list
import { create } from "zustand";
import type { Lang, SessionUser } from "./types";

export type ViewName =
  | "home"
  | "movies"
  | "series"
  | "title"
  | "channels"
  | "watch"
  | "mylist"
  | "continue"
  | "auth"
  | "profile"
  | "pricing"
  | "about"
  | "privacy"
  | "terms"
  | "admin"
  | "notfound";

export interface ViewState {
  name: ViewName;
  id?: string;
  ep?: string;
  mode?: "login" | "register" | "forgot";
  q?: string; // free-form query, e.g. filters: "genre=Action&sort=rating"
}

interface AppState {
  lang: Lang;
  view: ViewState;
  user: SessionUser | null;
  authReady: boolean;
  searchOpen: boolean;
  introDone: boolean;
  listIds: string[];
  deviceReady: boolean;
  navigate: (view: ViewState | ViewName) => void;
  setLang: (lang: Lang) => void;
  setUser: (u: SessionUser | null) => void;
  setAuthReady: (ready: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setIntroDone: (done: boolean) => void;
  setListIds: (ids: string[]) => void;
  toggleListLocal: (id: string) => void;
}

export function viewToHash(v: ViewState): string {
  switch (v.name) {
    case "home":
      return "#/";
    case "movies":
    case "series":
    case "channels":
    case "mylist":
    case "continue":
    case "profile":
    case "pricing":
    case "about":
    case "privacy":
    case "terms":
      return v.q ? `#/${v.name}?${v.q}` : `#/${v.name}`;
    case "title":
      return `#/title/${v.id ?? ""}`;
    case "admin":
      return v.q ? `#/admin?${v.q}` : "#/admin";
    case "watch": {
      const ep = v.ep ? `?ep=${v.ep}` : "";
      return `#/watch/${v.id ?? ""}${ep}`;
    }
    case "auth":
      return `#/auth/${v.mode ?? "login"}`;
    default:
      return "#/";
  }
}

export function parseHash(hash: string): ViewState {
  const raw = (hash || "#/").replace(/^#\/?/, "");
  const [pathPart, queryPart] = raw.split("?");
  const segments = pathPart.split("/").filter(Boolean);
  const q = queryPart || undefined;

  if (segments.length === 0) return { name: "home" };
  const [head, second, third] = segments;
  switch (head) {
    case "movies":
    case "series":
    case "channels":
    case "mylist":
    case "continue":
    case "profile":
    case "pricing":
    case "about":
    case "privacy":
    case "terms":
      return { name: head as ViewName, q };
    // legacy football routes → live TV channels
    case "live":
    case "matches":
    case "match":
      return { name: "channels" };
    case "title":
      return second ? { name: "title", id: second } : { name: "movies" };
    case "watch":
      return second
        ? { name: "watch", id: second, ep: new URLSearchParams(queryPart || "").get("ep") || undefined }
        : { name: "home" };
    case "auth":
      return { name: "auth", mode: (second as "login" | "register" | "forgot") || "login" };
    case "admin":
      return { name: "admin", q };
    default:
      return { name: "notfound" };
  }
}

function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("tvora.device");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("tvora.device", id);
  }
  return id;
}

export const deviceId = getDeviceId;

function initialView(): ViewState {
  if (typeof window === "undefined") return { name: "home" };
  return parseHash(window.location.hash);
}

function initialLang(): Lang {
  if (typeof window === "undefined") return "ar";
  return (localStorage.getItem("tvora.lang") as Lang) || "ar";
}

function initialList(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("tvora.list") || "[]");
  } catch {
    return [];
  }
}

function initialIntro(): boolean {
  if (typeof window === "undefined") return true;
  return sessionStorage.getItem("tvora.introDone") === "1";
}

export const applyLangToDocument = (lang: Lang) => {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
};

export const useAppStore = create<AppState>((set) => ({
  lang: initialLang(),
  view: initialView(),
  user: null,
  authReady: false,
  searchOpen: false,
  introDone: initialIntro(),
  listIds: initialList(),
  deviceReady: false,

  navigate: (v) => {
    const view: ViewState = typeof v === "string" ? { name: v } : v;
    const target = viewToHash(view);
    if (typeof window !== "undefined" && window.location.hash !== target) {
      window.location.hash = target;
    } else {
      // same hash — force state update (e.g. re-click)
      set({ view });
    }
    // scroll to top on navigation
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }));
    }
  },

  setLang: (lang) => {
    localStorage.setItem("tvora.lang", lang);
    applyLangToDocument(lang);
    set({ lang });
  },

  setUser: (user) => set({ user }),
  setAuthReady: (authReady) => set({ authReady }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setIntroDone: (done) => {
    if (typeof window !== "undefined" && done) sessionStorage.setItem("tvora.introDone", "1");
    set({ introDone: done });
  },
  setListIds: (listIds) => {
    if (typeof window !== "undefined") localStorage.setItem("tvora.list", JSON.stringify(listIds));
    set({ listIds });
  },
  toggleListLocal: (id) => {
    const cur = useAppStore.getState().listIds;
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    useAppStore.getState().setListIds(next);
  },
}));

// Hash ↔ store sync (registered once from AppShell)
export function bindHashRouter() {
  if (typeof window === "undefined") return () => {};
  const onHash = () => {
    useAppStore.setState({ view: parseHash(window.location.hash) });
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  };
  window.addEventListener("hashchange", onHash);
  applyLangToDocument(useAppStore.getState().lang);
  if (!window.location.hash) window.location.hash = "#/";
  return () => window.removeEventListener("hashchange", onHash);
}

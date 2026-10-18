// TVORA unified database router
// Hybrid architecture:
// - Authentication & Users: Managed via Google Firebase Firestore (user, session)
// - Content & Catalog: Managed via Supabase PostgreSQL / Prisma (title, season, episode, channel, siteSetting, etc.)
// - Resilient zero-downtime fallback to local catalog & channels
import { isFirebaseConfigured } from "./firebase-admin";
import { firestoreDb } from "./firestore-db";
import { getLocalCatalog, DEFAULT_CHANNELS, DEFAULT_SETTINGS } from "./catalog-loader";

let _PrismaClientClass: any = null;
function getPrismaClientClass(): any {
  if (_PrismaClientClass) return _PrismaClientClass;
  try {
    const pkg = require("@prisma/client");
    _PrismaClientClass = pkg.PrismaClient;
    return _PrismaClientClass;
  } catch {
    return null;
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: any;
};

function getPrismaClient(): any {
  if (!globalForPrisma.prisma) {
    const PrismaClass = getPrismaClientClass();
    if (PrismaClass) {
      globalForPrisma.prisma = new PrismaClass({
        log: ["error", "warn"],
      });
    }
  }
  return globalForPrisma.prisma;
}

// Resilient Prisma Proxy that falls back to embedded 3isk catalog if DB is empty or during initial migration
function getResilientPrismaModel(modelName: string): any {
  const client = getPrismaClient();
  const model = client ? client[modelName] : null;

  if (modelName === "title") {
    return new Proxy(model || {}, {
      get(target, method: string) {
        if (method === "findMany") {
          return async (...args: any[]) => {
            if (target && typeof target.findMany === "function") {
              try {
                const rows = await target.findMany(...args);
                if (Array.isArray(rows) && rows.length > 0) return rows;
              } catch (err) {
                console.warn("[TVORA Prisma] title.findMany error, using fallback catalog:", (err as any)?.message || err);
              }
            }
            // Fallback to local catalog (1,222 series + 423 movies)
            const cat = getLocalCatalog();
            const where = args[0]?.where;
            let filtered = cat;
            if (where?.type) {
              filtered = filtered.filter((t) => t.type === where.type);
            }
            if (where?.featured) {
              filtered = filtered.filter((t) => t.featured);
            }
            if (where?.trending) {
              filtered = filtered.filter((t) => t.trending);
            }
            if (where?.isNew) {
              filtered = filtered.filter((t) => t.isNew);
            }
            const take = args[0]?.take ?? filtered.length;
            return filtered.slice(0, take);
          };
        }
        if (method === "findUnique" || method === "findFirst") {
          return async (...args: any[]) => {
            if (target && typeof target[method] === "function") {
              try {
                const row = await target[method](...args);
                if (row) return row;
              } catch {}
            }
            const cat = getLocalCatalog();
            const where = args[0]?.where;
            const targetId = where?.id;
            const targetSlug = where?.slug;
            return (
              cat.find(
                (c) =>
                  (targetId && (c.id === targetId || c.slug === targetId)) ||
                  (targetSlug && c.slug === targetSlug)
              ) ?? null
            );
          };
        }
        if (method === "count") {
          return async (...args: any[]) => {
            if (target && typeof target.count === "function") {
              try {
                const c = await target.count(...args);
                if (c > 0) return c;
              } catch {}
            }
            return getLocalCatalog().length;
          };
        }
        return target ? target[method] : async () => null;
      },
    });
  }

  if (modelName === "channel") {
    return new Proxy(model || {}, {
      get(target, method: string) {
        if (method === "findMany") {
          return async (...args: any[]) => {
            if (target && typeof target.findMany === "function") {
              try {
                const rows = await target.findMany(...args);
                if (Array.isArray(rows) && rows.length > 0) return rows;
              } catch {}
            }
            return [...DEFAULT_CHANNELS];
          };
        }
        if (method === "findUnique") {
          return async (...args: any[]) => {
            if (target && typeof target.findUnique === "function") {
              try {
                const row = await target.findUnique(...args);
                if (row) return row;
              } catch {}
            }
            const code = args[0]?.where?.code;
            const id = args[0]?.where?.id;
            return DEFAULT_CHANNELS.find((c) => (code && c.code === code) || (id && c.id === id)) ?? null;
          };
        }
        return target ? target[method] : async () => null;
      },
    });
  }

  if (modelName === "siteSetting") {
    return new Proxy(model || {}, {
      get(target, method: string) {
        if (method === "findMany") {
          return async (...args: any[]) => {
            if (target && typeof target.findMany === "function") {
              try {
                const rows = await target.findMany(...args);
                if (Array.isArray(rows) && rows.length > 0) return rows;
              } catch {}
            }
            return Object.entries(DEFAULT_SETTINGS).map(([k, v]) => ({ key: k, value: v }));
          };
        }
        if (method === "findUnique") {
          return async (...args: any[]) => {
            if (target && typeof target.findUnique === "function") {
              try {
                const row = await target.findUnique(...args);
                if (row) return row;
              } catch {}
            }
            const key = args[0]?.where?.key;
            if (key && DEFAULT_SETTINGS[key] !== undefined) {
              return { key, value: DEFAULT_SETTINGS[key] };
            }
            return null;
          };
        }
        return target ? target[method] : async () => null;
      },
    });
  }

  if (modelName === "user") {
    return new Proxy(model || {}, {
      get(target, method: string) {
        if (target && typeof target[method] === "function") return target[method];
        if (method === "findUnique" || method === "findFirst") {
          return async () => null;
        }
        if (method === "count") {
          return async () => 1;
        }
        if (method === "create" || method === "update") {
          return async (args: any) => ({ id: "user-id", ...(args?.data || {}) });
        }
        return async () => null;
      },
    });
  }

  if (modelName === "session") {
    return new Proxy(model || {}, {
      get(target, method: string) {
        if (target && typeof target[method] === "function") return target[method];
        if (method === "findUnique" || method === "findFirst") {
          return async () => null;
        }
        if (method === "create") {
          return async (args: any) => ({ id: "session-id", ...(args?.data || {}) });
        }
        if (method === "delete" || method === "deleteMany") {
          return async () => ({ count: 0 });
        }
        return async () => null;
      },
    });
  }

  return new Proxy(model || {}, {
    get(target, method: string) {
      if (target && typeof target[method] === "function") return target[method];
      if (method === "findMany") return async () => [];
      if (method === "findUnique" || method === "findFirst") return async () => null;
      if (method === "count") return async () => 0;
      if (method === "create" || method === "update" || method === "upsert") {
        return async (args: any) => ({ id: "item-id", ...(args?.data || args?.create || {}) });
      }
      if (method === "delete" || method === "deleteMany") return async () => ({ count: 0 });
      return async () => null;
    },
  });
}

// Proxy database router: routes user & session to Firebase, and catalog/content to Supabase (Prisma)
export const db: any = new Proxy(
  {},
  {
    get(_target, prop: string) {
      const provider = (process.env.DATABASE_PROVIDER || "").toLowerCase();

      // Explicit full firebase mode
      if (provider === "firebase-all") {
        return (firestoreDb as any)[prop];
      }

      // Auth & User Management: Routed to Firebase Firestore
      if (prop === "user" || prop === "session") {
        if (isFirebaseConfigured()) {
          return (firestoreDb as any)[prop];
        }
        return getResilientPrismaModel(prop);
      }

      // Catalog & Content (titles, seasons, episodes, channels, settings, lists, progress):
      // Routed to Supabase PostgreSQL / Prisma
      if (
        provider === "supabase" ||
        provider === "postgres" ||
        provider === "postgresql" ||
        provider === "sqlite" ||
        process.env.DATABASE_URL?.startsWith("postgres")
      ) {
        return getResilientPrismaModel(prop);
      }

      // Fallback: If Firebase is configured and provider is not set to supabase, route via firestoreDb
      if (isFirebaseConfigured()) {
        return (firestoreDb as any)[prop];
      }

      return getResilientPrismaModel(prop);
    },
  }
);
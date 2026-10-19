// TVORA unified database router
// Hybrid architecture:
// - Authentication & Users: Managed via Google Firebase Firestore (user, session)
// - Content & Catalog: Managed via Supabase PostgreSQL / Prisma (title, season, episode, channel, siteSetting, etc.)
// - Resilient zero-downtime fallback to local catalog & channels for 100% uptime
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
  schemaInitialized?: boolean;
};

// Asynchronously ensure Supabase PostgreSQL tables exist without blocking requests
async function ensureSupabaseTables(prismaClient: any) {
  if (globalForPrisma.schemaInitialized) return;
  globalForPrisma.schemaInitialized = true;

  if (!prismaClient || typeof prismaClient.$executeRawUnsafe !== "function") return;

  try {
    const statements = [
      `CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT PRIMARY KEY,
        "email" TEXT UNIQUE NOT NULL,
        "name" TEXT,
        "passwordHash" TEXT NOT NULL,
        "role" TEXT NOT NULL DEFAULT 'user',
        "preferredLanguage" TEXT NOT NULL DEFAULT 'ar',
        "plan" TEXT NOT NULL DEFAULT 'free',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS "Session" (
        "id" TEXT PRIMARY KEY,
        "token" TEXT UNIQUE NOT NULL,
        "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS "Title" (
        "id" TEXT PRIMARY KEY,
        "slug" TEXT UNIQUE NOT NULL,
        "type" TEXT NOT NULL,
        "titleAr" TEXT NOT NULL,
        "titleEn" TEXT NOT NULL,
        "originalTitle" TEXT,
        "synopsisAr" TEXT NOT NULL DEFAULT '',
        "synopsisEn" TEXT NOT NULL DEFAULT '',
        "posterUrl" TEXT,
        "backdropUrl" TEXT,
        "releaseYear" INTEGER NOT NULL,
        "releaseDate" TEXT,
        "genres" TEXT NOT NULL DEFAULT '[]',
        "runtime" INTEGER,
        "rating" DOUBLE PRECISION,
        "ratingSource" TEXT NOT NULL DEFAULT 'TVORA Editorial',
        "ageRating" TEXT,
        "featured" BOOLEAN NOT NULL DEFAULT false,
        "trending" BOOLEAN NOT NULL DEFAULT false,
        "isNew" BOOLEAN NOT NULL DEFAULT false,
        "premium" BOOLEAN NOT NULL DEFAULT false,
        "visible" BOOLEAN NOT NULL DEFAULT true,
        "director" TEXT,
        "cast" TEXT NOT NULL DEFAULT '[]',
        "country" TEXT,
        "contentLang" TEXT,
        "trailerUrl" TEXT,
        "playbackType" TEXT NOT NULL DEFAULT 'demo',
        "playbackUrl" TEXT,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS "Season" (
        "id" TEXT PRIMARY KEY,
        "titleId" TEXT NOT NULL REFERENCES "Title"("id") ON DELETE CASCADE,
        "number" INTEGER NOT NULL,
        "titleAr" TEXT,
        "titleEn" TEXT,
        CONSTRAINT "Season_titleId_number_key" UNIQUE ("titleId", "number")
      )`,
      `CREATE TABLE IF NOT EXISTS "Episode" (
        "id" TEXT PRIMARY KEY,
        "seasonId" TEXT NOT NULL REFERENCES "Season"("id") ON DELETE CASCADE,
        "titleId" TEXT NOT NULL REFERENCES "Title"("id") ON DELETE CASCADE,
        "number" INTEGER NOT NULL,
        "titleAr" TEXT NOT NULL,
        "titleEn" TEXT NOT NULL,
        "synopsisAr" TEXT NOT NULL DEFAULT '',
        "synopsisEn" TEXT NOT NULL DEFAULT '',
        "runtime" INTEGER,
        "thumbnailUrl" TEXT,
        "playbackType" TEXT NOT NULL DEFAULT 'demo',
        "playbackUrl" TEXT,
        "stillSeed" TEXT,
        CONSTRAINT "Episode_seasonId_number_key" UNIQUE ("seasonId", "number")
      )`,
      `CREATE TABLE IF NOT EXISTS "Channel" (
        "id" TEXT PRIMARY KEY,
        "code" TEXT UNIQUE NOT NULL,
        "nameAr" TEXT NOT NULL,
        "nameEn" TEXT NOT NULL,
        "category" TEXT NOT NULL DEFAULT 'general',
        "descriptionAr" TEXT NOT NULL DEFAULT '',
        "descriptionEn" TEXT NOT NULL DEFAULT '',
        "nowPlayingAr" TEXT NOT NULL DEFAULT '',
        "nowPlayingEn" TEXT NOT NULL DEFAULT '',
        "colorA" TEXT NOT NULL DEFAULT '#9fb7cb',
        "colorB" TEXT NOT NULL DEFAULT '#171719',
        "quality" TEXT NOT NULL DEFAULT 'HD',
        "streamType" TEXT NOT NULL DEFAULT 'demo',
        "streamUrl" TEXT,
        "visible" BOOLEAN NOT NULL DEFAULT true,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS "UserList" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT REFERENCES "User"("id") ON DELETE CASCADE,
        "deviceId" TEXT,
        "titleId" TEXT NOT NULL REFERENCES "Title"("id") ON DELETE CASCADE,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS "WatchProgress" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT REFERENCES "User"("id") ON DELETE CASCADE,
        "deviceId" TEXT,
        "titleId" TEXT NOT NULL REFERENCES "Title"("id") ON DELETE CASCADE,
        "episodeId" TEXT REFERENCES "Episode"("id") ON DELETE CASCADE,
        "positionSeconds" INTEGER NOT NULL DEFAULT 0,
        "durationSeconds" INTEGER NOT NULL DEFAULT 0,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS "SiteSetting" (
        "key" TEXT PRIMARY KEY,
        "value" TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS "Title_type_visible_idx" ON "Title"("type", "visible")`,
      `CREATE INDEX IF NOT EXISTS "Title_featured_idx" ON "Title"("featured")`,
      `CREATE INDEX IF NOT EXISTS "Episode_titleId_idx" ON "Episode"("titleId")`,
      `CREATE INDEX IF NOT EXISTS "Channel_visible_sortOrder_idx" ON "Channel"("visible", "sortOrder")`,
      `CREATE INDEX IF NOT EXISTS "Channel_category_idx" ON "Channel"("category")`,
      `CREATE INDEX IF NOT EXISTS "UserList_userId_idx" ON "UserList"("userId")`,
      `CREATE INDEX IF NOT EXISTS "WatchProgress_userId_idx" ON "WatchProgress"("userId")`,
    ];

    let successCount = 0;
    for (const stmt of statements) {
      try {
        await prismaClient.$executeRawUnsafe(stmt);
        successCount++;
      } catch (stmtErr: any) {
        console.warn("[TVORA DB] DDL notice:", stmtErr?.message || stmtErr);
      }
    }

    console.log(`[TVORA DB] Supabase PostgreSQL tables verified/created successfully (${successCount}/${statements.length} operations).`);

    // Seed default channels if empty
    try {
      const channelCount = await prismaClient.channel.count();
      if (channelCount === 0) {
        for (const ch of DEFAULT_CHANNELS) {
          await prismaClient.channel.create({ data: ch }).catch(() => {});
        }
        console.log("[TVORA DB] Default channels initialized in Supabase.");
      }
    } catch {}

    // Seed default site settings if empty
    try {
      const settingCount = await prismaClient.siteSetting.count();
      if (settingCount === 0) {
        for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
          await prismaClient.siteSetting.upsert({
            where: { key },
            create: { key, value },
            update: {},
          }).catch(() => {});
        }
        console.log("[TVORA DB] Default site settings initialized in Supabase.");
      }
    } catch {}
  } catch (err: any) {
    console.warn("[TVORA DB] Supabase table auto-provision notice:", err?.message || err);
  }
}

function getPrismaClient(): any {
  if (!globalForPrisma.prisma) {
    const PrismaClass = getPrismaClientClass();
    if (PrismaClass) {
      globalForPrisma.prisma = new PrismaClass({
        log: ["warn"],
      });
      // Trigger background schema provisioning
      ensureSupabaseTables(globalForPrisma.prisma).catch(() => {});
    }
  }
  return globalForPrisma.prisma;
}

function filterCatalog(catalog: any[], where?: any, orderBy?: any, skip?: number, take?: number): any[] {
  let list = [...catalog];

  if (where) {
    if (where.type) {
      list = list.filter((item) => item.type === where.type);
    }
    if (where.visible !== undefined) {
      list = list.filter((item) => Boolean(item.visible) === Boolean(where.visible));
    }
    if (where.featured) {
      const feat = list.filter((item) => item.featured);
      list = feat.length > 0 ? feat : list.slice(0, 10);
    }
    if (where.trending) {
      list = list.filter((item) => item.trending);
    }
    if (where.isNew) {
      list = list.filter((item) => item.isNew);
    }
    if (where.releaseYear !== undefined) {
      const targetYear = typeof where.releaseYear === "object" ? where.releaseYear.equals ?? where.releaseYear.gte : where.releaseYear;
      if (typeof targetYear === "number") {
        list = list.filter((item) => item.releaseYear === targetYear);
      }
    }
    if (where.rating) {
      if (where.rating.not === null) {
        list = list.filter((item) => item.rating != null);
      } else if (typeof where.rating.gte === "number") {
        list = list.filter((item) => item.rating != null && item.rating >= where.rating.gte);
      }
    }
    if (where.genres?.contains) {
      const targetGenre = where.genres.contains.toLowerCase();
      list = list.filter((item) => {
        const gStr = typeof item.genres === "string" ? item.genres.toLowerCase() : JSON.stringify(item.genres || []).toLowerCase();
        if (gStr.includes(targetGenre)) return true;
        const text = `${item.titleAr || ""} ${item.titleEn || ""} ${item.synopsisAr || ""}`.toLowerCase();
        return text.includes(targetGenre);
      });
    }
    if (where.country) {
      if (Array.isArray(where.country.in)) {
        const allowed = where.country.in.map((c: string) => c.toLowerCase());
        list = list.filter((item) => item.country && allowed.includes(item.country.toLowerCase()));
      } else if (typeof where.country === "string") {
        list = list.filter((item) => item.country && item.country.toLowerCase() === where.country.toLowerCase());
      }
    }
    if (Array.isArray(where.OR) && where.OR.length > 0) {
      list = list.filter((item) => {
        return where.OR.some((cond: any) => {
          if (cond.titleAr?.contains) {
            const q = cond.titleAr.contains.toLowerCase();
            if (item.titleAr && item.titleAr.toLowerCase().includes(q)) return true;
          }
          if (cond.titleEn?.contains) {
            const q = cond.titleEn.contains.toLowerCase();
            if (item.titleEn && item.titleEn.toLowerCase().includes(q)) return true;
          }
          if (cond.originalTitle?.contains) {
            const q = cond.originalTitle.contains.toLowerCase();
            if (item.originalTitle && item.originalTitle.toLowerCase().includes(q)) return true;
          }
          if (cond.genres?.contains) {
            const targetGenre = cond.genres.contains.toLowerCase();
            const gStr = typeof item.genres === "string" ? item.genres.toLowerCase() : JSON.stringify(item.genres || []).toLowerCase();
            if (gStr.includes(targetGenre)) return true;
          }
          if (cond.country) {
            if (Array.isArray(cond.country.in)) {
              const allowed = cond.country.in.map((c: string) => c.toLowerCase());
              if (item.country && allowed.includes(item.country.toLowerCase())) return true;
            }
          }
          return false;
        });
      });
    }
  }

  if (orderBy) {
    const orderRules = Array.isArray(orderBy) ? orderBy : [orderBy];
    for (const rule of orderRules) {
      if (rule.rating) {
        const dir = rule.rating === "asc" ? 1 : -1;
        list.sort((a, b) => ((a.rating || 0) - (b.rating || 0)) * dir);
        break;
      }
      if (rule.releaseYear) {
        const dir = rule.releaseYear === "asc" ? 1 : -1;
        list.sort((a, b) => ((a.releaseYear || 0) - (b.releaseYear || 0)) * dir);
        break;
      }
      if (rule.titleEn) {
        const dir = rule.titleEn === "desc" ? -1 : 1;
        list.sort((a, b) => (a.titleEn || "").localeCompare(b.titleEn || "") * dir);
        break;
      }
      if (rule.titleAr) {
        const dir = rule.titleAr === "desc" ? -1 : 1;
        list.sort((a, b) => (a.titleAr || "").localeCompare(b.titleAr || "") * dir);
        break;
      }
    }
  }

  const s = skip ?? 0;
  const t = take ?? list.length;
  return list.slice(s, s + t);
}

/**
 * Resilient Prisma Proxy that guarantees 100% uptime:
 * - Tries live Supabase DB first
 * - Gracefully falls back to embedded 3isk catalog, default channels, and memory store
 * - Completely prevents missing table or connection errors from breaking any page
 */
function getResilientPrismaModel(modelName: string): any {
  const client = getPrismaClient();
  const target = client ? client[modelName] : null;

  if (modelName === "title") {
    return new Proxy(target || {}, {
      get(_t, method: string) {
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
            const where = args[0]?.where;
            const orderBy = args[0]?.orderBy;
            const skip = args[0]?.skip;
            const take = args[0]?.take;
            return filterCatalog(getLocalCatalog(), where, orderBy, skip, take);
          };
        }

        if (method === "findUnique" || method === "findFirst") {
          return async (...args: any[]) => {
            if (target && typeof target[method] === "function") {
              try {
                const row = await target[method](...args);
                if (row) return row;
              } catch (err) {
                console.warn("[TVORA Prisma] title query error, using fallback catalog:", (err as any)?.message || err);
              }
            }
            const cat = getLocalCatalog();
            const where = args[0]?.where;
            let targetId = where?.id;
            let targetSlug = where?.slug;

            // Handle OR conditions like [{ id }, { slug: id }]
            if (Array.isArray(where?.OR)) {
              for (const cond of where.OR) {
                if (cond.id) targetId = cond.id;
                if (cond.slug) targetSlug = cond.slug;
              }
            }

            const cleanId = (targetId || "").toLowerCase();
            const cleanSlug = (targetSlug || "").toLowerCase();

            const found = cat.find((c) => {
              const cId = (c.id || "").toLowerCase();
              const cSlug = (c.slug || "").toLowerCase();

              if (cleanId) {
                if (cId === cleanId || cSlug === cleanId) return true;
                if (cId === `ser_${cleanId}` || cId === `mov_${cleanId}`) return true;
                if (cSlug === cleanId.replace(/^(?:ser|mov)_/, "")) return true;
              }
              if (cleanSlug) {
                if (cSlug === cleanSlug || cId === cleanSlug) return true;
                if (cId === `ser_${cleanSlug}` || cId === `mov_${cleanSlug}`) return true;
                if (cSlug === cleanSlug.replace(/^(?:ser|mov)_/, "")) return true;
              }
              return false;
            });

            if (found) {
              return {
                ...found,
                _count: { seasons: Array.isArray(found.seasons) ? found.seasons.length : 1 },
              };
            }
            return null;
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
            const where = args[0]?.where;
            return filterCatalog(getLocalCatalog(), where).length;
          };
        }

        return async (...args: any[]) => {
          if (target && typeof target[method] === "function") {
            try {
              return await target[method](...args);
            } catch {}
          }
          return null;
        };
      },
    });
  }

  if (modelName === "episode") {
    return new Proxy(target || {}, {
      get(_t, method: string) {
        if (method === "findUnique" || method === "findFirst") {
          return async (...args: any[]) => {
            if (target && typeof target[method] === "function") {
              try {
                const row = await target[method](...args);
                if (row) return row;
              } catch {}
            }
            const where = args[0]?.where;
            const epId = where?.id;
            const epNumber = where?.seasonId_number?.number ?? where?.number;
            const cat = getLocalCatalog();

            for (const item of cat) {
              if (Array.isArray(item.seasons)) {
                for (const sea of item.seasons) {
                  if (Array.isArray(sea.episodes)) {
                    for (const ep of sea.episodes) {
                      if (epId && (ep.id === epId || ep.id === `ep_${epId}`)) return ep;
                      if (epNumber && ep.number === epNumber) return ep;
                    }
                  }
                }
              }
            }
            return null;
          };
        }

        if (method === "findMany") {
          return async (...args: any[]) => {
            if (target && typeof target.findMany === "function") {
              try {
                const rows = await target.findMany(...args);
                if (Array.isArray(rows) && rows.length > 0) return rows;
              } catch {}
            }
            return [];
          };
        }

        return async (...args: any[]) => {
          if (target && typeof target[method] === "function") {
            try {
              return await target[method](...args);
            } catch {}
          }
          return { id: "ep_mock", number: 1, ...(args[0]?.data || args[0]?.create || {}) };
        };
      },
    });
  }

  if (modelName === "season") {
    return new Proxy(target || {}, {
      get(_t, method: string) {
        if (method === "findUnique" || method === "findFirst") {
          return async (...args: any[]) => {
            if (target && typeof target[method] === "function") {
              try {
                const row = await target[method](...args);
                if (row) return row;
              } catch {}
            }
            return { id: "sea_1", number: 1, titleAr: "الموسم 1", titleEn: "Season 1" };
          };
        }

        if (method === "findMany") {
          return async (...args: any[]) => {
            if (target && typeof target.findMany === "function") {
              try {
                const rows = await target.findMany(...args);
                if (Array.isArray(rows) && rows.length > 0) return rows;
              } catch {}
            }
            return [{ id: "sea_1", number: 1, titleAr: "الموسم 1", titleEn: "Season 1" }];
          };
        }

        return async (...args: any[]) => {
          if (target && typeof target[method] === "function") {
            try {
              return await target[method](...args);
            } catch {}
          }
          return { id: "sea_mock", number: 1, ...(args[0]?.data || args[0]?.create || {}) };
        };
      },
    });
  }

  if (modelName === "channel") {
    return new Proxy(target || {}, {
      get(_t, method: string) {
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
        if (method === "findUnique" || method === "findFirst") {
          return async (...args: any[]) => {
            if (target && typeof target[method] === "function") {
              try {
                const row = await target[method](...args);
                if (row) return row;
              } catch {}
            }
            const code = args[0]?.where?.code;
            const id = args[0]?.where?.id;
            return DEFAULT_CHANNELS.find((c) => (code && c.code === code) || (id && c.id === id)) ?? null;
          };
        }
        return async (...args: any[]) => {
          if (target && typeof target[method] === "function") {
            try {
              return await target[method](...args);
            } catch {}
          }
          return null;
        };
      },
    });
  }

  if (modelName === "siteSetting") {
    return new Proxy(target || {}, {
      get(_t, method: string) {
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
        if (method === "findUnique" || method === "findFirst") {
          return async (...args: any[]) => {
            if (target && typeof target[method] === "function") {
              try {
                const row = await target[method](...args);
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
        return async (...args: any[]) => {
          if (target && typeof target[method] === "function") {
            try {
              return await target[method](...args);
            } catch {}
          }
          return null;
        };
      },
    });
  }

  if (modelName === "userList") {
    return new Proxy(target || {}, {
      get(_t, method: string) {
        if (method === "findMany") {
          return async (...args: any[]) => {
            if (target && typeof target.findMany === "function") {
              try {
                return await target.findMany(...args);
              } catch {}
            }
            return [];
          };
        }
        if (method === "findUnique" || method === "findFirst") {
          return async (...args: any[]) => {
            if (target && typeof target[method] === "function") {
              try {
                return await target[method](...args);
              } catch {}
            }
            return null;
          };
        }
        if (method === "create" || method === "upsert") {
          return async (...args: any[]) => {
            if (target && typeof target[method] === "function") {
              try {
                return await target[method](...args);
              } catch {}
            }
            return { id: "list_guest", ...(args[0]?.data || {}) };
          };
        }
        if (method === "delete" || method === "deleteMany") {
          return async (...args: any[]) => {
            if (target && typeof target[method] === "function") {
              try {
                return await target[method](...args);
              } catch {}
            }
            return { count: 1 };
          };
        }
        return async () => null;
      },
    });
  }

  if (modelName === "watchProgress") {
    return new Proxy(target || {}, {
      get(_t, method: string) {
        if (method === "findMany") {
          return async (...args: any[]) => {
            if (target && typeof target.findMany === "function") {
              try {
                return await target.findMany(...args);
              } catch {}
            }
            return [];
          };
        }
        if (method === "findUnique" || method === "findFirst") {
          return async (...args: any[]) => {
            if (target && typeof target[method] === "function") {
              try {
                return await target[method](...args);
              } catch {}
            }
            return null;
          };
        }
        if (method === "upsert" || method === "create") {
          return async (...args: any[]) => {
            if (target && typeof target[method] === "function") {
              try {
                return await target[method](...args);
              } catch {}
            }
            return { id: "prog_guest", ...(args[0]?.data || args[0]?.create || {}) };
          };
        }
        return async () => null;
      },
    });
  }

  // Generic fallback proxy for any other model
  return new Proxy(target || {}, {
    get(_t, method: string) {
      return async (...args: any[]) => {
        if (target && typeof target[method] === "function") {
          try {
            return await target[method](...args);
          } catch {}
        }
        if (method === "findMany") return [];
        if (method === "findUnique" || method === "findFirst") return null;
        if (method === "count") return 0;
        if (method === "create" || method === "update" || method === "upsert") {
          return { id: "item-id", ...(args[0]?.data || args[0]?.create || {}) };
        }
        if (method === "delete" || method === "deleteMany") return { count: 0 };
        return null;
      };
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
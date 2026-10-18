// TVORA Firestore Database Adapter
// Provides a Prisma-compatible API backed by Google Cloud Firestore (Firebase Admin)
// Includes quota exhaustion circuit breaker and resilient fallback to local catalog & default data
import { getFirestoreDb } from "./firebase-admin";
import * as fsModule from "fs";
import * as pathModule from "path";
import * as zlibModule from "zlib";

type Dict = Record<string, any>;

// ── Quota Exhaustion Circuit Breaker ──────────────────────────────────────────
let _quotaBlockedUntil = 0;

function isQuotaError(err: any): boolean {
  if (!err) return false;
  const msg = String(err.message || err.details || err || "");
  const code = err.code;
  if (code === 8 || code === "8" || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("Quota exceeded")) {
    // Back off Firestore requests for 5 minutes to avoid slamming API
    _quotaBlockedUntil = Date.now() + 5 * 60 * 1000;
    console.warn("[TVORA Firestore] Quota limit reached (RESOURCE_EXHAUSTED). Falling back to local data.");
    return true;
  }
  return false;
}

function shouldSkipFirestore(): boolean {
  return Date.now() < _quotaBlockedUntil;
}

// ── Default Fallback Channels ────────────────────────────────────────────────
const DEFAULT_CHANNELS: Dict[] = [
  {
    id: "ch-sports-1",
    code: "TVORA-SPORTS-1",
    nameAr: "تڤورا سبورت 1",
    nameEn: "TVORA Sports 1",
    category: "sports",
    colorA: "#C8A24B",
    colorB: "#151310",
    quality: "4K",
    descriptionAr: "القناة الرياضية الأولى — أبرز المباريات والبطولات على مدار الساعة.",
    descriptionEn: "The flagship sports channel — top matches and tournaments around the clock.",
    nowPlayingAr: "ملخص الجولة الكبرى — تحليل واستوديو",
    nowPlayingEn: "Round of the week — highlights & studio analysis",
    streamType: "demo",
    streamUrl: "/media/demo-match.mp4",
    visible: true,
    sortOrder: 1,
  },
  {
    id: "ch-sports-2",
    code: "TVORA-SPORTS-2",
    nameAr: "تڤورا سبورت 2",
    nameEn: "TVORA Sports 2",
    category: "sports",
    colorA: "#D97742",
    colorB: "#171009",
    quality: "HD",
    descriptionAr: "البطولات القارية والاستوديوهات التحليلية الليلية.",
    descriptionEn: "Continental tournaments and late-night analysis studios.",
    nowPlayingAr: "استوديو ما قبل المباراة",
    nowPlayingEn: "Pre-match studio",
    streamType: "demo",
    streamUrl: "/media/demo-match.mp4",
    visible: true,
    sortOrder: 2,
  },
  {
    id: "ch-sports-iq",
    code: "TVORA-SPORTS-IQ",
    nameAr: "تڤورا سبورت العراق",
    nameEn: "TVORA Sports Iraq",
    category: "sports",
    colorA: "#4E9B6F",
    colorB: "#0B120E",
    quality: "HD",
    descriptionAr: "الكرة العراقية أولاً — الدوري المحلي والمنتخب.",
    descriptionEn: "Iraqi football first — the local league and the national team.",
    nowPlayingAr: "أهداف الدوري العراقي — الموسم الحالي",
    nowPlayingEn: "Iraq Stars League goals — current season",
    streamType: "demo",
    streamUrl: "/media/demo-match.mp4",
    visible: true,
    sortOrder: 3,
  },
  {
    id: "ch-cinema",
    code: "TVORA-CINEMA",
    nameAr: "تڤورا سينما",
    nameEn: "TVORA Cinema",
    category: "movies",
    colorA: "#9A8FC2",
    colorB: "#0F0E14",
    quality: "4K",
    descriptionAr: "أفلام العالم الأولى — عروض أولى كل ليلة.",
    descriptionEn: "World cinema premieres — a new first-run film every night.",
    nowPlayingAr: "فيلم الليلة: ملحمة الصحراء",
    nowPlayingEn: "Tonight: Sands of the Epic",
    streamType: "demo",
    streamUrl: "/media/demo-film.mp4",
    visible: true,
    sortOrder: 4,
  },
  {
    id: "ch-action",
    code: "TVORA-ACTION",
    nameAr: "تڤورا أكشن",
    nameEn: "TVORA Action",
    category: "movies",
    colorA: "#C25B5B",
    colorB: "#150C0C",
    quality: "HD",
    descriptionAr: "أكشن لا يتوقف — مطاردات وانفجارات وقصص انتقام.",
    descriptionEn: "Non-stop action — chases, explosions and revenge stories.",
    nowPlayingAr: "ماراثون الأكشن — أربع أفلام متتالية",
    nowPlayingEn: "Action marathon — four films back to back",
    streamType: "demo",
    streamUrl: "/media/demo-film.mp4",
    visible: true,
    sortOrder: 5,
  },
  {
    id: "ch-classics",
    code: "TVORA-CLASSICS",
    nameAr: "تڤورا كلاسيك",
    nameEn: "TVORA Classics",
    category: "movies",
    colorA: "#B08A50",
    colorB: "#131009",
    quality: "HD",
    descriptionAr: "الكنوز السينمائية من كل العصور، مُرممة بجودة عالية.",
    descriptionEn: "Cinematic treasures from every era, remastered in high quality.",
    nowPlayingAr: "كلاسيكيات الأربعينيات",
    nowPlayingEn: "Forties classics",
    streamType: "demo",
    streamUrl: "/media/demo-film.mp4",
    visible: true,
    sortOrder: 6,
  },
  {
    id: "ch-drama",
    code: "TVORA-DRAMA",
    nameAr: "تڤورا دراما",
    nameEn: "TVORA Drama",
    category: "series",
    colorA: "#8FB8D8",
    colorB: "#0C1014",
    quality: "HD",
    descriptionAr: "مسلسلات درامية عالمية بترجمة احترافية وحلقات أولاً بأول.",
    descriptionEn: "Global drama series with professional subtitles and weekly episodes.",
    nowPlayingAr: "الموسم الجديد: أزقة الأندلس",
    nowPlayingEn: "New season: Alleys of Andalus",
    streamType: "demo",
    streamUrl: "/media/demo-film.mp4",
    visible: true,
    sortOrder: 7,
  },
  {
    id: "ch-turkish",
    code: "TVORA-TURKISH",
    nameAr: "تڤورا تركي",
    nameEn: "TVORA Turkish",
    category: "series",
    colorA: "#B04A4A",
    colorB: "#140B0B",
    quality: "HD",
    descriptionAr: "أشهر المسلسلات التركية المدبلجة والمترجمة.",
    descriptionEn: "The most beloved Turkish series, dubbed and subtitled.",
    nowPlayingAr: "حكاية البوسفور — الحلقة 14",
    nowPlayingEn: "Bosphorus Tale — Episode 14",
    streamType: "demo",
    streamUrl: "/media/demo-film.mp4",
    visible: true,
    sortOrder: 8,
  },
  {
    id: "ch-korean",
    code: "TVORA-KOREAN",
    nameAr: "تڤورا كوري",
    nameEn: "TVORA Korean",
    category: "series",
    colorA: "#7FB09E",
    colorB: "#0B1210",
    quality: "HD",
    descriptionAr: "موجة الكوريين — رومانسي وإثارة ودراما ملكية.",
    descriptionEn: "The Korean wave — romance, thrillers and royal dramas.",
    nowPlayingAr: "ماراثون نهاية الأسبوع",
    nowPlayingEn: "Weekend binge marathon",
    streamType: "demo",
    streamUrl: "/media/demo-film.mp4",
    visible: true,
    sortOrder: 9,
  },
  {
    id: "ch-kids",
    code: "TVORA-KIDS",
    nameAr: "تڤورا كيدز",
    nameEn: "TVORA Kids",
    category: "kids",
    colorA: "#D8A24B",
    colorB: "#151007",
    quality: "HD",
    descriptionAr: "رسوم متحركة وبرامج آمنة ومرحة لكل الأعمار.",
    descriptionEn: "Safe, joyful animation and shows for every age.",
    nowPlayingAr: "سلسلة مغامرات الفضاء",
    nowPlayingEn: "Space adventures series",
    streamType: "demo",
    streamUrl: "/media/demo-film.mp4",
    visible: true,
    sortOrder: 10,
  },
  {
    id: "ch-docu",
    code: "TVORA-DOCU",
    nameAr: "تڤورا وثائقي",
    nameEn: "TVORA Docu",
    category: "documentary",
    colorA: "#9FB7CB",
    colorB: "#0C0F12",
    quality: "4K",
    descriptionAr: "وثائقيات تاريخ وعلوم وحضارات بجودة فائقة.",
    descriptionEn: "History, science and civilizations documentaries in ultra HD.",
    nowPlayingAr: "أسرار المحيط العميق",
    nowPlayingEn: "Secrets of the deep ocean",
    streamType: "demo",
    streamUrl: "/media/demo-film.mp4",
    visible: true,
    sortOrder: 11,
  },
  {
    id: "ch-news",
    code: "TVORA-NEWS",
    nameAr: "تڤورا نيوز",
    nameEn: "TVORA News",
    category: "news",
    colorA: "#B8B8BE",
    colorB: "#101012",
    quality: "HD",
    descriptionAr: "أخبار العالم والعربية كل ساعة، بلا توقف.",
    descriptionEn: "World and Arab news every hour, around the clock.",
    nowPlayingAr: "نشرة الأخبار الرئيسية",
    nowPlayingEn: "Main evening bulletin",
    streamType: "demo",
    streamUrl: "/media/demo-film.mp4",
    visible: true,
    sortOrder: 12,
  },
  {
    id: "ch-music",
    code: "TVORA-MUSIC",
    nameAr: "تڤورا ميوزك",
    nameEn: "TVORA Music",
    category: "music",
    colorA: "#C98FB8",
    colorB: "#130E12",
    quality: "HD",
    descriptionAr: "أغاني عربية وعالمية وكليبات حصرية.",
    descriptionEn: "Arabic and global hits with exclusive videos.",
    nowPlayingAr: "قائمة الأكثر طلباً",
    nowPlayingEn: "Most-requested playlist",
    streamType: "demo",
    streamUrl: "/media/demo-film.mp4",
    visible: true,
    sortOrder: 13,
  },
  {
    id: "ch-one",
    code: "TVORA-ONE",
    nameAr: "تڤورا ون",
    nameEn: "TVORA One",
    category: "general",
    colorA: "#D8C9A3",
    colorB: "#131009",
    quality: "HD",
    descriptionAr: "القناة العامة — ترفيه وحوارات وبرامج فعليات.",
    descriptionEn: "The general channel — entertainment, talk shows and events.",
    nowPlayingAr: "برنامج الضيف — لقاء حصري",
    nowPlayingEn: "The Guest — exclusive interview",
    streamType: "demo",
    streamUrl: "/media/demo-film.mp4",
    visible: true,
    sortOrder: 14,
  },
];

// ── Default Fallback Settings ────────────────────────────────────────────────
const DEFAULT_SETTINGS: Record<string, string> = {
  branding: JSON.stringify({ name: "TVORA", tagline: "Cinema. Series. Live TV Channels." }),
  demoMode: JSON.stringify({ enabled: false, reason: "", tmdbConfigured: true }),
  homepageSections: JSON.stringify(["hero", "trending", "featured", "new", "arabic", "channels", "topRated"]),
  maintenanceMode: JSON.stringify({ enabled: false }),
};

// ── Local Catalog Loader ─────────────────────────────────────────────────────
let _catalogCache: Dict[] | null = null;
function getLocalCatalog(): Dict[] {
  if (_catalogCache) return _catalogCache;
  try {
    const rawPath = pathModule.join(process.cwd(), "data", "3isk_catalog.json");
    const gzPath = pathModule.join(process.cwd(), "data", "3isk_catalog.json.gz");
    let jsonStr = "";
    if (fsModule.existsSync(rawPath)) {
      jsonStr = fsModule.readFileSync(rawPath, "utf-8");
    } else if (fsModule.existsSync(gzPath)) {
      const buffer = fsModule.readFileSync(gzPath);
      jsonStr = zlibModule.gunzipSync(buffer).toString("utf-8");
    }

    if (jsonStr) {
      const raw = JSON.parse(jsonStr);
      const list: Dict[] = [];
      for (const m of Object.values(raw.movies || {})) {
        const movie = m as Dict;
        list.push({
          ...movie,
          genres: typeof movie.genres === "string" ? movie.genres : JSON.stringify(movie.genres || ["أفلام تركية"]),
        });
      }
      for (const s of Object.values(raw.series || {})) {
        const ser = s as Dict;
        list.push({
          ...ser,
          genres: typeof ser.genres === "string" ? ser.genres : JSON.stringify(ser.genres || ["مسلسلات تركية"]),
        });
      }
      _catalogCache = list;
      return list;
    }
  } catch (err) {
    console.error("[TVORA Catalog] Error loading local catalog fallback:", err);
  }
  return [];
}

function matchWhere(docData: Dict, where?: Dict): boolean {
  if (!where) return true;

  for (const [key, cond] of Object.entries(where)) {
    if (key === "OR" && Array.isArray(cond)) {
      const orMatch = cond.some((subWhere) => matchWhere(docData, subWhere));
      if (!orMatch) return false;
      continue;
    }

    if (key === "NOT") {
      if (matchWhere(docData, cond)) return false;
      continue;
    }

    const val = docData[key];

    if (cond === null) {
      if (val !== null && val !== undefined) return false;
      continue;
    }

    if (typeof cond === "object" && cond !== null && !Array.isArray(cond)) {
      if ("contains" in cond) {
        const needle = String(cond.contains).toLowerCase();
        if (Array.isArray(val)) {
          const has = val.some((item) => String(item).toLowerCase().includes(needle));
          if (!has) return false;
        } else if (typeof val === "string") {
          if (!val.toLowerCase().includes(needle)) return false;
        } else {
          return false;
        }
      }
      if ("not" in cond) {
        if (cond.not === null) {
          if (val === null || val === undefined) return false;
        } else if (val === cond.not) {
          return false;
        }
      }
      if ("in" in cond && Array.isArray(cond.in)) {
        if (!cond.in.includes(val)) return false;
      }
      if ("gt" in cond && !(val > cond.gt)) return false;
      if ("gte" in cond && !(val >= cond.gte)) return false;
      if ("lt" in cond && !(val < cond.lt)) return false;
      if ("lte" in cond && !(val <= cond.lte)) return false;
    } else {
      if (val !== cond) return false;
    }
  }

  return true;
}

function sortRows(rows: Dict[], orderBy?: any): Dict[] {
  if (!orderBy) return rows;
  const orderList = Array.isArray(orderBy) ? orderBy : [orderBy];

  return rows.sort((a, b) => {
    for (const order of orderList) {
      for (const [key, direction] of Object.entries(order)) {
        const dir = String(direction).toLowerCase() === "desc" ? -1 : 1;
        const va = a[key];
        const vb = b[key];
        if (va === vb) continue;
        if (va === null || va === undefined) return 1;
        if (vb === null || vb === undefined) return -1;
        if (va < vb) return -1 * dir;
        if (va > vb) return 1 * dir;
      }
    }
    return 0;
  });
}

function cleanDates(data: Dict): Dict {
  const result: Dict = { ...data };
  for (const [k, v] of Object.entries(result)) {
    if (v && typeof v.toDate === "function") {
      result[k] = v.toDate();
    }
  }
  return result;
}

export const firestoreDb = {
  title: {
    async findMany(args: { where?: Dict; orderBy?: any; skip?: number; take?: number; include?: Dict } = {}) {
      let rows: Dict[] = [];
      const fs = getFirestoreDb();
      if (fs && !shouldSkipFirestore()) {
        try {
          const snap = await fs.collection("titles").get();
          rows = snap.docs.map((d) => ({ id: d.id, ...cleanDates(d.data()) }));
        } catch (err) {
          isQuotaError(err);
        }
      }
      if (rows.length === 0) {
        rows = getLocalCatalog();
      }

      if (args.where) {
        rows = rows.filter((r) => matchWhere(r, args.where));
      }

      rows = sortRows(rows, args.orderBy);

      const skip = args.skip ?? 0;
      const take = args.take ?? rows.length;
      const paged = rows.slice(skip, skip + take);

      if (args.include?.seasons || args.include?._count?.select?.seasons) {
        for (const title of paged) {
          if (title.seasons && Array.isArray(title.seasons)) {
            if (args.include?._count?.select?.seasons) {
              title._count = { seasons: title.seasons.length };
            }
          }
        }
        const needsSeasons = paged.filter((t) => !t.seasons);
        if (needsSeasons.length > 0 && fs && !shouldSkipFirestore()) {
          try {
            const seasonsSnap = await fs.collection("seasons").get();
            const allSeasons = seasonsSnap.docs.map((d) => ({ id: d.id, ...cleanDates(d.data()) }));
            const epSnap = args.include?.seasons?.include?.episodes ? await fs.collection("episodes").get() : null;
            const allEps = epSnap ? epSnap.docs.map((d) => ({ id: d.id, ...cleanDates(d.data()) })) : [];

            for (const title of needsSeasons) {
              title.seasons = allSeasons
                .filter((s) => s.titleId === title.id)
                .sort((a, b) => a.number - b.number)
                .map((s) => {
                  if (args.include?.seasons?.include?.episodes) {
                    s.episodes = allEps
                      .filter((e) => e.seasonId === s.id)
                      .sort((a, b) => a.number - b.number);
                  }
                  return s;
                });
              if (args.include?._count?.select?.seasons) {
                title._count = { seasons: title.seasons.length };
              }
            }
          } catch (err) {
            isQuotaError(err);
          }
        }
      }

      return paged;
    },

    async findFirst(args: { where: Dict; include?: Dict }) {
      const rows = await firestoreDb.title.findMany({ where: args.where, include: args.include, take: 1 });
      return rows[0] ?? null;
    },

    async findUnique(args: { where: { id?: string; slug?: string }; include?: Dict }) {
      const fs = getFirestoreDb();
      let title: Dict | null = null;

      if (fs && !shouldSkipFirestore() && args.where.id) {
        try {
          const doc = await fs.collection("titles").doc(args.where.id).get();
          if (doc.exists) {
            title = { id: doc.id, ...cleanDates(doc.data()!) };
          }
        } catch (err) {
          isQuotaError(err);
        }
      }

      if (!title) {
        const cat = getLocalCatalog();
        const targetId = args.where.id;
        const targetSlug = args.where.slug;
        const found = cat.find((c) => (targetId && (c.id === targetId || c.slug === targetId)) || (targetSlug && c.slug === targetSlug));
        if (found) title = { ...found };
      }

      if (!title) return null;

      if (args.include?.seasons) {
        if (title.seasons && Array.isArray(title.seasons) && title.seasons.length > 0) {
          if (args.include._count?.select?.seasons) {
            title._count = { seasons: title.seasons.length };
          }
          return title;
        }
        if (fs && !shouldSkipFirestore()) {
          try {
            const seasonsSnap = await fs.collection("seasons").where("titleId", "==", title.id).get();
            title.seasons = seasonsSnap.docs
              .map((d) => ({ id: d.id, ...cleanDates(d.data()) }))
              .sort((a, b) => a.number - b.number);
            if (args.include.seasons?.include?.episodes) {
              const epSnap = await fs.collection("episodes").where("titleId", "==", title.id).get();
              const allEps = epSnap.docs.map((d) => ({ id: d.id, ...cleanDates(d.data()) }));
              for (const s of title.seasons) {
                s.episodes = allEps.filter((e) => e.seasonId === s.id).sort((a, b) => a.number - b.number);
              }
            }
          } catch (err) {
            isQuotaError(err);
          }
        }
      }

      return title;
    },

    async count(args: { where?: Dict } = {}) {
      const rows = await firestoreDb.title.findMany({ where: args.where });
      return rows.length;
    },

    async create(args: { data: Dict }) {
      const fs = getFirestoreDb();
      if (!fs) throw new Error("Firestore not initialized");
      const id = args.data.id || fs.collection("titles").doc().id;
      const ref = fs.collection("titles").doc(id);
      const data = { ...args.data, id, createdAt: new Date(), updatedAt: new Date() };
      try {
        await ref.set(data);
      } catch (err) {
        if (isQuotaError(err)) return data;
        throw err;
      }
      return data;
    },

    async update(args: { where: { id: string }; data: Dict }) {
      const fs = getFirestoreDb();
      if (!fs) throw new Error("Firestore not initialized");
      const ref = fs.collection("titles").doc(args.where.id);
      const updateData = { ...args.data, updatedAt: new Date() };
      try {
        await ref.set(updateData, { merge: true });
        const updated = await ref.get();
        return { id: updated.id, ...cleanDates(updated.data()!) };
      } catch (err) {
        if (isQuotaError(err)) return { id: args.where.id, ...updateData };
        throw err;
      }
    },

    async delete(args: { where: { id: string } }) {
      const fs = getFirestoreDb();
      if (!fs) return null;
      try {
        await fs.collection("titles").doc(args.where.id).delete();
      } catch (err) {
        isQuotaError(err);
      }
      return { id: args.where.id };
    },

    async deleteMany() {
      const fs = getFirestoreDb();
      if (!fs) return { count: 0 };
      try {
        const snap = await fs.collection("titles").get();
        const batch = fs.batch();
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        return { count: snap.size };
      } catch (err) {
        isQuotaError(err);
        return { count: 0 };
      }
    },
  },

  channel: {
    async findMany(args: { where?: Dict; orderBy?: any } = {}) {
      let rows: Dict[] = [];
      const fs = getFirestoreDb();
      if (fs && !shouldSkipFirestore()) {
        try {
          const snap = await fs.collection("channels").get();
          rows = snap.docs.map((d) => ({ id: d.id, ...cleanDates(d.data()) }));
        } catch (err) {
          isQuotaError(err);
        }
      }
      if (rows.length === 0) {
        rows = [...DEFAULT_CHANNELS];
      }
      if (args.where) rows = rows.filter((r) => matchWhere(r, args.where));
      return sortRows(rows, args.orderBy ?? [{ sortOrder: "asc" }, { nameEn: "asc" }]);
    },

    async findUnique(args: { where: { id?: string; code?: string } }) {
      const fs = getFirestoreDb();
      if (fs && !shouldSkipFirestore()) {
        try {
          if (args.where.id) {
            const doc = await fs.collection("channels").doc(args.where.id).get();
            if (doc.exists) return { id: doc.id, ...cleanDates(doc.data()!) };
          } else if (args.where.code) {
            const snap = await fs.collection("channels").where("code", "==", args.where.code).limit(1).get();
            if (!snap.empty) return { id: snap.docs[0].id, ...cleanDates(snap.docs[0].data()) };
          }
        } catch (err) {
          isQuotaError(err);
        }
      }
      if (args.where.id) return DEFAULT_CHANNELS.find((c) => c.id === args.where.id) ?? null;
      if (args.where.code) return DEFAULT_CHANNELS.find((c) => c.code === args.where.code) ?? null;
      return null;
    },

    async count(args: { where?: Dict } = {}) {
      const rows = await firestoreDb.channel.findMany({ where: args.where });
      return rows.length;
    },

    async create(args: { data: Dict }) {
      const fs = getFirestoreDb();
      if (!fs) throw new Error("Firestore not initialized");
      const id = args.data.id || fs.collection("channels").doc().id;
      const ref = fs.collection("channels").doc(id);
      const data = { ...args.data, id, createdAt: new Date(), updatedAt: new Date() };
      try {
        await ref.set(data);
      } catch (err) {
        if (isQuotaError(err)) return data;
        throw err;
      }
      return data;
    },

    async update(args: { where: { id: string }; data: Dict }) {
      const fs = getFirestoreDb();
      if (!fs) throw new Error("Firestore not initialized");
      const ref = fs.collection("channels").doc(args.where.id);
      try {
        await ref.set({ ...args.data, updatedAt: new Date() }, { merge: true });
        const updated = await ref.get();
        return { id: updated.id, ...cleanDates(updated.data()!) };
      } catch (err) {
        if (isQuotaError(err)) return { id: args.where.id, ...args.data };
        throw err;
      }
    },

    async delete(args: { where: { id: string } }) {
      const fs = getFirestoreDb();
      if (!fs) return null;
      try {
        await fs.collection("channels").doc(args.where.id).delete();
      } catch (err) {
        isQuotaError(err);
      }
      return { id: args.where.id };
    },

    async deleteMany() {
      const fs = getFirestoreDb();
      if (!fs) return { count: 0 };
      try {
        const snap = await fs.collection("channels").get();
        const batch = fs.batch();
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        return { count: snap.size };
      } catch (err) {
        isQuotaError(err);
        return { count: 0 };
      }
    },
  },

  user: {
    async findUnique(args: { where: { id?: string; email?: string } }) {
      const fs = getFirestoreDb();
      if (!fs || shouldSkipFirestore()) return null;
      try {
        if (args.where.id) {
          const doc = await fs.collection("users").doc(args.where.id).get();
          return doc.exists ? { id: doc.id, ...cleanDates(doc.data()!) } : null;
        }
        if (args.where.email) {
          const snap = await fs.collection("users").where("email", "==", args.where.email.toLowerCase().trim()).limit(1).get();
          return snap.empty ? null : { id: snap.docs[0].id, ...cleanDates(snap.docs[0].data()) };
        }
      } catch (err) {
        isQuotaError(err);
      }
      return null;
    },

    async count() {
      const fs = getFirestoreDb();
      if (!fs || shouldSkipFirestore()) return 1;
      try {
        const snap = await fs.collection("users").get();
        return snap.size;
      } catch (err) {
        isQuotaError(err);
        return 1;
      }
    },

    async create(args: { data: Dict }) {
      const fs = getFirestoreDb();
      if (!fs) throw new Error("Firestore not initialized");
      const id = args.data.id || fs.collection("users").doc().id;
      const ref = fs.collection("users").doc(id);
      const data = {
        ...args.data,
        id,
        email: args.data.email ? String(args.data.email).toLowerCase().trim() : "",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      try {
        await ref.set(data);
      } catch (err) {
        if (isQuotaError(err)) return data;
        throw err;
      }
      return data;
    },

    async createMany(args: { data: Dict[] }) {
      for (const item of args.data) {
        await firestoreDb.user.create({ data: item });
      }
      return { count: args.data.length };
    },

    async update(args: { where: { id: string }; data: Dict }) {
      const fs = getFirestoreDb();
      if (!fs) throw new Error("Firestore not initialized");
      const ref = fs.collection("users").doc(args.where.id);
      try {
        await ref.set({ ...args.data, updatedAt: new Date() }, { merge: true });
        const updated = await ref.get();
        return { id: updated.id, ...cleanDates(updated.data()!) };
      } catch (err) {
        if (isQuotaError(err)) return { id: args.where.id, ...args.data };
        throw err;
      }
    },

    async deleteMany() {
      const fs = getFirestoreDb();
      if (!fs) return { count: 0 };
      try {
        const snap = await fs.collection("users").get();
        const batch = fs.batch();
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        return { count: snap.size };
      } catch (err) {
        isQuotaError(err);
        return { count: 0 };
      }
    },
  },

  session: {
    async findUnique(args: { where: { token: string }; include?: { user: boolean } }) {
      const fs = getFirestoreDb();
      if (!fs || shouldSkipFirestore()) return null;
      try {
        const snap = await fs.collection("sessions").where("token", "==", args.where.token).limit(1).get();
        if (snap.empty) return null;
        const s = { id: snap.docs[0].id, ...cleanDates(snap.docs[0].data()) };
        if (args.include?.user) {
          const uDoc = await fs.collection("users").doc(s.userId).get();
          s.user = uDoc.exists ? { id: uDoc.id, ...cleanDates(uDoc.data()!) } : null;
        }
        return s;
      } catch (err) {
        isQuotaError(err);
        return null;
      }
    },

    async create(args: { data: Dict }) {
      const fs = getFirestoreDb();
      if (!fs) throw new Error("Firestore not initialized");
      const id = args.data.id || fs.collection("sessions").doc().id;
      const ref = fs.collection("sessions").doc(id);
      const data = { ...args.data, id, createdAt: new Date() };
      try {
        await ref.set(data);
      } catch (err) {
        if (isQuotaError(err)) return data;
        throw err;
      }
      return data;
    },

    async delete(args: { where: { id: string } }) {
      const fs = getFirestoreDb();
      if (!fs) return null;
      try {
        await fs.collection("sessions").doc(args.where.id).delete();
      } catch (err) {
        isQuotaError(err);
      }
      return { id: args.where.id };
    },

    async deleteMany(args?: { where?: { token?: string; userId?: string } }) {
      const fs = getFirestoreDb();
      if (!fs) return { count: 0 };
      try {
        let query: any = fs.collection("sessions");
        if (args?.where?.token) query = query.where("token", "==", args.where.token);
        if (args?.where?.userId) query = query.where("userId", "==", args.where.userId);
        const snap = await query.get();
        const batch = fs.batch();
        snap.docs.forEach((d: any) => batch.delete(d.ref));
        await batch.commit();
        return { count: snap.size };
      } catch (err) {
        isQuotaError(err);
        return { count: 0 };
      }
    },
  },

  userList: {
    async findMany(args: { where: Dict; include?: { title: boolean }; orderBy?: any }) {
      const fs = getFirestoreDb();
      if (!fs || shouldSkipFirestore()) return [];
      try {
        let query: any = fs.collection("user_lists");
        if (args.where.userId) query = query.where("userId", "==", args.where.userId);
        if (args.where.deviceId) query = query.where("deviceId", "==", args.where.deviceId);

        const snap = await query.get();
        let rows = snap.docs.map((d: any) => ({ id: d.id, ...cleanDates(d.data()) }));
        if (args.where.titleId) rows = rows.filter((r: any) => r.titleId === args.where.titleId);

        rows = sortRows(rows, args.orderBy ?? { createdAt: "desc" });

        if (args.include?.title) {
          const titleSnap = await fs.collection("titles").get();
          const titles = new Map(titleSnap.docs.map((d: any) => [d.id, { id: d.id, ...cleanDates(d.data()) }]));
          for (const item of rows) {
            item.title = titles.get(item.titleId) ?? null;
          }
        }
        return rows;
      } catch (err) {
        isQuotaError(err);
        return [];
      }
    },

    async count(args: { where?: Dict } = {}) {
      const rows = await firestoreDb.userList.findMany({ where: args.where ?? {} });
      return rows.length;
    },

    async create(args: { data: Dict }) {
      const fs = getFirestoreDb();
      if (!fs) throw new Error("Firestore not initialized");
      const id = fs.collection("user_lists").doc().id;
      const ref = fs.collection("user_lists").doc(id);
      const data = { ...args.data, id, createdAt: new Date() };
      try {
        await ref.set(data);
      } catch (err) {
        if (isQuotaError(err)) return data;
        throw err;
      }
      return data;
    },

    async deleteMany(args: { where: Dict }) {
      const fs = getFirestoreDb();
      if (!fs) return { count: 0 };
      try {
        const rows = await firestoreDb.userList.findMany({ where: args.where });
        const batch = fs.batch();
        rows.forEach((r: any) => batch.delete(fs.collection("user_lists").doc(r.id)));
        await batch.commit();
        return { count: rows.length };
      } catch (err) {
        isQuotaError(err);
        return { count: 0 };
      }
    },
  },

  watchProgress: {
    async findMany(args: { where: Dict; include?: Dict; orderBy?: any }) {
      const fs = getFirestoreDb();
      if (!fs || shouldSkipFirestore()) return [];
      try {
        let query: any = fs.collection("watch_progress");
        if (args.where.userId) query = query.where("userId", "==", args.where.userId);
        if (args.where.deviceId) query = query.where("deviceId", "==", args.where.deviceId);

        const snap = await query.get();
        let rows = snap.docs.map((d: any) => ({ id: d.id, ...cleanDates(d.data()) }));
        if (args.where.titleId) rows = rows.filter((r: any) => r.titleId === args.where.titleId);

        rows = sortRows(rows, args.orderBy ?? { updatedAt: "desc" });

        if (args.include?.title || args.include?.episode) {
          const [titlesSnap, epsSnap] = await Promise.all([
            args.include?.title ? fs.collection("titles").get() : null,
            args.include?.episode ? fs.collection("episodes").get() : null,
          ]);
          const titles = titlesSnap ? new Map(titlesSnap.docs.map((d: any) => [d.id, { id: d.id, ...cleanDates(d.data()) }])) : null;
          const eps = epsSnap ? new Map(epsSnap.docs.map((d: any) => [d.id, { id: d.id, ...cleanDates(d.data()) }])) : null;

          for (const p of rows) {
            if (titles) p.title = titles.get(p.titleId) ?? null;
            if (eps && p.episodeId) p.episode = eps.get(p.episodeId) ?? null;
          }
        }

        return rows;
      } catch (err) {
        isQuotaError(err);
        return [];
      }
    },

    async findFirst(args: { where: Dict }) {
      const rows = await firestoreDb.watchProgress.findMany({ where: args.where });
      return rows[0] ?? null;
    },

    async count(args: { where?: Dict } = {}) {
      const rows = await firestoreDb.watchProgress.findMany({ where: args.where ?? {} });
      return rows.length;
    },

    async create(args: { data: Dict }) {
      const fs = getFirestoreDb();
      if (!fs) throw new Error("Firestore not initialized");
      const id = fs.collection("watch_progress").doc().id;
      const ref = fs.collection("watch_progress").doc(id);
      const data = { ...args.data, id, createdAt: new Date(), updatedAt: new Date() };
      try {
        await ref.set(data);
      } catch (err) {
        if (isQuotaError(err)) return data;
        throw err;
      }
      return data;
    },

    async upsert(args: { where: Dict; update: Dict; create: Dict }) {
      const existing = await firestoreDb.watchProgress.findFirst({ where: args.where });
      const fs = getFirestoreDb();
      if (!fs) throw new Error("Firestore not initialized");

      if (existing) {
        const ref = fs.collection("watch_progress").doc(existing.id);
        const data = { ...args.update, updatedAt: new Date() };
        try {
          await ref.set(data, { merge: true });
        } catch (err) {
          if (isQuotaError(err)) return { ...existing, ...data };
          throw err;
        }
        return { ...existing, ...data };
      } else {
        return firestoreDb.watchProgress.create({ data: args.create });
      }
    },

    async deleteMany(args: { where: Dict }) {
      const fs = getFirestoreDb();
      if (!fs) return { count: 0 };
      try {
        const rows = await firestoreDb.watchProgress.findMany({ where: args.where });
        const batch = fs.batch();
        rows.forEach((r: any) => batch.delete(fs.collection("watch_progress").doc(r.id)));
        await batch.commit();
        return { count: rows.length };
      } catch (err) {
        isQuotaError(err);
        return { count: 0 };
      }
    },
  },

  siteSetting: {
    async findMany() {
      const fs = getFirestoreDb();
      let rows: Dict[] = [];
      if (fs && !shouldSkipFirestore()) {
        try {
          const snap = await fs.collection("site_settings").get();
          rows = snap.docs.map((d) => ({ key: d.id, ...cleanDates(d.data()) }));
        } catch (err) {
          isQuotaError(err);
        }
      }
      if (rows.length === 0) {
        rows = Object.entries(DEFAULT_SETTINGS).map(([k, v]) => ({ key: k, value: v }));
      }
      return rows;
    },

    async findUnique(args: { where: { key: string } }) {
      const fs = getFirestoreDb();
      if (fs && !shouldSkipFirestore()) {
        try {
          const doc = await fs.collection("site_settings").doc(args.where.key).get();
          if (doc.exists) return { key: doc.id, ...cleanDates(doc.data()!) };
        } catch (err) {
          isQuotaError(err);
        }
      }
      if (DEFAULT_SETTINGS[args.where.key] !== undefined) {
        return { key: args.where.key, value: DEFAULT_SETTINGS[args.where.key] };
      }
      return null;
    },

    async upsert(args: { where: { key: string }; update: Dict; create: Dict }) {
      const fs = getFirestoreDb();
      if (!fs) throw new Error("Firestore not initialized");
      const ref = fs.collection("site_settings").doc(args.where.key);
      const data = { key: args.where.key, ...(args.update || args.create) };
      try {
        await ref.set(data, { merge: true });
      } catch (err) {
        if (isQuotaError(err)) return data;
        throw err;
      }
      return data;
    },

    async createMany(args: { data: Dict[] }) {
      const fs = getFirestoreDb();
      if (!fs) return { count: 0 };
      try {
        const batch = fs.batch();
        for (const item of args.data) {
          const ref = fs.collection("site_settings").doc(item.key);
          batch.set(ref, item);
        }
        await batch.commit();
        return { count: args.data.length };
      } catch (err) {
        isQuotaError(err);
        return { count: args.data.length };
      }
    },

    async deleteMany() {
      const fs = getFirestoreDb();
      if (!fs) return { count: 0 };
      try {
        const snap = await fs.collection("site_settings").get();
        const batch = fs.batch();
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        return { count: snap.size };
      } catch (err) {
        isQuotaError(err);
        return { count: 0 };
      }
    },
  },

  season: {
    async findMany(args: { where?: Dict; include?: Dict } = {}) {
      const fs = getFirestoreDb();
      let rows: Dict[] = [];
      if (fs && !shouldSkipFirestore()) {
        try {
          const snap = await fs.collection("seasons").get();
          rows = snap.docs.map((d) => ({ id: d.id, ...cleanDates(d.data()) }));
        } catch (err) {
          isQuotaError(err);
        }
      }
      if (args.where) rows = rows.filter((r) => matchWhere(r, args.where));
      return rows;
    },

    async create(args: { data: Dict }) {
      const fs = getFirestoreDb();
      if (!fs) throw new Error("Firestore not initialized");
      const id = args.data.id || fs.collection("seasons").doc().id;
      const ref = fs.collection("seasons").doc(id);
      const data = { ...args.data, id };
      try {
        await ref.set(data);
      } catch (err) {
        if (isQuotaError(err)) return data;
        throw err;
      }
      return data;
    },

    async deleteMany() {
      const fs = getFirestoreDb();
      if (!fs) return { count: 0 };
      try {
        const snap = await fs.collection("seasons").get();
        const batch = fs.batch();
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        return { count: snap.size };
      } catch (err) {
        isQuotaError(err);
        return { count: 0 };
      }
    },
  },

  episode: {
    async findMany(args: { where?: Dict } = {}) {
      const fs = getFirestoreDb();
      let rows: Dict[] = [];
      if (fs && !shouldSkipFirestore()) {
        try {
          const snap = await fs.collection("episodes").get();
          rows = snap.docs.map((d) => ({ id: d.id, ...cleanDates(d.data()) }));
        } catch (err) {
          isQuotaError(err);
        }
      }
      if (args.where) rows = rows.filter((r) => matchWhere(r, args.where));
      return rows;
    },

    async create(args: { data: Dict }) {
      const fs = getFirestoreDb();
      if (!fs) throw new Error("Firestore not initialized");
      const id = args.data.id || fs.collection("episodes").doc().id;
      const ref = fs.collection("episodes").doc(id);
      const data = { ...args.data, id };
      try {
        await ref.set(data);
      } catch (err) {
        if (isQuotaError(err)) return data;
        throw err;
      }
      return data;
    },

    async deleteMany() {
      const fs = getFirestoreDb();
      if (!fs) return { count: 0 };
      try {
        const snap = await fs.collection("episodes").get();
        const batch = fs.batch();
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        return { count: snap.size };
      } catch (err) {
        isQuotaError(err);
        return { count: 0 };
      }
    },
  },
};

// TVORA Firestore Database Adapter
// Provides a Prisma-compatible API backed by Google Cloud Firestore (Firebase Admin)
import { getFirestoreDb } from "./firebase-admin";
import * as fsModule from "fs";
import * as pathModule from "path";

import * as zlibModule from "zlib";

type Dict = Record<string, any>;

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
      if (fs) {
        try {
          const snap = await fs.collection("titles").get();
          rows = snap.docs.map((d) => ({ id: d.id, ...cleanDates(d.data()) }));
        } catch (err) {
          // If Firestore is throttled or offline, use local catalog fallback
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
        if (needsSeasons.length > 0) {
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
      if (args.where.id) {
        let title: Dict | null = null;
        if (fs) {
          try {
            const doc = await fs.collection("titles").doc(args.where.id).get();
            if (doc.exists) {
              title = { id: doc.id, ...cleanDates(doc.data()!) };
            }
          } catch {}
        }
        if (!title) {
          const cat = getLocalCatalog();
          const found = cat.find((c) => c.id === args.where.id || c.slug === args.where.id);
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
          if (fs) {
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
            } catch {}
          }
        }
        return title;
      }
      return firestoreDb.title.findFirst({ where: args.where, include: args.include });
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
      await ref.set(data);
      return data;
    },

    async update(args: { where: { id: string }; data: Dict }) {
      const fs = getFirestoreDb();
      if (!fs) throw new Error("Firestore not initialized");
      const ref = fs.collection("titles").doc(args.where.id);
      const updateData = { ...args.data, updatedAt: new Date() };
      await ref.set(updateData, { merge: true });
      const updated = await ref.get();
      return { id: updated.id, ...cleanDates(updated.data()!) };
    },

    async delete(args: { where: { id: string } }) {
      const fs = getFirestoreDb();
      if (!fs) return null;
      await fs.collection("titles").doc(args.where.id).delete();
      return { id: args.where.id };
    },

    async deleteMany() {
      const fs = getFirestoreDb();
      if (!fs) return { count: 0 };
      const snap = await fs.collection("titles").get();
      const batch = fs.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      return { count: snap.size };
    },
  },

  channel: {
    async findMany(args: { where?: Dict; orderBy?: any } = {}) {
      const fs = getFirestoreDb();
      if (!fs) return [];
      const snap = await fs.collection("channels").get();
      let rows: Dict[] = snap.docs.map((d) => ({ id: d.id, ...cleanDates(d.data()) }));
      if (args.where) rows = rows.filter((r) => matchWhere(r, args.where));
      return sortRows(rows, args.orderBy ?? [{ sortOrder: "asc" }, { nameEn: "asc" }]);
    },

    async findUnique(args: { where: { id?: string; code?: string } }) {
      const fs = getFirestoreDb();
      if (!fs) return null;
      if (args.where.id) {
        const doc = await fs.collection("channels").doc(args.where.id).get();
        return doc.exists ? { id: doc.id, ...cleanDates(doc.data()!) } : null;
      }
      const snap = await fs.collection("channels").where("code", "==", args.where.code).limit(1).get();
      return snap.empty ? null : { id: snap.docs[0].id, ...cleanDates(snap.docs[0].data()) };
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
      await ref.set(data);
      return data;
    },

    async update(args: { where: { id: string }; data: Dict }) {
      const fs = getFirestoreDb();
      if (!fs) throw new Error("Firestore not initialized");
      const ref = fs.collection("channels").doc(args.where.id);
      await ref.set({ ...args.data, updatedAt: new Date() }, { merge: true });
      const updated = await ref.get();
      return { id: updated.id, ...cleanDates(updated.data()!) };
    },

    async delete(args: { where: { id: string } }) {
      const fs = getFirestoreDb();
      if (!fs) return null;
      await fs.collection("channels").doc(args.where.id).delete();
      return { id: args.where.id };
    },

    async deleteMany() {
      const fs = getFirestoreDb();
      if (!fs) return { count: 0 };
      const snap = await fs.collection("channels").get();
      const batch = fs.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      return { count: snap.size };
    },
  },

  user: {
    async findUnique(args: { where: { id?: string; email?: string } }) {
      const fs = getFirestoreDb();
      if (!fs) return null;
      if (args.where.id) {
        const doc = await fs.collection("users").doc(args.where.id).get();
        return doc.exists ? { id: doc.id, ...cleanDates(doc.data()!) } : null;
      }
      if (args.where.email) {
        const snap = await fs.collection("users").where("email", "==", args.where.email.toLowerCase().trim()).limit(1).get();
        return snap.empty ? null : { id: snap.docs[0].id, ...cleanDates(snap.docs[0].data()) };
      }
      return null;
    },

    async count() {
      const fs = getFirestoreDb();
      if (!fs) return 0;
      const snap = await fs.collection("users").get();
      return snap.size;
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
      await ref.set(data);
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
      await ref.set({ ...args.data, updatedAt: new Date() }, { merge: true });
      const updated = await ref.get();
      return { id: updated.id, ...cleanDates(updated.data()!) };
    },

    async deleteMany() {
      const fs = getFirestoreDb();
      if (!fs) return { count: 0 };
      const snap = await fs.collection("users").get();
      const batch = fs.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      return { count: snap.size };
    },
  },

  session: {
    async findUnique(args: { where: { token: string }; include?: { user: boolean } }) {
      const fs = getFirestoreDb();
      if (!fs) return null;
      const snap = await fs.collection("sessions").where("token", "==", args.where.token).limit(1).get();
      if (snap.empty) return null;
      const s = { id: snap.docs[0].id, ...cleanDates(snap.docs[0].data()) };
      if (args.include?.user) {
        const uDoc = await fs.collection("users").doc(s.userId).get();
        s.user = uDoc.exists ? { id: uDoc.id, ...cleanDates(uDoc.data()!) } : null;
      }
      return s;
    },

    async create(args: { data: Dict }) {
      const fs = getFirestoreDb();
      if (!fs) throw new Error("Firestore not initialized");
      const id = args.data.id || fs.collection("sessions").doc().id;
      const ref = fs.collection("sessions").doc(id);
      const data = { ...args.data, id, createdAt: new Date() };
      await ref.set(data);
      return data;
    },

    async delete(args: { where: { id: string } }) {
      const fs = getFirestoreDb();
      if (!fs) return null;
      await fs.collection("sessions").doc(args.where.id).delete();
      return { id: args.where.id };
    },

    async deleteMany(args?: { where?: { token?: string; userId?: string } }) {
      const fs = getFirestoreDb();
      if (!fs) return { count: 0 };
      let query: admin.firestore.Query = fs.collection("sessions");
      if (args?.where?.token) query = query.where("token", "==", args.where.token);
      if (args?.where?.userId) query = query.where("userId", "==", args.where.userId);
      const snap = await query.get();
      const batch = fs.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      return { count: snap.size };
    },
  },

  userList: {
    async findMany(args: { where: Dict; include?: { title: boolean }; orderBy?: any }) {
      const fs = getFirestoreDb();
      if (!fs) return [];
      let query: admin.firestore.Query = fs.collection("user_lists");
      if (args.where.userId) query = query.where("userId", "==", args.where.userId);
      if (args.where.deviceId) query = query.where("deviceId", "==", args.where.deviceId);

      const snap = await query.get();
      let rows = snap.docs.map((d) => ({ id: d.id, ...cleanDates(d.data()) }));
      if (args.where.titleId) rows = rows.filter((r) => r.titleId === args.where.titleId);

      rows = sortRows(rows, args.orderBy ?? { createdAt: "desc" });

      if (args.include?.title) {
        const titleSnap = await fs.collection("titles").get();
        const titles = new Map(titleSnap.docs.map((d) => [d.id, { id: d.id, ...cleanDates(d.data()) }]));
        for (const item of rows) {
          item.title = titles.get(item.titleId) ?? null;
        }
      }

      return rows;
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
      await ref.set(data);
      return data;
    },

    async deleteMany(args: { where: Dict }) {
      const fs = getFirestoreDb();
      if (!fs) return { count: 0 };
      const rows = await firestoreDb.userList.findMany({ where: args.where });
      const batch = fs.batch();
      rows.forEach((r) => batch.delete(fs.collection("user_lists").doc(r.id)));
      await batch.commit();
      return { count: rows.length };
    },
  },

  watchProgress: {
    async findMany(args: { where: Dict; include?: Dict; orderBy?: any }) {
      const fs = getFirestoreDb();
      if (!fs) return [];
      let query: admin.firestore.Query = fs.collection("watch_progress");
      if (args.where.userId) query = query.where("userId", "==", args.where.userId);
      if (args.where.deviceId) query = query.where("deviceId", "==", args.where.deviceId);

      const snap = await query.get();
      let rows = snap.docs.map((d) => ({ id: d.id, ...cleanDates(d.data()) }));
      if (args.where.titleId) rows = rows.filter((r) => r.titleId === args.where.titleId);

      rows = sortRows(rows, args.orderBy ?? { updatedAt: "desc" });

      if (args.include?.title || args.include?.episode) {
        const [titlesSnap, epsSnap] = await Promise.all([
          args.include?.title ? fs.collection("titles").get() : null,
          args.include?.episode ? fs.collection("episodes").get() : null,
        ]);
        const titles = titlesSnap ? new Map(titlesSnap.docs.map((d) => [d.id, { id: d.id, ...cleanDates(d.data()) }])) : null;
        const eps = epsSnap ? new Map(epsSnap.docs.map((d) => [d.id, { id: d.id, ...cleanDates(d.data()) }])) : null;

        for (const p of rows) {
          if (titles) p.title = titles.get(p.titleId) ?? null;
          if (eps && p.episodeId) p.episode = eps.get(p.episodeId) ?? null;
        }
      }

      return rows;
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
      await ref.set(data);
      return data;
    },

    async upsert(args: { where: Dict; update: Dict; create: Dict }) {
      const existing = await firestoreDb.watchProgress.findFirst({ where: args.where });
      const fs = getFirestoreDb();
      if (!fs) throw new Error("Firestore not initialized");

      if (existing) {
        const ref = fs.collection("watch_progress").doc(existing.id);
        const data = { ...args.update, updatedAt: new Date() };
        await ref.set(data, { merge: true });
        return { ...existing, ...data };
      } else {
        return firestoreDb.watchProgress.create({ data: args.create });
      }
    },

    async deleteMany(args: { where: Dict }) {
      const fs = getFirestoreDb();
      if (!fs) return { count: 0 };
      const rows = await firestoreDb.watchProgress.findMany({ where: args.where });
      const batch = fs.batch();
      rows.forEach((r) => batch.delete(fs.collection("watch_progress").doc(r.id)));
      await batch.commit();
      return { count: rows.length };
    },
  },

  siteSetting: {
    async findMany() {
      const fs = getFirestoreDb();
      if (!fs) return [];
      const snap = await fs.collection("site_settings").get();
      return snap.docs.map((d) => ({ key: d.id, ...cleanDates(d.data()) }));
    },

    async findUnique(args: { where: { key: string } }) {
      const fs = getFirestoreDb();
      if (!fs) return null;
      const doc = await fs.collection("site_settings").doc(args.where.key).get();
      return doc.exists ? { key: doc.id, ...cleanDates(doc.data()!) } : null;
    },

    async upsert(args: { where: { key: string }; update: Dict; create: Dict }) {
      const fs = getFirestoreDb();
      if (!fs) throw new Error("Firestore not initialized");
      const ref = fs.collection("site_settings").doc(args.where.key);
      const data = { key: args.where.key, ...(args.update || args.create) };
      await ref.set(data, { merge: true });
      return data;
    },

    async createMany(args: { data: Dict[] }) {
      const fs = getFirestoreDb();
      if (!fs) return { count: 0 };
      const batch = fs.batch();
      for (const item of args.data) {
        const ref = fs.collection("site_settings").doc(item.key);
        batch.set(ref, item);
      }
      await batch.commit();
      return { count: args.data.length };
    },

    async deleteMany() {
      const fs = getFirestoreDb();
      if (!fs) return { count: 0 };
      const snap = await fs.collection("site_settings").get();
      const batch = fs.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      return { count: snap.size };
    },
  },

  season: {
    async findMany(args: { where?: Dict; include?: Dict } = {}) {
      const fs = getFirestoreDb();
      if (!fs) return [];
      const snap = await fs.collection("seasons").get();
      let rows = snap.docs.map((d) => ({ id: d.id, ...cleanDates(d.data()) }));
      if (args.where) rows = rows.filter((r) => matchWhere(r, args.where));
      return rows;
    },

    async create(args: { data: Dict }) {
      const fs = getFirestoreDb();
      if (!fs) throw new Error("Firestore not initialized");
      const id = args.data.id || fs.collection("seasons").doc().id;
      const ref = fs.collection("seasons").doc(id);
      const data = { ...args.data, id };
      await ref.set(data);
      return data;
    },

    async deleteMany() {
      const fs = getFirestoreDb();
      if (!fs) return { count: 0 };
      const snap = await fs.collection("seasons").get();
      const batch = fs.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      return { count: snap.size };
    },
  },

  episode: {
    async findMany(args: { where?: Dict } = {}) {
      const fs = getFirestoreDb();
      if (!fs) return [];
      const snap = await fs.collection("episodes").get();
      let rows = snap.docs.map((d) => ({ id: d.id, ...cleanDates(d.data()) }));
      if (args.where) rows = rows.filter((r) => matchWhere(r, args.where));
      return rows;
    },

    async create(args: { data: Dict }) {
      const fs = getFirestoreDb();
      if (!fs) throw new Error("Firestore not initialized");
      const id = args.data.id || fs.collection("episodes").doc().id;
      const ref = fs.collection("episodes").doc(id);
      const data = { ...args.data, id };
      await ref.set(data);
      return data;
    },

    async deleteMany() {
      const fs = getFirestoreDb();
      if (!fs) return { count: 0 };
      const snap = await fs.collection("episodes").get();
      const batch = fs.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      return { count: snap.size };
    },
  },
};

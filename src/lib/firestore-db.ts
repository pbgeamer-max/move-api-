// TVORA Firestore Database Adapter
// Provides a Prisma-compatible API backed by Google Cloud Firestore (Firebase Admin)
// Includes quota exhaustion circuit breaker and resilient fallback to local catalog & default data
import { getFirestoreDb } from "./firebase-admin";
import { DEFAULT_CHANNELS, DEFAULT_SETTINGS, getLocalCatalog } from "./catalog-loader";

type Dict = Record<string, any>;

// ── Quota Exhaustion Circuit Breaker ──────────────────────────────────────────
let _quotaBlockedUntil = 0;

function isQuotaError(err: any): boolean {
  if (!err) return false;
  const msg = String(err.message || err.details || err || "");
  const code = err.code;
  if (code === 8 || code === "8" || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("Quota exceeded")) {
    _quotaBlockedUntil = Date.now() + 5 * 60 * 1000;
    console.warn("[TVORA Firestore] Quota limit reached (RESOURCE_EXHAUSTED). Falling back to local data.");
    return true;
  }
  return false;
}

function shouldSkipFirestore(): boolean {
  return Date.now() < _quotaBlockedUntil;
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

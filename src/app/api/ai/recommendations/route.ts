// TVORA AI — personalized recommendations (task 6-a).
// Builds a taste profile from the viewer's WatchProgress + UserList history
// (session user or X-Device-Id guest, exactly like /api/progress), then asks
// the LLM to pick the 8 best candidates; falls back to a pure genre-affinity +
// rating ranking when the model is unavailable. No history → honest cold start.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor } from "@/lib/auth";
import { safeJson, serializeTitle } from "@/lib/serialize";
import type { Lang, TitleDTO } from "@/lib/types";
import { asString, asStringArray, chatJson, type LlmJson } from "../llm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TitleRow = Record<string, unknown> & { id: string };

const FULLY_WATCHED = 0.95;

export async function GET(req: NextRequest) {
  const { userId, deviceId } = await getActor();
  const lang: Lang = req.nextUrl.searchParams.get("lang") === "en" ? "en" : "ar";

  if (!userId && !deviceId) {
    return NextResponse.json({ items: [], answer: null, coldStart: true });
  }

  const where = userId ? { userId } : { deviceId: deviceId! };
  const [progressRows, listRows] = await Promise.all([
    db.watchProgress.findMany({ where, include: { title: true }, orderBy: { updatedAt: "desc" }, take: 100 }),
    db.userList.findMany({ where, include: { title: true }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);

  // Taste profile — distinct history titles (progress + list)
  const historyTitles = new Map<string, TitleRow>();
  const fullyWatchedIds = new Set<string>();
  for (const row of progressRows) {
    if (!row.title || !row.title.visible) continue;
    historyTitles.set(row.titleId, row.title as unknown as TitleRow);
    if (row.durationSeconds > 0 && row.positionSeconds >= row.durationSeconds * FULLY_WATCHED) {
      fullyWatchedIds.add(row.titleId);
    }
  }
  for (const row of listRows) {
    if (!row.title || !row.title.visible) continue;
    historyTitles.set(row.titleId, row.title as unknown as TitleRow);
  }

  if (historyTitles.size === 0) {
    return NextResponse.json({ items: [], answer: null, coldStart: true });
  }

  // Genre frequency map from real watch/list history
  const genreFreq = new Map<string, number>();
  for (const row of historyTitles.values()) {
    for (const g of safeJson(row.genres, []) as string[]) {
      const key = g.toLowerCase();
      genreFreq.set(key, (genreFreq.get(key) ?? 0) + 1);
    }
  }
  const topGenres = [...genreFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  // Candidates: visible titles not fully watched, ranked by affinity + rating
  const allVisible = (await db.title.findMany({
    where: { visible: true },
    orderBy: { rating: "desc" },
    take: 200,
  })) as unknown as TitleRow[];

  const candidates = allVisible
    .filter((row) => !fullyWatchedIds.has(row.id))
    .map((row) => {
      let affinity = 0;
      for (const g of safeJson(row.genres, []) as string[]) {
        affinity += genreFreq.get(g.toLowerCase()) ?? 0;
      }
      const rating = typeof row.rating === "number" ? row.rating : 0;
      return { row, score: affinity * 2 + rating };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 24);

  if (candidates.length === 0) {
    return NextResponse.json({ items: [], answer: null, coldStart: false });
  }

  // Compact rows for the model
  const compact = candidates.map(({ row }) => ({
    id: row.id,
    titleEn: row.titleEn,
    titleAr: row.titleAr,
    genres: safeJson(row.genres, []) as string[],
    releaseYear: row.releaseYear,
    rating: row.rating,
    type: row.type,
  }));

  const system =
    "You are TVORA's personal recommendation editor for a cinematic streaming catalog. " +
    "You will receive the viewer's taste profile (favorite genres from real watch history) and a candidate list. " +
    "Pick the 8 best titles for THIS viewer and reply with STRICT JSON ONLY — no markdown fences, no prose outside the JSON. " +
    'Schema: {"ids": string[8], "answer": string}. ' +
    "Rules: ids must be copied EXACTLY from the candidate list (max 8, best first, skip nothing else); " +
    `answer = ONE short friendly sentence in ${lang === "ar" ? "Arabic" : "English"} explaining the vibe of your picks (do not invent titles).`;
  const user = JSON.stringify({ viewerTopGenres: topGenres.map(([g, n]) => ({ genre: g, watched: n })), candidates: compact });
  const llm = await chatJson(system, user);

  let items: TitleDTO[] = [];
  let answer: string | null = null;

  if (llm) {
    const ids = asStringArray(llm.ids, 8);
    const byId = new Map(candidates.map(({ row }) => [row.id, row]));
    const seen = new Set<string>();
    items = ids
      .filter((id) => byId.has(id) && !seen.has(id))
      .map((id) => {
        seen.add(id);
        return serializeTitle(byId.get(id) as unknown as Record<string, unknown> & { id: string });
      });
    answer = asString(llm.answer, 240);
  }

  // LLM unavailable or returned nothing usable → algorithmic top-8
  if (items.length === 0) {
    items = candidates
      .slice(0, 8)
      .map(({ row }) => serializeTitle(row as unknown as Record<string, unknown> & { id: string }));
    answer = null;
  }

  return NextResponse.json({ items, answer });
}

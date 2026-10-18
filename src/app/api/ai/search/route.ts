// TVORA AI — natural-language smart search (task 6-a).
// The LLM turns a free-text "what do I feel like watching" request into strict
// JSON { keywords, genres, type, mood, answer }; we then rank the real catalog
// (genre affinity + keyword hits + rating) and always answer 200 with items,
// degrading to plain keyword search whenever the model is unavailable.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { safeJson, serializeTitle } from "@/lib/serialize";
import { GENRES_AR, type Lang, type TitleDTO } from "@/lib/types";
import { asString, asStringArray, chatJson, type LlmJson } from "../llm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ── Light in-memory rate limit: 10 req/min per IP ─────────────────────────────
const RATE_MAX = 10;
const RATE_WINDOW_MS = 60_000;
const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || now > b.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  b.count += 1;
  // keep the map from growing unbounded
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (now > v.resetAt) buckets.delete(k);
  }
  return b.count > RATE_MAX;
}

interface AiSearchPlan {
  keywords: string[];
  genres: string[];
  type: "movie" | "series" | null;
  answer: string | null;
}

const TYPE_VALUES = new Set(["movie", "series"]);

function planFrom(llm: LlmJson | null, rawQuery: string): AiSearchPlan {
  if (!llm) {
    // Fallback: raw keywords from the query itself
    return {
      keywords: rawWords(rawQuery),
      genres: [],
      type: null,
      answer: null,
    };
  }
  const genreVocab = new Set(Object.keys(GENRES_AR).map((g) => g.toLowerCase()));
  const genres = asStringArray(llm.genres, 5).filter((g) => genreVocab.has(g.toLowerCase()));
  const rawType = typeof llm.type === "string" ? llm.type.trim().toLowerCase() : null;
  const type = rawType && TYPE_VALUES.has(rawType) ? (rawType as "movie" | "series") : null;
  const llmKeywords = asStringArray(llm.keywords, 5).map((k) => k.toLowerCase()).slice(0, 5);
  const keywords = llmKeywords.length > 0 ? llmKeywords : rawWords(rawQuery);
  return {
    keywords,
    genres,
    type,
    answer: asString(llm.answer, 240),
  };
}

function rawWords(q: string): string[] {
  return q
    .split(/[\s،,.؛;:!؟?"'()\[\]\-–—_]+/)
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length >= 2 && w.length <= 40)
    .slice(0, 5);
}

type TitleRow = Record<string, unknown> & { id: string };

function scoreTitles(
  rows: TitleRow[],
  keywords: string[],
  genres: string[],
): Array<{ row: TitleRow; score: number }> {
  const genreSet = new Set(genres.map((g) => g.toLowerCase()));
  const scored: Array<{ row: TitleRow; score: number }> = [];
  for (const row of rows) {
    let score = 0;
    const titleGenres = (safeJson(row.genres, []) as string[]).map((g) => g.toLowerCase());
    for (const g of titleGenres) if (genreSet.has(g)) score += 2;
    if (keywords.length > 0) {
      const tAr = String(row.titleAr ?? "").toLowerCase();
      const tEn = String(row.titleEn ?? "").toLowerCase();
      const sAr = String(row.synopsisAr ?? "").toLowerCase();
      const sEn = String(row.synopsisEn ?? "").toLowerCase();
      for (const kw of keywords) {
        if (tAr.includes(kw) || tEn.includes(kw)) score += 3;
        else if (sAr.includes(kw) || sEn.includes(kw)) score += 1;
      }
    }
    const rating = typeof row.rating === "number" ? row.rating : 0;
    score += rating / 10;
    scored.push({ row, score });
  }
  return scored;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "anon";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as { q?: unknown; lang?: unknown };
  const q = typeof body.q === "string" ? body.q.trim() : "";
  const lang: Lang = body.lang === "en" ? "en" : "ar";
  if (q.length < 2 || q.length > 300) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  // ── ONE completion: plan + friendly answer in the viewer's language ─────────
  const genreVocabList = Object.keys(GENRES_AR).join(" | ");
  const system =
    "You are TVORA's smart search assistant for a cinematic streaming catalog of movies and series. " +
    "Analyze the viewer's free-text request and reply with STRICT JSON ONLY — no markdown fences, no prose outside the JSON. " +
    'Schema: {"keywords": string[2-5 lowercase], "genres": string[], "type": "movie"|"series"|null, "mood": string, "answer": string}. ' +
    "Rules: keywords = 2-5 short lowercase words likely to appear in titles or synopses (Arabic and/or English); " +
    `genres = zero or more, MUST be chosen only from this exact vocabulary: ${genreVocabList}; ` +
    "type = \"movie\" or \"series\" only if clearly implied, else null; mood = 1-2 words describing the vibe; " +
    `answer = ONE short friendly sentence in ${lang === "ar" ? "Arabic" : "English"} introducing your picks (do not invent titles).`;
  const llm = await chatJson(system, q);
  const plan = planFrom(llm, q);

  // ── Two-step retrieval (SQLite stores genres as a JSON string → JS filtering) ─
  const typeFilter = plan.type ? { type: plan.type } : {};
  const [genreRows, keywordRows] = await Promise.all([
    plan.genres.length > 0
      ? db.title
          .findMany({ where: { visible: true, ...typeFilter }, orderBy: { rating: "desc" }, take: 120 })
          .then((rows) => rows as unknown as TitleRow[])
      : Promise.resolve([] as TitleRow[]),
    plan.keywords.length > 0
      ? db.title
          .findMany({
            where: {
              visible: true,
              ...typeFilter,
              OR: plan.keywords.flatMap((kw) => [
                { titleAr: { contains: kw } },
                { titleEn: { contains: kw } },
                { synopsisAr: { contains: kw } },
                { synopsisEn: { contains: kw } },
              ]),
            },
            orderBy: { rating: "desc" },
            take: 40,
          })
          .then((rows) => rows as unknown as TitleRow[])
      : Promise.resolve([] as TitleRow[]),
  ]);

  // Merge + dedupe
  const merged = new Map<string, TitleRow>();
  for (const row of genreRows) {
    const gl = (safeJson(row.genres, []) as string[]).map((g) => g.toLowerCase());
    if (plan.genres.some((g) => gl.includes(g.toLowerCase()))) merged.set(row.id, row);
  }
  for (const row of keywordRows) merged.set(row.id, row);

  let ranked = scoreTitles([...merged.values()], plan.keywords, plan.genres)
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  let fallback = llm === null;
  let answer = plan.answer;

  // LLM keywords matched nothing → retry with the viewer's own words
  if (ranked.length === 0 && llm !== null) {
    const rawKw = rawWords(q);
    if (rawKw.length > 0 && rawKw.join(" ") !== plan.keywords.join(" ")) {
      const retryRows = (await db.title.findMany({
        where: {
          visible: true,
          ...typeFilter,
          OR: rawKw.flatMap((kw) => [
            { titleAr: { contains: kw } },
            { titleEn: { contains: kw } },
            { synopsisAr: { contains: kw } },
            { synopsisEn: { contains: kw } },
          ]),
        },
        orderBy: { rating: "desc" },
        take: 40,
      })) as unknown as TitleRow[];
      ranked = scoreTitles(retryRows, rawKw, plan.genres)
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 12);
    }
  }

  const items: TitleDTO[] = ranked.map((s) => serializeTitle(s.row as unknown as Record<string, unknown> & { id: string }));
  if (llm === null) answer = null;

  return NextResponse.json({ answer, items, fallback });
}

// TVORA AI — admin synopsis generator (task 6-a).
// Admin-only: generates cinematic Arabic + English synopses from a title's REAL
// metadata. Nothing is persisted — the admin reviews/edits the draft and saves
// it through the existing PATCH /api/admin/titles/[id] flow.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { safeJson } from "@/lib/serialize";
import { asString, chatJson } from "../llm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { titleId?: unknown };
  const titleId = typeof body.titleId === "string" ? body.titleId : "";
  if (!titleId) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const title = await db.title.findUnique({ where: { id: titleId } });
  if (!title) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const meta = {
    titleAr: title.titleAr,
    titleEn: title.titleEn,
    originalTitle: title.originalTitle,
    type: title.type,
    releaseYear: title.releaseYear,
    genres: safeJson(title.genres, []) as string[],
    runtime: title.runtime,
    country: title.country,
    director: title.director,
    cast: (safeJson(title.cast, []) as string[]).slice(0, 5),
    existingSynopsisAr: title.synopsisAr || null,
    existingSynopsisEn: title.synopsisEn || null,
  };

  const system =
    "You are TVORA's editorial copywriter for a cinematic streaming platform. " +
    "You will receive REAL metadata for one title (movies/series). Write a cinematic, engaging synopsis of 2-3 sentences in Arabic and one in English. " +
    "If an existing synopsis is provided, enrich it — never contradict the metadata (year, genres, type, runtime, cast, country). " +
    "Do not invent awards, ratings, names or plot points that are not supported by the metadata; keep it spoiler-light. " +
    "Reply with STRICT JSON ONLY — no markdown fences, no prose outside the JSON. " +
    'Schema: {"synopsisAr": string, "synopsisEn": string}. synopsisAr must be fluent Modern Standard Arabic; synopsisEn natural English.';
  const llm = await chatJson(system, JSON.stringify(meta));

  const synopsisAr = llm ? asString(llm.synopsisAr, 1200) : null;
  const synopsisEn = llm ? asString(llm.synopsisEn, 1200) : null;
  if (!synopsisAr || !synopsisEn) {
    return NextResponse.json({ error: "ai_unavailable" }, { status: 502 });
  }

  // Draft only — never saved here; the admin reviews then saves via PATCH.
  return NextResponse.json({ synopsisAr, synopsisEn });
}

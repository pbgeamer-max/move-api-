import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { cacheInvalidate } from "@/lib/cache";

export const dynamic = "force-dynamic";

const schema = z.object({
  titleAr: z.string().min(1).max(160).optional(),
  titleEn: z.string().min(1).max(160).optional(),
  synopsisAr: z.string().max(4000).optional(),
  synopsisEn: z.string().max(4000).optional(),
  releaseYear: z.number().int().min(1900).max(2100).optional(),
  runtime: z.number().int().min(0).max(600).nullable().optional(),
  rating: z.number().min(0).max(10).nullable().optional(),
  ageRating: z.string().max(10).nullable().optional(),
  featured: z.boolean().optional(),
  trending: z.boolean().optional(),
  isNew: z.boolean().optional(),
  visible: z.boolean().optional(),
  playbackType: z.enum(["demo", "none"]).optional(),
  playbackUrl: z.string().max(500).nullable().optional(),
  posterUrl: z.string().max(500).nullable().optional(),
  backdropUrl: z.string().max(500).nullable().optional(),
  genres: z.array(z.string().max(40)).max(10).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const body = schema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const data: Record<string, unknown> = { ...body.data };
  if (body.data.genres) data.genres = JSON.stringify(body.data.genres);

  try {
    await db.title.update({ where: { id }, data });
    cacheInvalidate("home");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}

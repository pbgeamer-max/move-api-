import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeChannel } from "@/lib/serialize";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// PATCH /api/admin/channels/[id] — edit channel fields
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const existing = await db.channel.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (typeof body.nameAr === "string" && body.nameAr.trim()) data.nameAr = body.nameAr.trim();
  if (typeof body.nameEn === "string" && body.nameEn.trim()) data.nameEn = body.nameEn.trim();
  if (typeof body.category === "string" && body.category) data.category = body.category;
  if (typeof body.descriptionAr === "string") data.descriptionAr = body.descriptionAr;
  if (typeof body.descriptionEn === "string") data.descriptionEn = body.descriptionEn;
  if (typeof body.nowPlayingAr === "string") data.nowPlayingAr = body.nowPlayingAr;
  if (typeof body.nowPlayingEn === "string") data.nowPlayingEn = body.nowPlayingEn;
  if (typeof body.colorA === "string" && body.colorA) data.colorA = body.colorA;
  if (typeof body.colorB === "string" && body.colorB) data.colorB = body.colorB;
  if (typeof body.quality === "string" && body.quality) data.quality = body.quality;
  if (typeof body.streamUrl === "string") {
    data.streamUrl = body.streamUrl.trim() || null;
    data.streamType = body.streamUrl.trim() ? "demo" : "none";
  }
  if (typeof body.visible === "boolean") data.visible = body.visible;
  if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) data.sortOrder = Math.round(body.sortOrder);

  const updated = await db.channel.update({ where: { id }, data });
  return NextResponse.json({
    channel: serializeChannel(updated as unknown as Record<string, unknown> & { id: string }),
  });
}

// DELETE /api/admin/channels/[id]
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const existing = await db.channel.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  await db.channel.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

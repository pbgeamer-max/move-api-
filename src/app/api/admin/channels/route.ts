import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeChannel } from "@/lib/serialize";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/admin/channels — all channels incl. hidden
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const rows = await db.channel.findMany({
    orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
  });
  return NextResponse.json({
    items: rows.map((c) => serializeChannel(c as unknown as Record<string, unknown> & { id: string })),
  });
}

const CODE_RE = /^[A-Za-z0-9-]{2,24}$/;

// POST /api/admin/channels — create a channel
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const code = String(body.code ?? "").trim().toUpperCase();
  const nameAr = String(body.nameAr ?? "").trim();
  const nameEn = String(body.nameEn ?? "").trim();
  const category = String(body.category ?? "general");
  if (!CODE_RE.test(code)) return NextResponse.json({ error: "invalid code" }, { status: 400 });
  if (!nameAr || !nameEn) return NextResponse.json({ error: "names required" }, { status: 400 });

  const exists = await db.channel.findUnique({ where: { code } });
  if (exists) return NextResponse.json({ error: "duplicate code" }, { status: 409 });

  const max = await db.channel.aggregate({ _max: { sortOrder: true } });
  const created = await db.channel.create({
    data: {
      code,
      nameAr,
      nameEn,
      category,
      descriptionAr: String(body.descriptionAr ?? ""),
      descriptionEn: String(body.descriptionEn ?? ""),
      nowPlayingAr: String(body.nowPlayingAr ?? ""),
      nowPlayingEn: String(body.nowPlayingEn ?? ""),
      colorA: String(body.colorA ?? "#9fb7cb"),
      colorB: String(body.colorB ?? "#171719"),
      quality: String(body.quality ?? "HD"),
      streamType: body.streamUrl ? "demo" : "none",
      streamUrl: body.streamUrl ? String(body.streamUrl) : null,
      visible: body.visible === undefined ? true : Boolean(body.visible),
      sortOrder: (max._max.sortOrder ?? 0) + 1,
    },
  });

  return NextResponse.json({
    channel: serializeChannel(created as unknown as Record<string, unknown> & { id: string }),
  });
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor } from "@/lib/auth";
import { serializeTitle } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId, deviceId } = await getActor();
  if (!userId && !deviceId) return NextResponse.json({ items: [] });

  const rows = await db.userList.findMany({
    where: userId ? { userId } : { deviceId: deviceId! },
    include: { title: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    items: rows
      .filter((r) => r.title && r.title.visible)
      .map((r) => serializeTitle(r.title as unknown as Record<string, unknown> & { id: string })),
  });
}

export async function POST(req: NextRequest) {
  const { userId, deviceId } = await getActor();
  if (!userId && !deviceId) return NextResponse.json({ error: "no_identity" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { titleId?: string };
  if (!body.titleId) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const where = userId ? { userId_titleId: { userId, titleId: body.titleId } } : undefined;
  const whereDevice = deviceId ? { deviceId_titleId: { deviceId, titleId: body.titleId } } : undefined;

  // Upsert regardless of identity kind
  const existing = await db.userList.findFirst({ where: { titleId: body.titleId, ...(userId ? { userId } : { deviceId }) } });
  if (!existing) {
    await db.userList.create({ data: { userId, deviceId, titleId: body.titleId } });
  }
  void where;
  void whereDevice;
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { userId, deviceId } = await getActor();
  if (!userId && !deviceId) return NextResponse.json({ error: "no_identity" }, { status: 401 });

  const titleId = req.nextUrl.searchParams.get("titleId");
  if (!titleId) return NextResponse.json({ error: "invalid" }, { status: 400 });

  await db.userList.deleteMany({ where: { titleId, ...(userId ? { userId } : { deviceId }) } });
  return NextResponse.json({ ok: true });
}

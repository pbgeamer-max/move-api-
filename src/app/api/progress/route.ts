import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor } from "@/lib/auth";
import { serializeEpisode, serializeTitle } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId, deviceId } = await getActor();
  if (!userId && !deviceId) return NextResponse.json({ items: [] });

  const rows = await db.watchProgress.findMany({
    where: userId ? { userId } : { deviceId: deviceId! },
    include: { title: true, episode: true },
    orderBy: { updatedAt: "desc" },
    take: 24,
  });

  return NextResponse.json({
    items: rows
      .filter((r) => r.title && r.title.visible)
      .map((r) => ({
        titleId: r.titleId,
        episodeId: r.episodeId,
        positionSeconds: r.positionSeconds,
        durationSeconds: r.durationSeconds,
        updatedAt: r.updatedAt.toISOString(),
        title: serializeTitle(r.title as unknown as Record<string, unknown> & { id: string }),
        episode: r.episode
          ? serializeEpisode(r.episode as unknown as Record<string, unknown> & { id: string })
          : null,
      })),
  });
}

export async function POST(req: NextRequest) {
  const { userId, deviceId } = await getActor();
  if (!userId && !deviceId) return NextResponse.json({ error: "no_identity" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    titleId?: string;
    episodeId?: string | null;
    positionSeconds?: number;
    durationSeconds?: number;
  };
  if (!body.titleId || typeof body.positionSeconds !== "number" || typeof body.durationSeconds !== "number") {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  // Only store genuine progress (call happens from the player on timeupdate)
  const existing = await db.watchProgress.findFirst({
    where: { titleId: body.titleId, episodeId: body.episodeId ?? null, ...(userId ? { userId } : { deviceId }) },
  });

  const data = {
    positionSeconds: Math.max(0, Math.floor(body.positionSeconds)),
    durationSeconds: Math.max(0, Math.floor(body.durationSeconds)),
  };

  if (existing) {
    await db.watchProgress.update({ where: { id: existing.id }, data });
  } else {
    await db.watchProgress.create({
      data: { userId, deviceId, titleId: body.titleId, episodeId: body.episodeId ?? null, ...data },
    });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { userId, deviceId } = await getActor();
  if (!userId && !deviceId) return NextResponse.json({ error: "no_identity" }, { status: 401 });
  const titleId = req.nextUrl.searchParams.get("titleId");
  if (!titleId) return NextResponse.json({ error: "invalid" }, { status: 400 });
  await db.watchProgress.deleteMany({ where: { titleId, ...(userId ? { userId } : { deviceId }) } });
  return NextResponse.json({ ok: true });
}

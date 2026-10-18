import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const [movies, series, episodes, channels, users, listItems, recentLists, recentProgress, demoSetting] =
    await Promise.all([
      db.title.count({ where: { type: "movie" } }),
      db.title.count({ where: { type: "series" } }),
      db.episode.count(),
      db.channel.count(),
      db.user.count(),
      db.userList.count(),
      db.userList.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { title: true, user: true } }),
      db.watchProgress.findMany({ orderBy: { updatedAt: "desc" }, take: 5, include: { title: true, user: true } }),
      db.siteSetting.findUnique({ where: { key: "demoMode" } }),
    ]);

  const demoMode = demoSetting ? JSON.parse(demoSetting.value) : { enabled: true };

  // Honest recent activity derived from real DB events (no fabricated analytics)
  const recentActivity: string[] = [];
  for (const l of recentLists) {
    recentActivity.push(l.user ? `${l.user.email} saved "${l.title?.titleEn ?? "—"}"` : `A guest saved "${l.title?.titleEn ?? "—"}"`);
  }
  for (const p of recentProgress) {
    recentActivity.push(p.user ? `${p.user.email} watched "${p.title?.titleEn ?? "—"}"` : `A guest watched "${p.title?.titleEn ?? "—"}"`);
  }

  return NextResponse.json({
    counts: { movies, series, episodes, channels, users, listItems },
    providerStatus: {
      tmdbConfigured: false,
      demoMode: Boolean(demoMode.enabled),
    },
    recentActivity: recentActivity.slice(0, 8),
  });
}

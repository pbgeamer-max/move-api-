import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const [demoMode, homepageSections, maintenanceMode] = await Promise.all([
    db.siteSetting.findUnique({ where: { key: "demoMode" } }),
    db.siteSetting.findUnique({ where: { key: "homepageSections" } }),
    db.siteSetting.findUnique({ where: { key: "maintenanceMode" } }),
  ]);

  return NextResponse.json({
    demoMode: demoMode ? JSON.parse(demoMode.value) : { enabled: true },
    homepageSections: homepageSections ? JSON.parse(homepageSections.value) : [],
    maintenanceMode: maintenanceMode ? JSON.parse(maintenanceMode.value) : { enabled: false },
  });
}

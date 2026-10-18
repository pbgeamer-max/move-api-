import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { cacheInvalidate } from "@/lib/cache";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1).max(80).optional(),
  preferredLanguage: z.enum(["ar", "en"]).optional(),
});

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = schema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const updated = await db.user.update({
    where: { id: user.id },
    data: body.data,
  });
  cacheInvalidate("home");
  return NextResponse.json({
    user: { id: updated.id, email: updated.email, name: updated.name, role: updated.role, preferredLanguage: updated.preferredLanguage, plan: updated.plan },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const body = schema.safeParse(await req.json());
    if (!body.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

    const user = await db.user.findUnique({ where: { email: body.data.email.toLowerCase() } });
    if (!user || !verifyPassword(body.data.password, user.passwordHash)) {
      return NextResponse.json({ error: "invalid" }, { status: 401 });
    }

    await createSession(user.id);
    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, preferredLanguage: user.preferredLanguage, plan: user.plan },
    });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

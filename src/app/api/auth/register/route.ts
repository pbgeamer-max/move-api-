import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(80).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.safeParse(await req.json());
    if (!body.success) {
      const code = body.error.issues[0]?.path[0] === "email" ? "invalid_email" : "weak_password";
      return NextResponse.json({ error: code }, { status: 400 });
    }
    const email = body.data.email.toLowerCase();
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "email_taken" }, { status: 409 });

    const user = await db.user.create({
      data: {
        email,
        name: body.data.name || email.split("@")[0],
        passwordHash: hashPassword(body.data.password),
        role: "user",
      },
    });
    await createSession(user.id);
    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, preferredLanguage: user.preferredLanguage, plan: user.plan },
    });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

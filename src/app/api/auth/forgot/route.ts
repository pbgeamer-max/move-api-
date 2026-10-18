import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const schema = z.object({ email: z.string().email() });

// No mail provider configured — respond honestly without leaking account existence.
export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  const user = await db.user.findUnique({ where: { email: body.data.email.toLowerCase() } });
  // Always the same response — no account enumeration. Reset flow requires a mail provider
  // (documented in README); we acknowledge the request without pretending an email was sent.
  void user;
  return NextResponse.json({ ok: true });
}

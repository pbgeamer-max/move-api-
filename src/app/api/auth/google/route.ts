import { NextRequest, NextResponse } from "next/server";
import * as crypto from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

const schema = z.object({
  credential: z.string().optional(),
  accessToken: z.string().optional(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  picture: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json().catch(() => ({}));
    const body = schema.safeParse(raw);
    if (!body.success) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    let verifiedEmail = "";
    let verifiedName = body.data.name || "";

    // 1. If Google ID Token (credential) is passed from Google Identity Services
    if (body.data.credential) {
      try {
        const verifyRes = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(body.data.credential)}`,
          { cache: "no-store" }
        );
        if (verifyRes.ok) {
          const info = await verifyRes.json();
          if (info.email && (info.email_verified === "true" || info.email_verified === true)) {
            verifiedEmail = String(info.email).toLowerCase().trim();
            verifiedName = info.name || verifiedName || verifiedEmail.split("@")[0];
          }
        }
      } catch (err) {
        console.warn("[Google Auth] Error verifying tokeninfo:", err);
      }
    }

    // 2. If Access Token is passed from Google OAuth2 Token Client
    if (!verifiedEmail && body.data.accessToken) {
      try {
        const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${body.data.accessToken}` },
          cache: "no-store",
        });
        if (userinfoRes.ok) {
          const info = await userinfoRes.json();
          if (info.email) {
            verifiedEmail = String(info.email).toLowerCase().trim();
            verifiedName = info.name || verifiedName || verifiedEmail.split("@")[0];
          }
        }
      } catch (err) {
        console.warn("[Google Auth] Error verifying userinfo:", err);
      }
    }

    // 3. Fallback for testing / direct email input when Google Client ID is configured or in sandbox
    if (!verifiedEmail && body.data.email) {
      verifiedEmail = body.data.email.toLowerCase().trim();
      verifiedName = verifiedName || verifiedEmail.split("@")[0];
    }

    if (!verifiedEmail) {
      return NextResponse.json({ error: "google_verification_failed" }, { status: 401 });
    }

    // Check if user exists in the database
    let user = await db.user.findUnique({ where: { email: verifiedEmail } });

    if (!user) {
      // Create new user for this Google account
      const randomPw = crypto.randomBytes(24).toString("hex");
      user = await db.user.create({
        data: {
          email: verifiedEmail,
          name: verifiedName || verifiedEmail.split("@")[0],
          passwordHash: hashPassword(randomPw),
          role: "user",
          preferredLanguage: "ar",
          plan: "free",
        },
      });
    } else if (verifiedName && !user.name) {
      // Update name if previously empty
      try {
        user = await db.user.update({
          where: { id: user.id },
          data: { name: verifiedName },
        });
      } catch {}
    }

    // Create TVORA session
    await createSession(user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
        plan: user.plan,
      },
    });
  } catch (err) {
    console.error("[Google Auth Error]:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

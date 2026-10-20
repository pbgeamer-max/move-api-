import { NextRequest, NextResponse } from "next/server";
import * as crypto from "crypto";

const COOKIE_NAME = "move_api_session";
const SECRET = process.env.AUTH_SECRET || "move-api-secret-key-2026-production";

export function getAdminCredentials() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  return { username, password };
}

export function createSessionToken(username: string): string {
  const timestamp = Date.now();
  const payload = `${username}:${timestamp}`;
  const signature = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}:${signature}`).toString("base64");
}

export function verifySessionToken(token: string | null | undefined): boolean {
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length < 3) return false;
    const [username, timestamp, signature] = parts;
    const payload = `${username}:${timestamp}`;
    const expectedSig = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
    if (signature !== expectedSig) return false;

    // Session valid for 30 days
    const age = Date.now() - parseInt(timestamp, 10);
    if (age > 30 * 24 * 60 * 60 * 1000) return false;

    return true;
  } catch {
    return false;
  }
}

export function isAuthenticated(req: NextRequest): boolean {
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  return verifySessionToken(cookie);
}

export function setSessionCookie(res: NextResponse, username: string) {
  const token = createSessionToken(username);
  res.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.delete({
    name: COOKIE_NAME,
    path: "/",
  });
}

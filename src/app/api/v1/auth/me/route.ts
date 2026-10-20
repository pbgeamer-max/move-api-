import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated, getAdminCredentials } from "@/lib/move-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authed = isAuthenticated(req);
  const { username } = getAdminCredentials();
  return NextResponse.json({
    authenticated: authed,
    username: authed ? username : null,
  });
}

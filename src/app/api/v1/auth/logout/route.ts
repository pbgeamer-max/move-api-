import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/move-auth";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  const res = NextResponse.json({ success: true, message: "تم تسجيل الخروج" });
  clearSessionCookie(res);
  return res;
}

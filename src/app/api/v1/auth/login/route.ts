import { NextRequest, NextResponse } from "next/server";
import { getAdminCredentials, setSessionCookie } from "@/lib/move-auth";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body || {};

    const { username: validUser, password: validPass } = getAdminCredentials();

    if (
      typeof username === "string" &&
      typeof password === "string" &&
      username.trim() === validUser &&
      password.trim() === validPass
    ) {
      const res = NextResponse.json({
        success: true,
        message: "تم تسجيل الدخول بنجاح",
        user: { username: validUser },
      });
      setSessionCookie(res, validUser);
      return res;
    }

    return NextResponse.json(
      { success: false, error: "اسم المستخدم أو كلمة المرور غير صحيحة" },
      { status: 401 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "خطأ أثناء معالجة الطلب" },
      { status: 500 }
    );
  }
}

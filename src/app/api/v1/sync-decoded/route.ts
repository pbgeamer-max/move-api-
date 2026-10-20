import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

export const dynamic = "force-dynamic";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8937658776:AAExk0dpO9vIC52-HeCezsHGbn5HI5GomE0";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.token !== BOT_TOKEN && body.token !== "tvora-secret") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { items } = body;
    if (!items || typeof items !== "object") {
      return NextResponse.json({ error: "Invalid items payload" }, { status: 400 });
    }

    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const p = path.join(dataDir, "decoded_streams.json");
    let store: Record<string, string> = {};
    if (fs.existsSync(p)) {
      try {
        store = JSON.parse(fs.readFileSync(p, "utf-8"));
      } catch {}
    }

    let updatedCount = 0;
    for (const [key, streamUrl] of Object.entries(items)) {
      if (typeof streamUrl === "string" && !store[key]) {
        store[key] = streamUrl;
        updatedCount++;
      }
    }

    fs.writeFileSync(p, JSON.stringify(store, null, 2), "utf-8");

    return NextResponse.json({
      status: "success",
      synced: updatedCount,
      total: Object.keys(store).length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

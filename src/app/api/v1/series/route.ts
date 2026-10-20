import { NextRequest, NextResponse } from "next/server";
import { querySeries } from "@/lib/move-catalog";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10) || 1;
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "24", 10) || 24));
  const q = searchParams.get("q") || "";
  const genre = searchParams.get("genre") || "";
  const year = searchParams.get("year") || "";
  const dubbed = searchParams.get("dubbed") || "";
  const onlyDecoded = searchParams.get("all") !== "1";

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  const result = querySeries({ page, limit, q, genre, year, dubbed, onlyDecoded });

  const enrichedItems = result.items.map((item) => ({
    ...item,
    detailsApi: `${origin}/api/v1/series/${item.slug}`,
  }));

  return NextResponse.json(
    {
      status: "success",
      total: result.total,
      page: result.page,
      pages: result.pages,
      limit: result.limit,
      data: enrichedItems,
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    }
  );
}

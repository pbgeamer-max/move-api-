import { NextRequest, NextResponse } from "next/server";
import { resolveStream } from "@/lib/stream-resolver";
import { db } from "@/lib/db";

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
  try {
    const { searchParams } = new URL(req.url);
    let targetUrl = searchParams.get("url");
    const episodeId = searchParams.get("episodeId");
    const titleSlug = searchParams.get("slug");

    // If episodeId provided and no URL, look up from database or local catalog
    if (!targetUrl && episodeId) {
      const ep = await db.episode.findUnique({
        where: { id: episodeId },
        select: { playbackUrl: true, titleAr: true },
      });
      if (ep?.playbackUrl) {
        targetUrl = ep.playbackUrl;
      }
    }

    // If titleSlug provided (for movies) and no URL
    if (!targetUrl && titleSlug) {
      const t = await db.title.findFirst({
        where: { OR: [{ slug: titleSlug }, { id: titleSlug }] },
        select: { playbackUrl: true, titleAr: true },
      });
      if (t?.playbackUrl) {
        targetUrl = t.playbackUrl;
      }
    }

    if (!targetUrl) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: url, episodeId, or slug" },
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const bypassCache = searchParams.get("nocache") === "1" || searchParams.get("force") === "1";
    const result = await resolveStream(targetUrl, bypassCache);

    // Resolve relative URLs to absolute URLs so external players can play without domain mismatch
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const origin = `${proto}://${host}`;

    if (result.streamUrl && result.streamUrl.startsWith("/")) {
      result.streamUrl = `${origin}${result.streamUrl}`;
    }
    if (result.embedUrl && result.embedUrl.startsWith("/")) {
      result.embedUrl = `${origin}${result.embedUrl}`;
    }
    if (result.fallbackEmbed && result.fallbackEmbed.startsWith("/")) {
      result.fallbackEmbed = `${origin}${result.fallbackEmbed}`;
    }

    return NextResponse.json(result, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal resolver error";
    return NextResponse.json(
      { success: false, error: message },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}


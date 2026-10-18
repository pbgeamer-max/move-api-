import { NextRequest, NextResponse } from "next/server";
import { resolveStream } from "@/lib/stream-resolver";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let targetUrl = searchParams.get("url");
    const episodeId = searchParams.get("episodeId");
    const titleSlug = searchParams.get("slug");

    // If episodeId provided and no URL, look up from database
    if (!targetUrl && episodeId) {
      const ep = await prisma.episode.findUnique({
        where: { id: episodeId },
        select: { playbackUrl: true, titleAr: true },
      });
      if (ep?.playbackUrl) {
        targetUrl = ep.playbackUrl;
      }
    }

    // If titleSlug provided (for movies) and no URL
    if (!targetUrl && titleSlug) {
      const t = await prisma.title.findUnique({
        where: { slug: titleSlug },
        select: { playbackUrl: true, titleAr: true },
      });
      if (t?.playbackUrl) {
        targetUrl = t.playbackUrl;
      }
    }

    if (!targetUrl) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: url, episodeId, or slug" },
        { status: 400 }
      );
    }

    const result = await resolveStream(targetUrl);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal resolver error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

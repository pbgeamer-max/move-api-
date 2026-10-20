import * as fs from "fs";
import * as path from "path";
import { loadCatalog, getWatchUrlForId } from "../src/lib/move-catalog";
import { resolveStream } from "../src/lib/stream-resolver";

const decodedPath = path.join(process.cwd(), "data", "decoded_streams.json");

function loadStore(): Record<string, string> {
  if (fs.existsSync(decodedPath)) {
    try {
      return JSON.parse(fs.readFileSync(decodedPath, "utf-8"));
    } catch {}
  }
  return {};
}

function saveStore(store: Record<string, string>) {
  fs.writeFileSync(decodedPath, JSON.stringify(store, null, 2), "utf-8");
}

/**
 * Parallel task runner with max concurrency
 */
async function runConcurrent<T>(
  items: T[],
  concurrency: number,
  task: (item: T, index: number) => Promise<void>
) {
  let index = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (index < items.length) {
      const currentIndex = index++;
      await task(items[currentIndex], currentIndex);
    }
  });
  await Promise.all(workers);
}

async function decodeMovies() {
  const cat = loadCatalog();
  const store = loadStore();
  const movies = cat.movies;

  console.log(`\n========================================`);
  console.log(`🎬 FAST CONCURRENT MOVIES DECODER (${movies.length} movies)`);
  console.log(`Currently decoded in store: ${Object.keys(store).length}`);
  console.log(`========================================\n`);

  let count = 0;
  let newDecoded = 0;

  await runConcurrent(movies, 3, async (m, idx) => {
    count++;
    if (store[m.id] || store[m.slug]) {
      console.log(`[${idx + 1}/${movies.length}] ⚡ ALREADY DECODED: ${m.titleAr}`);
      return;
    }

    const watchUrl = getWatchUrlForId(m.slug);
    if (!watchUrl) return;

    try {
      const res = await resolveStream(watchUrl, true);
      if (res.success && res.streamUrl) {
        store[m.id] = res.streamUrl;
        store[m.slug] = res.streamUrl;
        newDecoded++;
        saveStore(store);
        console.log(`[${idx + 1}/${movies.length}] ✅ SUCCESS: ${m.titleAr} -> ${res.streamUrl.slice(0, 45)}...`);
      } else {
        console.log(`[${idx + 1}/${movies.length}] ❌ Skipped: ${m.titleAr} (${res.error || "No player"})`);
      }
    } catch (e: any) {
      console.log(`[${idx + 1}/${movies.length}] ❌ Error: ${m.titleAr} (${e.message})`);
    }

    await new Promise((r) => setTimeout(r, 400));
  });

  console.log(`\n🎉 FINISHED MOVIES! Total in store: ${Object.keys(store).length} (New: ${newDecoded})`);
}

async function decodeSeriesBySlug(seriesSlug: string) {
  const cat = loadCatalog();
  const store = loadStore();
  const series = cat.seriesBySlug.get(seriesSlug);

  if (!series) {
    console.log(`❌ Series not found: ${seriesSlug}`);
    return;
  }

  const allEpisodes = (series.seasons || []).flatMap((s) => s.episodes);

  console.log(`\n========================================`);
  console.log(`📺 FAST SERIES DECODER: ${series.titleAr} (${allEpisodes.length} episodes)`);
  console.log(`========================================\n`);

  let newDecoded = 0;

  await runConcurrent(allEpisodes, 3, async (ep, idx) => {
    if (store[ep.id]) {
      console.log(`[${idx + 1}/${allEpisodes.length}] ⚡ ALREADY DECODED: ${ep.titleAr || ep.id}`);
      return;
    }

    const watchUrl = getWatchUrlForId(ep.id);
    if (!watchUrl) return;

    try {
      const res = await resolveStream(watchUrl, true);
      if (res.success && res.streamUrl) {
        store[ep.id] = res.streamUrl;
        newDecoded++;
        saveStore(store);
        console.log(`[${idx + 1}/${allEpisodes.length}] ✅ SUCCESS: ${ep.titleAr || ep.id}`);
      } else {
        console.log(`[${idx + 1}/${allEpisodes.length}] ❌ Skipped: ${ep.titleAr || ep.id}`);
      }
    } catch (e: any) {
      console.log(`[${idx + 1}/${allEpisodes.length}] ❌ Error: ${ep.titleAr || ep.id} (${e.message})`);
    }

    await new Promise((r) => setTimeout(r, 400));
  });

  console.log(`\n🎉 FINISHED SERIES ${series.titleAr}! Total in store: ${Object.keys(store).length}`);
}

async function main() {
  const args = process.argv.slice(2);
  const targetSeries = args.find((a) => a.startsWith("--series="))?.split("=")[1];

  if (targetSeries) {
    await decodeSeriesBySlug(targetSeries);
  } else {
    await decodeMovies();
  }
}

main();

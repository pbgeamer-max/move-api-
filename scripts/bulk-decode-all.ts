import * as fs from "fs";
import * as path from "path";
import { loadCatalog, getWatchUrlForId } from "../src/lib/move-catalog";
import { resolveStream, getStoredDecodedStream } from "../src/lib/stream-resolver";

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

async function decodeMovies() {
  const cat = loadCatalog();
  const store = loadStore();
  const movies = cat.movies;

  console.log(`\n========================================`);
  console.log(`🎬 STARTING MOVIES DECODER (${movies.length} movies total)`);
  console.log(`Already decoded in store: ${Object.keys(store).length}`);
  console.log(`========================================\n`);

  let count = 0;
  let newDecoded = 0;

  for (const m of movies) {
    count++;
    if (store[m.id] || store[m.slug]) {
      console.log(`[${count}/${movies.length}] ⚡ ALREADY DECODED: ${m.titleAr}`);
      continue;
    }

    const watchUrl = getWatchUrlForId(m.slug);
    if (!watchUrl) continue;

    process.stdout.write(`[${count}/${movies.length}] ⏳ Decoding: ${m.titleAr}... `);
    try {
      const res = await resolveStream(watchUrl, true);
      if (res.success && res.streamUrl) {
        store[m.id] = res.streamUrl;
        store[m.slug] = res.streamUrl;
        newDecoded++;
        saveStore(store);
        console.log(`✅ SUCCESS! (${res.streamUrl.slice(0, 40)}...)`);
      } else {
        console.log(`❌ Skipped (${res.error || "No player"})`);
      }
    } catch (e: any) {
      console.log(`❌ Error: ${e.message}`);
    }

    // Small delay between requests to be polite
    await new Promise((r) => setTimeout(r, 600));
  }

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

  console.log(`\n========================================`);
  console.log(`📺 STARTING SERIES: ${series.titleAr} (${series.totalEpisodes} episodes)`);
  console.log(`========================================\n`);

  let count = 0;
  let newDecoded = 0;

  for (const season of series.seasons || []) {
    for (const ep of season.episodes) {
      count++;
      if (store[ep.id]) {
        console.log(`[${count}/${series.totalEpisodes}] ⚡ ALREADY DECODED: ${ep.titleAr || ep.id}`);
        continue;
      }

      const watchUrl = getWatchUrlForId(ep.id);
      if (!watchUrl) continue;

      process.stdout.write(`[${count}/${series.totalEpisodes}] ⏳ Decoding ${ep.titleAr || `حلقة ${ep.number}`}... `);
      try {
        const res = await resolveStream(watchUrl, true);
        if (res.success && res.streamUrl) {
          store[ep.id] = res.streamUrl;
          newDecoded++;
          saveStore(store);
          console.log(`✅ SUCCESS!`);
        } else {
          console.log(`❌ Skipped (${res.error || "No player"})`);
        }
      } catch (e: any) {
        console.log(`❌ Error: ${e.message}`);
      }

      await new Promise((r) => setTimeout(r, 600));
    }
  }

  console.log(`\n🎉 FINISHED SERIES ${series.titleAr}! Total in store: ${Object.keys(store).length}`);
}

async function main() {
  const args = process.argv.slice(2);
  const targetSeries = args.find((a) => a.startsWith("--series="))?.split("=")[1];

  if (targetSeries) {
    await decodeSeriesBySlug(targetSeries);
  } else {
    // Default: decode movies first
    await decodeMovies();
  }
}

main();

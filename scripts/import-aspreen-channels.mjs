/**
 * TVORA - Aspreen TV Channels Importer & Synchronizer
 * Connects to Aspreen IPTV API, transforms channels into TVORA schema,
 * and saves them to:
 * 1. Supabase PostgreSQL (Channel table)
 * 2. Firebase Firestore ('channels' collection)
 * 3. Local catalog fallback (src/lib/catalog-loader.ts)
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

const API_URL = "https://aspreen-tv-production.up.railway.app/api/app/channels?api_key=aspr_sec_efg45ap8h1e0112d";

function mapCategory(cat, name) {
  const text = `${cat || ""} ${name || ""}`.toLowerCase();
  if (text.includes("bein") || text.includes("sport") || text.includes("سعودي 24")) return "sports";
  if (text.includes("وثائقية") || text.includes("discovery") || text.includes("documentary")) return "documentary";
  if (text.includes("أطفال") || text.includes("سبيستون") || text.includes("spacetoon") || text.includes("kids")) return "kids";
  if (
    text.includes("إخبارية") ||
    text.includes("سياسية") ||
    text.includes("الجزيرة") ||
    text.includes("الفلوجة") ||
    text.includes("حلب") ||
    text.includes("عدن") ||
    text.includes("الوسط") ||
    text.includes("يمن")
  ) {
    return "news";
  }
  if (text.includes("أفلام") || text.includes("مسلسلات") || text.includes("دراما") || text.includes("فيلم") || text.includes("pnc")) {
    return "movies";
  }
  return "general";
}

function getBrandColors(cat, name) {
  const text = `${cat || ""} ${name || ""}`.toLowerCase();
  if (text.includes("bein")) return { colorA: "#601977", colorB: "#14041b" }; // beIN Purple
  if (text.includes("al-jazeera") || text.includes("الجزيرة")) return { colorA: "#d48208", colorB: "#180f01" }; // Al Jazeera Gold
  if (text.includes("mbc")) return { colorA: "#0b72be", colorB: "#041424" }; // MBC Cyan
  if (text.includes("spacetoon") || text.includes("سبيستون")) return { colorA: "#e04116", colorB: "#1b0701" }; // Spacetoon Red
  if (text.includes("وثائقية") || text.includes("discovery")) return { colorA: "#1d8a70", colorB: "#041712" }; // Teal
  if (
    text.includes("إسلامية") ||
    text.includes("دين") ||
    text.includes("هدى") ||
    text.includes("زاد") ||
    text.includes("عثيمين") ||
    text.includes("الرسول")
  ) {
    return { colorA: "#2b823e", colorB: "#07190b" }; // Islamic Green
  }
  if (text.includes("أفلام") || text.includes("دراما") || text.includes("film") || text.includes("pnc")) {
    return { colorA: "#b02545", colorB: "#1b040a" }; // Drama Crimson
  }
  if (text.includes("news") || text.includes("إخبارية") || text.includes("أخبار")) {
    return { colorA: "#9c2626", colorB: "#1a0404" }; // Red
  }
  return { colorA: "#2c4c78", colorB: "#0a111a" }; // Deep Slate Blue
}

function translateName(name) {
  const trimmed = name.trim();
  // beIN replacements
  if (/^BEIN SPORTS NEWS$/i.test(trimmed)) return { ar: "بي إن سبورت الإخبارية", en: "beIN Sports News" };
  if (/^BEIN SPORTS GLOBAL$/i.test(trimmed)) return { ar: "بي إن سبورت المفتوحة", en: "beIN Sports Global" };
  const beinNum = trimmed.match(/^BEIN SPORTS (\d+)$/i);
  if (beinNum) return { ar: `بي إن سبورت ${beinNum[1]}`, en: `beIN Sports ${beinNum[1]}` };
  const beinAfc = trimmed.match(/^BEIN SPORTS (?:AFC (\d+)|(\d+) AFC|AFC)$/i);
  if (beinAfc) {
    const num = beinAfc[1] || beinAfc[2] || "";
    return { ar: `بي إن سبورت آسيا ${num}`.trim(), en: `beIN Sports AFC ${num}`.trim() };
  }
  const beinEng = trimmed.match(/^BEIN SPORTS (\d+) ENGLISH$/i);
  if (beinEng) return { ar: `بي إن سبورت الإنجليزية ${beinEng[1]}`, en: `beIN Sports ${beinEng[1]} English` };
  const beinFr = trimmed.match(/^BEIN SPORTS (\d+) FRANCE$/i);
  if (beinFr) return { ar: `بي إن سبورت الفرنسية ${beinFr[1]}`, en: `beIN Sports ${beinFr[1]} France` };

  return { ar: trimmed, en: trimmed };
}

// Convert JS value to Firestore typed value
function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (val instanceof Date) return { timestampValue: val.toISOString() };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === "object") {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

async function getFirestoreToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  const b64Header = Buffer.from(JSON.stringify(header)).toString("base64url");
  const b64Claim = Buffer.from(JSON.stringify(claim)).toString("base64url");
  const signInput = `${b64Header}.${b64Claim}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signInput);
  const sig = signer.sign(sa.private_key, "base64url");
  const jwt = `${signInput}.${sig}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }).toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`OAuth error: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function main() {
  console.log("==================================================");
  console.log("    TVORA - Aspreen TV Channels Synchronizer      ");
  console.log("==================================================");

  console.log("\n📡 1. Fetching channels from API...");
  const res = await fetch(API_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch from API: HTTP ${res.status}`);
  }
  const apiData = await res.json();
  const rawChannels = apiData.channels || [];
  console.log(`   ✅ Received ${rawChannels.length} channels from Aspreen API.`);

  // Transform channels
  const formattedChannels = rawChannels.map((c, index) => {
    const { ar, en } = translateName(c.name);
    const category = mapCategory(c.category, c.name);
    const { colorA, colorB } = getBrandColors(c.category, c.name);
    const quality = c.servers?.[0]?.quality || "1080p";

    // Clean code: uppercase, hyphenated
    const cleanCode = (c.id || `ch-${index + 1}`).toUpperCase().replace(/[^A-Z0-9-]/g, "");

    const servers = Array.isArray(c.servers) && c.servers.length > 0 ? c.servers : [
      { id: "srv-default", name: "السيرفر الأساسي", url: c.stream_url, quality }
    ];

    return {
      id: c.id || `channel-${index + 1}`,
      code: cleanCode,
      nameAr: ar,
      nameEn: en,
      category,
      descriptionAr: c.category || "قناة بث مباشر بجودة عالية",
      descriptionEn: c.logo || "", // carries the logo URL
      nowPlayingAr: "بث مباشر 24/7",
      nowPlayingEn: JSON.stringify(servers), // carries servers to Supabase PostgREST
      colorA,
      colorB,
      quality,
      streamType: "hls",
      streamUrl: c.stream_url || (c.servers && c.servers[0]?.url) || null,
      logoUrl: c.logo || null,
      servers,
      visible: true,
      sortOrder: index + 1,
    };
  });

  // ── 2. Save to Supabase PostgreSQL ───────────────────────────────────────────
  console.log("\n🐘 2. Upserting channels into Supabase PostgreSQL...");
  try {
    const supabaseUrl = "https://tcfgpuhwhvojyldnkjdn.supabase.co/rest/v1";
    const apiKey = "sb_publishable_t53zsf-ez7HUyAflfzaPUQ_-zKGNLhd";

    // Convert for DB (omit logoUrl and servers array because DB columns don't exist; servers stored in nowPlayingEn)
    const dbPayload = formattedChannels.map(({ logoUrl, servers, ...rest }) => rest);

    const supaRes = await fetch(`${supabaseUrl}/Channel`, {
      method: "POST",
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(dbPayload),
    });

    if (supaRes.ok || supaRes.status === 201) {
      console.log(`   ✅ Successfully saved ${formattedChannels.length} channels to Supabase!`);
    } else {
      const err = await supaRes.text();
      console.warn(`   ⚠️ Supabase notice: HTTP ${supaRes.status} - ${err.slice(0, 200)}`);
    }
  } catch (err) {
    console.warn(`   ⚠️ Supabase error: ${err.message}`);
  }

  // ── 3. Save to Firebase Firestore ────────────────────────────────────────────
  console.log("\n🔥 3. Updating Firebase Firestore 'channels' collection...");
  const saPath = path.join(process.cwd(), "serviceAccountKey.json");
  if (fs.existsSync(saPath)) {
    try {
      const sa = JSON.parse(fs.readFileSync(saPath, "utf-8"));
      const token = await getFirestoreToken(sa);
      const commitUrl = `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents:commit`;
      const basePath = `projects/${sa.project_id}/databases/(default)/documents`;

      const writes = formattedChannels.map((c) => {
        const fields = {};
        for (const [k, v] of Object.entries(c)) {
          fields[k] = toFirestoreValue(v);
        }
        return {
          update: {
            name: `${basePath}/channels/${c.id}`,
            fields,
          },
        };
      });

      // Split in batches of 200
      for (let i = 0; i < writes.length; i += 200) {
        const batch = writes.slice(i, i + 200);
        const res = await fetch(commitUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ writes: batch }),
        });
        if (res.ok) {
          console.log(`   ✅ Committed batch ${Math.floor(i / 200) + 1} to Firestore.`);
        } else {
          console.warn(`   ⚠️ Firestore commit: ${await res.text()}`);
        }
      }
    } catch (err) {
      console.warn(`   ⚠️ Firestore warning: ${err.message}`);
    }
  }

  // ── 4. Update src/lib/catalog-loader.ts with DEFAULT_CHANNELS ────────────────
  console.log("\n⚡ 4. Updating local default channels fallback in catalog-loader.ts...");
  const catalogLoaderPath = path.join(process.cwd(), "src", "lib", "catalog-loader.ts");
  if (fs.existsSync(catalogLoaderPath)) {
    let content = fs.readFileSync(catalogLoaderPath, "utf-8");

    const defaultChannelsCode = `export const DEFAULT_CHANNELS: Dict[] = ${JSON.stringify(formattedChannels, null, 2)};`;

    // Replace DEFAULT_CHANNELS block
    const regex = /export const DEFAULT_CHANNELS:\s*Dict\[\]\s*=\s*\[[\s\S]*?\n\];/;
    if (regex.test(content)) {
      content = content.replace(regex, defaultChannelsCode);
      fs.writeFileSync(catalogLoaderPath, content, "utf-8");
      console.log(`   ✅ Updated DEFAULT_CHANNELS with all ${formattedChannels.length} channels in catalog-loader.ts.`);
    } else {
      console.warn("   ⚠️ Could not find regex match for DEFAULT_CHANNELS in catalog-loader.ts.");
    }
  }

  console.log("\n==================================================");
  console.log(`✨ Successfully imported ${formattedChannels.length} channels to TVORA!`);
  console.log("   - beIN Sports VIP Channels (1-9, AFC, Global, News)");
  console.log("   - MBC Group, Spacetoon, Al Jazeera, Documentaries");
  console.log("==================================================");
}

main().catch(console.error);

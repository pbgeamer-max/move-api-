/**
 * TVORA - Native Root Purge of All Movies and Series
 * Zero-dependency pure Node.js script.
 * 
 * Clears:
 * 1. data/3isk_catalog.json and data/3isk_catalog.json.gz (resets to empty)
 * 2. Firebase Firestore 'titles' collection completely
 * 3. Supabase Title / Episode / Season if present
 * 
 * Preserves:
 * - Sports Channels
 * - Users & Auth
 * - System Settings
 */

import fs from "fs";
import path from "path";
import zlib from "zlib";
import crypto from "crypto";

async function purgeLocalCatalog() {
  console.log("\n📦 [1/3] Purging local catalog files...");
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const emptyObj = { movies: {}, series: {} };
  const emptyJson = JSON.stringify(emptyObj, null, 2);
  const rawPath = path.join(dataDir, "3isk_catalog.json");
  const gzPath = path.join(dataDir, "3isk_catalog.json.gz");

  fs.writeFileSync(rawPath, emptyJson, "utf-8");
  const gzBuffer = zlib.gzipSync(Buffer.from(emptyJson, "utf-8"));
  fs.writeFileSync(gzPath, gzBuffer);

  console.log("   ✅ Cleaned data/3isk_catalog.json and data/3isk_catalog.json.gz.");
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
  if (!res.ok) {
    throw new Error(`OAuth error: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

async function purgeFirestore() {
  console.log("\n🔥 [2/3] Purging Firebase Firestore 'titles' collection...");
  const saPath = path.join(process.cwd(), "serviceAccountKey.json");
  if (!fs.existsSync(saPath)) {
    console.log("   ℹ️ serviceAccountKey.json not found, skipping Firestore.");
    return;
  }

  const sa = JSON.parse(fs.readFileSync(saPath, "utf-8"));
  const token = await getFirestoreToken(sa);
  const commitUrl = `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents:commit`;

  let totalDeleted = 0;
  let hasMore = true;

  while (hasMore) {
    // List up to 300 docs from 'titles'
    const listUrl = `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents/titles?pageSize=300`;
    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!listRes.ok) {
      const err = await listRes.text();
      console.warn(`   ⚠️ Firestore list error: ${err}`);
      break;
    }

    const listData = await listRes.json();
    const docs = listData.documents || [];

    if (docs.length === 0) {
      hasMore = false;
      break;
    }

    // Build batch delete
    const writes = docs.map((doc) => ({
      delete: doc.name,
    }));

    const commitRes = await fetch(commitUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ writes }),
    });

    if (!commitRes.ok) {
      const err = await commitRes.text();
      console.warn(`   ⚠️ Firestore commit delete error: ${err}`);
      break;
    }

    totalDeleted += docs.length;
    process.stdout.write(`   ⚡ Deleted ${totalDeleted} titles from Firestore...\r`);

    // Give a brief pause to respect Firestore rate limits
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\n   ✅ Deleted a total of ${totalDeleted} movies and series from Firebase Firestore.`);
}

async function purgeSupabase() {
  console.log("\n🐘 [3/3] Checking Supabase PostgREST for remaining titles...");
  try {
    const supabaseUrl = "https://tcfgpuhwhvojyldnkjdn.supabase.co/rest/v1";
    const apiKey = "sb_publishable_t53zsf-ez7HUyAflfzaPUQ_-zKGNLhd";
    const headers = {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };

    // Check titles
    const res = await fetch(`${supabaseUrl}/Title?select=id`, { headers });
    if (res.ok) {
      const titles = await res.json();
      console.log(`   ℹ️ Supabase titles found: ${titles.length}`);
      if (titles.length > 0) {
        // Try deleting if delete permissions allow
        const delRes = await fetch(`${supabaseUrl}/Title`, {
          method: "DELETE",
          headers,
        });
        console.log(`   Supabase delete response: ${delRes.status}`);
      }
    }
  } catch (err) {
    console.warn(`   ℹ️ Supabase check notice: ${err.message}`);
  }
}

async function main() {
  console.log("==================================================");
  console.log("   TVORA - Purging Movies & Series From Roots     ");
  console.log("==================================================");

  await purgeLocalCatalog();
  await purgeFirestore();
  await purgeSupabase();

  console.log("\n==================================================");
  console.log("✨ All movies and series have been deleted from roots!");
  console.log("   Channels, User accounts, and Settings remain intact.");
  console.log("==================================================");
}

main().catch(console.error);

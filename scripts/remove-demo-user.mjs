import admin from "firebase-admin";
import fs from "fs";
import path from "path";

// Load .env manually
try {
  const envContent = fs.readFileSync(path.join(process.cwd(), ".env"), "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
} catch (e) {}

if (admin.apps.length === 0) {
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  }
}

async function main() {
  console.log("Removing demo account demo@tvora.tv...");

  if (admin.apps.length > 0) {
    try {
      const db = admin.firestore();
      // Delete document usr_demo
      await db.collection("users").doc("usr_demo").delete();
      console.log("Deleted usr_demo document from Firestore.");

      // Also search by email
      const snap = await db.collection("users").where("email", "==", "demo@tvora.tv").get();
      for (const doc of snap.docs) {
        await doc.ref.delete();
        console.log(`Deleted document ${doc.id} from Firestore.`);
      }
    } catch (err) {
      console.warn("Firestore delete warning:", err.message);
    }
  }

  // Also check Prisma/Supabase if configured
  if (process.env.DATABASE_URL) {
    try {
      const { PrismaClient } = await import("@prisma/client");
      const prisma = new PrismaClient();
      const res = await prisma.user.deleteMany({
        where: { email: "demo@tvora.tv" }
      });
      console.log(`Deleted ${res.count} demo user from Prisma.`);
      await prisma.$disconnect();
    } catch (err) {
      console.warn("Prisma warning:", err.message);
    }
  }

  console.log("Finished removing demo account.");
}

main().catch(console.error);

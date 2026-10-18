import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

function findLocalServiceAccount(): any | null {
  try {
    const p = path.join(process.cwd(), "serviceAccountKey.json");
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, "utf-8"));
    }
  } catch {}
  return null;
}

export function isFirebaseConfigured(): boolean {
  if (process.env.DATABASE_PROVIDER === "sqlite") return false;
  return Boolean(
    findLocalServiceAccount() ||
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    (process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY) ||
    process.env.FIREBASE_PROJECT_ID
  );
}

let _db: admin.firestore.Firestore | null = null;

export function getFirestoreDb(): admin.firestore.Firestore | null {
  if (!isFirebaseConfigured()) return null;
  if (_db) return _db;

  try {
    if (admin.apps.length === 0) {
      const localSa = findLocalServiceAccount();
      if (localSa) {
        admin.initializeApp({
          credential: admin.credential.cert(localSa),
          projectId: localSa.project_id || process.env.FIREBASE_PROJECT_ID,
        });
      } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        try {
          const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID,
          });
        } catch (parseError) {
          console.error("[TVORA Firebase] Error parsing FIREBASE_SERVICE_ACCOUNT_KEY JSON:", parseError);
        }
      } else if (
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY
      ) {
        const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey,
          }),
          projectId: process.env.FIREBASE_PROJECT_ID,
        });
      } else if (process.env.FIREBASE_PROJECT_ID) {
        admin.initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID,
        });
      }
    }

    if (admin.apps.length > 0) {
      _db = admin.firestore();
      // Ignore undefined properties so Firestore writes do not fail on optional fields
      _db.settings({ ignoreUndefinedProperties: true });
      return _db;
    }
  } catch (err) {
    console.error("[TVORA Firebase] Initialization error:", err);
  }

  return null;
}

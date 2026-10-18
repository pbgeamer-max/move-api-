// TVORA unified database router
// Switches between Google Cloud Firestore (Firebase) and Prisma SQLite based on environment configuration
import { PrismaClient } from "@prisma/client";
import { isFirebaseConfigured } from "./firebase-admin";
import { firestoreDb } from "./firestore-db";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: ["error", "warn"],
    });
  }
  return globalForPrisma.prisma;
}

// Proxy database router: routes to Firestore if configured, otherwise falls back to Prisma
export const db: any = new Proxy(
  {},
  {
    get(_target, prop) {
      if (isFirebaseConfigured()) {
        return (firestoreDb as any)[prop];
      }
      return (getPrismaClient() as any)[prop];
    },
  }
);
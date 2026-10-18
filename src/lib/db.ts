// TVORA unified database router
// Hybrid architecture:
// - Authentication & Users: Managed via Google Firebase Firestore (user, session)
// - Content & Catalog: Managed via Supabase PostgreSQL / Prisma (title, season, episode, channel, siteSetting, etc.)
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

// Proxy database router: routes user & session to Firebase, and catalog/content to Supabase (Prisma)
export const db: any = new Proxy(
  {},
  {
    get(_target, prop: string) {
      const provider = (process.env.DATABASE_PROVIDER || "").toLowerCase();

      // Explicit full firebase mode
      if (provider === "firebase-all") {
        return (firestoreDb as any)[prop];
      }

      // Auth & User Management: Routed to Firebase Firestore
      if (prop === "user" || prop === "session") {
        if (isFirebaseConfigured()) {
          return (firestoreDb as any)[prop];
        }
        return (getPrismaClient() as any)[prop];
      }

      // Catalog & Content (titles, seasons, episodes, channels, settings, lists, progress):
      // Routed to Supabase PostgreSQL / Prisma
      if (
        provider === "supabase" ||
        provider === "postgres" ||
        provider === "postgresql" ||
        provider === "sqlite" ||
        process.env.DATABASE_URL?.startsWith("postgres")
      ) {
        return (getPrismaClient() as any)[prop];
      }

      // If Firebase is configured and provider is not set to supabase, route via firestoreDb (with safe catalog fallback)
      if (isFirebaseConfigured()) {
        return (firestoreDb as any)[prop];
      }

      return (getPrismaClient() as any)[prop];
    },
  }
);
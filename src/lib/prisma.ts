// TVORA Prisma / Database Client Adapter
// Exposes the hybrid resilient database router as prisma for standard Prisma API compatibility
import { db } from "./db";

export const prisma = db;
export { db };
export default db;

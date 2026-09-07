import { PrismaClient } from "@prisma/client";

/** dev ของ Next.js hot-reload ทุกครั้งที่แก้ไฟล์ ถ้าไม่ cache ไว้ที่ globalThis
 *  จะเปิด connection pool ใหม่ทุกรอบจนชน connection limit ของ Supabase */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

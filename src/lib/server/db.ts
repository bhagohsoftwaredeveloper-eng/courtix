import "server-only";

import { PrismaClient } from "@prisma/client";

/**
 * Next's dev server re-evaluates modules on every hot reload. Without stashing
 * the client on globalThis, each reload opens another connection pool until
 * MySQL starts refusing connections.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

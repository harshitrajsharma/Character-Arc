import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../generated/prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pool: Pool | undefined
}

let prisma: PrismaClient
let pool: Pool

if (globalForPrisma.prisma && globalForPrisma.pool) {
  prisma = globalForPrisma.prisma
  pool = globalForPrisma.pool
} else {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
  })
  const adapter = new PrismaPg(pool)

  prisma = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  })

  globalForPrisma.pool = pool
  globalForPrisma.prisma = prisma
}

export { prisma }

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
  globalForPrisma.pool = pool
}

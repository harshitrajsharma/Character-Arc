import { config } from "dotenv"
import { defineConfig, env } from "prisma/config"

config({ path: ".env.local", quiet: true })
config({ quiet: true })

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "bun run db:sync-registry",
  },
  datasource: {
    url: process.env.DIRECT_URL || env("DATABASE_URL"),
  },
})

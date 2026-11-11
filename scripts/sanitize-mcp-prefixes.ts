/** One-time legacy storage cleanup. Dry run by default; does not rotate/revoke keys or print secrets. */
import { config } from "dotenv"
import { maskMcpTokenPrefix } from "../lib/mcp/token-metadata"

config({ path: ".env.local", quiet: true })
config({ quiet: true })
if (!process.env.DATABASE_URL)
  throw new Error("Set DATABASE_URL before inspecting legacy token prefixes.")
const { prisma } = await import("../lib/prisma")

const apply = process.argv.includes("--apply")
let count = 0
let lastId: string | undefined
try {
  while (true) {
    const rows = await prisma.mcpToken.findMany({
      where: lastId ? { id: { gt: lastId } } : {},
      select: { id: true, keyPrefix: true },
      orderBy: { id: "asc" },
      take: 100,
    })
    const legacy = rows.filter((row) =>
      /^mcp_sec_[a-f0-9]{40,128}$/.test(row.keyPrefix)
    )
    if (apply && legacy.length) {
      const changed = await prisma.$transaction(
        legacy.map((row) =>
          prisma.mcpToken.updateMany({
            where: { id: row.id, keyPrefix: row.keyPrefix },
            data: { keyPrefix: maskMcpTokenPrefix(row.keyPrefix) },
          })
        )
      )
      count += changed.reduce((total, result) => total + result.count, 0)
    } else count += legacy.length
    if (rows.length < 100) break
    lastId = rows.at(-1)!.id
  }
  console.log(
    `${apply ? "Sanitized" : "Found"} ${count} legacy recoverable prefixes. Hashes, permissions and revocation state are unchanged.`
  )
  if (!apply && count)
    console.log("Run again with --apply to sanitize these display-only fields.")
} finally {
  await prisma.$disconnect()
}

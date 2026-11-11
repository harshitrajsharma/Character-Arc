import { config } from "dotenv"
import { Prisma } from "../generated/prisma/client"

config({ path: ".env.local", quiet: true })
config({ quiet: true })

type IsolationRow = { table: string; rls: boolean; policyCount: bigint }
const { prisma } = await import("../lib/prisma")
const inspection = Prisma.sql`
  SELECT c.relname AS "table", c.relrowsecurity AS rls,
    (SELECT count(*) FROM pg_policy p WHERE p.polrelid=c.oid) AS "policyCount"
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind IN ('r','p')
  ORDER BY c.relname
`

try {
  if (process.argv.includes("--apply")) {
    // Deployment security metadata only: no policies, data mutations or RPCs.
    // Fixed identifiers prevent arbitrary schema commands from CLI input.
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`ALTER TABLE public.mcp_tokens ENABLE ROW LEVEL SECURITY`
      await tx.$executeRaw`ALTER TABLE public.tool_run_payloads ENABLE ROW LEVEL SECURITY`
    })
  }
  const rows = await prisma.$queryRaw<IsolationRow[]>(inspection)
  const unprotected = rows.filter((row) => !row.rls)
  const withPolicies = rows.filter((row) => row.policyCount > 0)
  if (unprotected.length || withPolicies.length) {
    console.error(
      JSON.stringify({
        error:
          "Database isolation does not match the Prisma-first deny-by-default contract.",
        rlsDisabled: unprotected.map((row) => row.table),
        tablesWithPolicies: withPolicies.map((row) => row.table),
      })
    )
    process.exitCode = 1
  } else {
    console.log(
      `PASS: ${rows.length} public tables have RLS enabled and zero policies. No data records were changed.`
    )
  }
} finally {
  await prisma.$disconnect()
}

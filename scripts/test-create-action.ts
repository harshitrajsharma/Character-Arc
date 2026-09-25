// @ts-nocheck
const { mock } = await import("bun:test")
mock.module("server-only", () => ({}))

const { prisma } = await import("../lib/prisma")
const { executeToolActionForPrincipal } = await import("../lib/tools/execute-tool-action")



async function main() {
  const ws = await prisma.workspace.findUnique({
    where: { slug: "personal-14e77ece-6df3-4d5f-bbc9-e90015c4250d" },
  })
  if (!ws) throw new Error("Workspace not found")

  const inst = await prisma.toolInstallation.findFirst({
    where: { workspaceId: ws.id, toolDefinition: { key: "core.mock-tests" } },
  })
  if (!inst) throw new Error("Installation not found")

  const user = await prisma.profile.findFirst({
    where: { id: ws.createdById! }
  })
  if (!user) throw new Error("User not found")

  console.log("Calling executeToolActionForPrincipal...")
  try {
    const res = await executeToolActionForPrincipal(
      {
        toolKey: "core.mock-tests",
        actionKey: "assessment.create",
        workspaceId: ws.id,
        installationId: inst.id,
        input: {
          title: "Test Paper E2E",
          instructions: null,
          durationMinutes: 180,
          totalMarks: 120,
          examBlockId: null,
          blueprint: {
            sections: [],
            calculatorAllowed: true,
            taxonomy: {
              paperType: "full_length",
              subjectScope: "multi_subject",
              subjects: ["Physics", "Chemistry"],
              examTag: "JEE Advanced",
            },
          },
          passingBenchmark: 33,
          distinctionBenchmark: 70,
        },
        idempotencyKey: "test-idempotency-" + Date.now(),
      },
      {
        kind: "USER",
        actorId: user.id,
        workspaceId: ws.id,
        role: "OWNER",
      }
    )
    console.log("Success! Created assessment:", res)
  } catch (err: any) {
    console.error("Execution failed:", err)
  }

}

main().catch(console.error).finally(() => process.exit(0))

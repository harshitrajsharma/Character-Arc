import { prisma } from "../lib/prisma"

async function main() {
  const ws = await prisma.workspace.findUnique({
    where: { slug: "personal-14e77ece-6df3-4d5f-bbc9-e90015c4250d" },
    include: {
      toolInstallations: {
        include: {
          toolDefinition: true,
          toolRelease: true,
        }
      }
    }
  })
  console.log("Workspace ID:", ws?.id)
  for (const inst of ws?.toolInstallations ?? []) {
    console.log("Installation:", {
      id: inst.id,
      status: inst.status,
      toolKey: inst.toolDefinition.key,
      toolDefId: inst.toolDefinitionId,
      releaseId: inst.toolReleaseId
    })
  }

  const blockTypes = await prisma.blockType.findMany({
    include: { toolDefinition: true }
  })
  console.log("Block types count:", blockTypes.length)
  for (const bt of blockTypes) {
    if (bt.key.includes("mock") || bt.key.includes("assessment")) {
      console.log("BlockType:", {
        id: bt.id,
        key: bt.key,
        toolDefKey: bt.toolDefinition?.key,
        toolDefId: bt.toolDefinitionId
      })
    }
  }
}

main().catch(console.error).finally(() => process.exit(0))

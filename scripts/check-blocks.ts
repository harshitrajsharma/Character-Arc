import { prisma } from "../lib/prisma"

async function main() {
  const blocks = await prisma.block.findMany({
    include: {
      blockType: true,
      assessmentDetails: true,
      workspace: true,
    }
  })
  console.log("Total blocks in DB:", blocks.length)
  for (const b of blocks) {
    if (b.assessmentDetails || b.blockType.key.includes("mock") || b.blockType.key.includes("assessment")) {
      console.log({
        id: b.id,
        title: b.title,
        blockTypeKey: b.blockType.key,
        workspaceSlug: b.workspace.slug,
        status: b.status,
        hasAssessmentDetails: Boolean(b.assessmentDetails)
      })
    }
  }
}

main().catch(console.error).finally(() => process.exit(0))

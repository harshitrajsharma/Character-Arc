import { prisma } from "../lib/prisma"

async function main() {
  const workspaceId = "89e6a327-2b79-4c65-809b-42fdd8e610f7"
  const blocks = await prisma.block.findMany({
    where: { workspaceId },
    select: { id: true, title: true, blockType: { select: { key: true } } }
  })
  console.log("Blocks in Workspace:", JSON.stringify(blocks, null, 2))
}

main().finally(() => prisma.$disconnect())

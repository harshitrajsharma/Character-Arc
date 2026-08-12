import { prisma } from "../lib/prisma"

async function main() {
  const workspaceId = "89e6a327-2b79-4c65-809b-42fdd8e610f7"
  const topicProgress = await prisma.topicProgress.findMany({
    where: { workspaceId }
  })
  console.log("Topic Progress Count:", topicProgress.length)
}

main().finally(() => prisma.$disconnect())

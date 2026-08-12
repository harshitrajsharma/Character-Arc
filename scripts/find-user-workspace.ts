import { prisma } from "../lib/prisma"

async function main() {
  const userId = "14e77ece-6df3-4d5f-bbc9-e90015c4250d"
  const members = await prisma.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: {
        include: {
          toolInstallations: {
            include: {
              toolDefinition: true,
            },
          },
        },
      },
    },
  })
  console.log("User Workspaces:", JSON.stringify(members, null, 2))
}

main().finally(() => prisma.$disconnect())

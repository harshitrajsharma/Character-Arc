// @ts-nocheck
import { prisma } from "../lib/prisma"

async function main() {
  const ws = await prisma.workspace.findUnique({
    where: { slug: "personal-14e77ece-6df3-4d5f-bbc9-e90015c4250d" },
    include: {
      toolInstallations: {
        include: {
          toolDefinition: true
        }
      }
    }
  })
  console.log("Workspace:", ws?.name, ws?.slug)
  console.log("Installed tools:", ws?.toolInstallations.map(t => ({
    name: t.toolDefinition.name,
    key: t.toolDefinition.key,
    enabled: t.enabled
  })))
}

main().catch(console.error).finally(() => process.exit(0))

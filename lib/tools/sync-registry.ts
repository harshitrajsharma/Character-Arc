import {
  BlockKind,
  RelationCardinality,
  ToolReleaseStatus,
} from "../../generated/prisma/enums"
import { config } from "dotenv"
import { listFirstPartyToolManifests } from "./registry"

config({ path: ".env.local", quiet: true })
config({ quiet: true })

export async function syncTools() {
  const { prisma } = await import("../prisma")
  console.log("Synchronizing Tools from Registry...")

  const manifests = listFirstPartyToolManifests()

  for (const manifest of manifests) {
    console.log(`Syncing tool: ${manifest.tool.name} (${manifest.tool.key})`)

    // 1. Upsert Tool Definition
    const toolDef = await prisma.toolDefinition.upsert({
      where: { key: manifest.tool.key },
      update: {
        name: manifest.tool.name,
        description: manifest.tool.description,
        icon: manifest.tool.icon,
        enabled: true,
      },
      create: {
        key: manifest.tool.key,
        name: manifest.tool.name,
        description: manifest.tool.description,
        icon: manifest.tool.icon,
        enabled: true,
      },
    })

    // 2. Upsert Tool Release
    const toolRelease = await prisma.toolRelease.upsert({
      where: {
        toolDefinitionId_version: {
          toolDefinitionId: toolDef.id,
          version: manifest.release.version,
        },
      },
      update: {
        schemaVersion: manifest.release.schemaVersion,
        status: ToolReleaseStatus.PUBLISHED,
        manifest: JSON.parse(JSON.stringify(manifest)), // Convert object to JSON compatible
      },
      create: {
        toolDefinitionId: toolDef.id,
        version: manifest.release.version,
        schemaVersion: manifest.release.schemaVersion,
        status: ToolReleaseStatus.PUBLISHED,
        manifest: JSON.parse(JSON.stringify(manifest)), // Convert object to JSON compatible
        publishedAt: new Date(),
      },
    })

    await prisma.toolInstallation.updateMany({
      where: {
        toolDefinitionId: toolDef.id,
        status: "ACTIVE",
      },
      data: {
        toolReleaseId: toolRelease.id,
      },
    })

    // 3. Upsert Block Types
    for (const bt of manifest.blockTypes) {
      await prisma.blockType.upsert({
        where: { key: bt.key },
        update: {
          name: bt.name,
          description: bt.description,
          kind:
            bt.kind === "entity"
              ? BlockKind.ENTITY
              : bt.kind === "container"
                ? BlockKind.CONTAINER
                : BlockKind.CONTENT,
          schemaVersion: bt.schemaVersion,
          isSystem: false,
        },
        create: {
          key: bt.key,
          toolDefinitionId: toolDef.id,
          name: bt.name,
          description: bt.description,
          kind:
            bt.kind === "entity"
              ? BlockKind.ENTITY
              : bt.kind === "container"
                ? BlockKind.CONTAINER
                : BlockKind.CONTENT,
          schemaVersion: bt.schemaVersion,
          isSystem: false,
        },
      })
    }
  }

  // 4. Upsert Relation Types (Requires second pass so source/target blocks are guaranteed to exist)
  for (const manifest of manifests) {
    for (const rt of manifest.relationTypes) {
      const sourceBlock = await prisma.blockType.findUnique({
        where: { key: rt.sourceBlockTypeKey },
      })
      const targetBlock = await prisma.blockType.findUnique({
        where: { key: rt.targetBlockTypeKey },
      })

      if (!sourceBlock || !targetBlock) {
        console.warn(`Skipping relation ${rt.key}: source or target missing.`)
        continue
      }

      await prisma.blockRelationType.upsert({
        where: { key: rt.key },
        update: {
          name: rt.name,
          description: rt.description,
          cardinality:
            rt.cardinality === "one_to_one"
              ? RelationCardinality.ONE_TO_ONE
              : rt.cardinality === "one_to_many"
                ? RelationCardinality.ONE_TO_MANY
                : RelationCardinality.MANY_TO_MANY,
        },
        create: {
          key: rt.key,
          sourceBlockTypeId: sourceBlock.id,
          targetBlockTypeId: targetBlock.id,
          name: rt.name,
          description: rt.description,
          cardinality:
            rt.cardinality === "one_to_one"
              ? RelationCardinality.ONE_TO_ONE
              : rt.cardinality === "one_to_many"
                ? RelationCardinality.ONE_TO_MANY
                : RelationCardinality.MANY_TO_MANY,
          isSystem: false,
        },
      })
    }
  }

  console.log("Synchronization complete!")
}

syncTools()
  .then(() => undefined)
  .catch(async (e) => {
    console.error(e)
    process.exit(1)
  })

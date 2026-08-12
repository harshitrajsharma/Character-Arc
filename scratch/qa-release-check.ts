import { prisma } from "../lib/prisma"

async function main() {
  const installations = await prisma.toolInstallation.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      workspaceId: true,
      toolRelease: {
        select: { version: true, status: true, manifest: true },
      },
      toolDefinition: {
        select: { key: true, name: true },
      },
    },
  })
  for (const installation of installations) {
    const manifestVersion =
      typeof installation.toolRelease.manifest === "object" &&
      installation.toolRelease.manifest !== null &&
      !Array.isArray(installation.toolRelease.manifest)
        ? (installation.toolRelease.manifest as Record<string, unknown>)
            .version
        : "unknown"
    console.log(
      JSON.stringify({
        installationId: installation.id,
        tool: installation.toolDefinition.key,
        releaseVersion: installation.toolRelease.version,
        releaseStatus: installation.toolRelease.status,
        manifestVersion,
      })
    )
  }
}

main()
  .catch((error) => {
    console.error("Release check failed:", error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())

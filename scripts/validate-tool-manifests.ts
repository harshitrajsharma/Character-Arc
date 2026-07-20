import { parseToolManifest } from "@/lib/tools/contracts"
import { listFirstPartyToolManifests } from "@/lib/tools/registry"

const manifests = listFirstPartyToolManifests()

if (manifests.length === 0) {
  throw new Error("At least one first-party tool manifest must be registered.")
}

for (const manifest of manifests) {
  const parsedManifest = parseToolManifest(manifest)

  if (parsedManifest.tool.key !== manifest.tool.key) {
    throw new Error("The parsed manifest key does not match its registry key.")
  }

  console.log(
    `Validated ${parsedManifest.tool.key}@${parsedManifest.release.version}`
  )
}

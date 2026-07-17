import { goalsPathsManifest } from "@/lib/tools/definitions/goals-paths/manifest"

const firstPartyManifests = new Map([
  [goalsPathsManifest.tool.key, goalsPathsManifest],
])

export function getFirstPartyToolManifest(toolKey: string) {
  return firstPartyManifests.get(toolKey) ?? null
}

export function listFirstPartyToolManifests() {
  return Array.from(firstPartyManifests.values())
}

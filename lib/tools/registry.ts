import { examPrepManifest } from "@/lib/tools/definitions/exam-prep/manifest"
import { goalsPathsManifest } from "@/lib/tools/definitions/goals-paths/manifest"

const firstPartyManifests = new Map([
  [goalsPathsManifest.tool.key, goalsPathsManifest],
  [examPrepManifest.tool.key, examPrepManifest],
])

export function getFirstPartyToolManifest(toolKey: string) {
  return firstPartyManifests.get(toolKey) ?? null
}

export function listFirstPartyToolManifests() {
  return Array.from(firstPartyManifests.values())
}

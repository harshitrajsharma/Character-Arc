import { readFile } from "node:fs/promises"
import { isDeepStrictEqual } from "node:util"

import { parseToolManifest } from "@/lib/tools/contracts"
import { examPrepManifest } from "@/lib/tools/definitions/exam-prep/manifest"
import { goalsPathsManifest } from "@/lib/tools/definitions/goals-paths/manifest"

const releases = [
  {
    manifest: goalsPathsManifest,
    migrationPath:
      "supabase/migrations/20260717103415_publish_goals_paths_3_1_arc_management.sql",
  },
  {
    manifest: examPrepManifest,
    migrationPath:
      "supabase/migrations/20260717170000_exam_prep_mutations_v2.sql",
  },
]

for (const release of releases) {
  const migration = await readFile(release.migrationPath, "utf8")
  const snapshot = migration.split("$manifest$")[1]

  if (!snapshot) {
    throw new Error(
      `Manifest snapshot is missing from ${release.migrationPath}.`
    )
  }

  const databaseManifest = parseToolManifest(JSON.parse(snapshot))

  if (!isDeepStrictEqual(release.manifest, databaseManifest)) {
    throw new Error(
      `${release.manifest.tool.key}@${release.manifest.release.version} differs from its database snapshot.`
    )
  }

  console.log(
    `Validated ${release.manifest.tool.key}@${release.manifest.release.version}`
  )
}

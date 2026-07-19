import { writeFileSync } from "node:fs"
import { examPrepManifest } from "../lib/tools/definitions/exam-prep/manifest"

const releaseVersion = examPrepManifest.release.version

const sql = `-- Publish the Exam Prep tool release at version ${releaseVersion}
DO $$
DECLARE
  def_id uuid;
BEGIN
  SELECT id INTO def_id FROM "public"."tool_definitions" WHERE "key" = 'core.exam-prep' LIMIT 1;
  IF def_id IS NOT NULL THEN
    INSERT INTO "public"."tool_releases" (
      tool_definition_id,
      version,
      status,
      manifest,
      published_at
    )
    VALUES (
      def_id,
      '${releaseVersion}',
      'published'::"public"."tool_release_status",
      $manifest$${JSON.stringify(examPrepManifest, null, 2)}$manifest$::jsonb,
      CURRENT_TIMESTAMP
    );
    
    -- Update existing active installations to use the new version
    UPDATE "public"."tool_installations"
    SET tool_release_id = (SELECT id FROM "public"."tool_releases" WHERE tool_definition_id = def_id AND version = '${releaseVersion}')
    WHERE tool_definition_id = def_id AND status = 'active';
  END IF;
END;
$$;`

writeFileSync(
  "supabase/migrations/20260717170000_exam_prep_mutations_v2.sql",
  sql
)
console.log("Generated migration.")

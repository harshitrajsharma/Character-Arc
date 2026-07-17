-- Installation release changes deliberately clear stale grants. Reconcile the
-- immutable v3 defaults only after the release upgrade has completed.
INSERT INTO "public"."tool_grants" (
  "workspace_id",
  "installation_id",
  "permission_key",
  "effect",
  "constraints"
)
SELECT
  installation."workspace_id",
  installation."id",
  grant_spec->>'permissionKey',
  (grant_spec->>'effect')::"public"."tool_grant_effect",
  COALESCE(grant_spec->'constraints', '{}'::jsonb)
FROM "public"."tool_installations" AS installation
JOIN "public"."tool_releases" AS release
  ON release."id" = installation."tool_release_id"
JOIN "public"."tool_definitions" AS definition
  ON definition."id" = release."tool_definition_id"
CROSS JOIN LATERAL jsonb_array_elements(
  COALESCE(release."manifest"->'defaultGrants', '[]'::jsonb)
) AS release_grant(grant_spec)
WHERE installation."status" = 'active'
  AND definition."key" = 'core.goals-paths'
  AND release."version" = '3.0.0'
ON CONFLICT ("installation_id", "permission_key") DO UPDATE
SET
  "effect" = EXCLUDED."effect",
  "constraints" = EXCLUDED."constraints",
  "updated_at" = CURRENT_TIMESTAMP;

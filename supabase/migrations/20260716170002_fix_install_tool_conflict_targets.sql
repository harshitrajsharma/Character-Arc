-- Use named constraints so PL/pgSQL output variables cannot shadow columns.
CREATE OR REPLACE FUNCTION "public"."install_tool"(
  target_workspace_id uuid,
  requested_tool_key text,
  requested_release_version text
)
RETURNS TABLE (
  installation_id uuid,
  workspace_id uuid,
  tool_definition_id uuid,
  tool_release_id uuid,
  status "public"."tool_installation_status",
  installed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  actor_id uuid := (SELECT auth.uid());
  selected_tool_id uuid;
  selected_release_id uuid;
  selected_manifest jsonb;
  installation_row "public"."tool_installations"%ROWTYPE;
  grant_spec jsonb;
  grant_constraints jsonb;
  permission_key text;
  permission_effect "public"."tool_grant_effect";
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Authentication is required to install tools.';
  END IF;

  IF NOT "public"."can_admin_workspace"(target_workspace_id) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Only a workspace owner can install tools.';
  END IF;

  SELECT tool_definition."id"
  INTO selected_tool_id
  FROM "public"."tool_definitions" AS tool_definition
  WHERE tool_definition."key" = requested_tool_key
    AND tool_definition."enabled" = true;

  IF selected_tool_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'The requested tool is unavailable.';
  END IF;

  SELECT tool_release."id", tool_release."manifest"
  INTO selected_release_id, selected_manifest
  FROM "public"."tool_releases" AS tool_release
  WHERE tool_release."tool_definition_id" = selected_tool_id
    AND tool_release."status" = 'published'
    AND tool_release."version" = requested_release_version
  LIMIT 1;

  IF selected_release_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'The requested tool release is unavailable.';
  END IF;

  IF jsonb_typeof(COALESCE(selected_manifest->'defaultGrants', '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'Tool release defaultGrants must be an array.';
  END IF;

  INSERT INTO "public"."tool_installations" (
    "workspace_id",
    "installed_by_id",
    "tool_definition_id",
    "tool_release_id",
    "status",
    "disabled_at"
  )
  VALUES (
    target_workspace_id,
    actor_id,
    selected_tool_id,
    selected_release_id,
    'active',
    NULL
  )
  ON CONFLICT ("workspace_id", "tool_definition_id") DO UPDATE
  SET
    "installed_by_id" = EXCLUDED."installed_by_id",
    "tool_release_id" = EXCLUDED."tool_release_id",
    "status" = 'active',
    "disabled_at" = NULL,
    "updated_at" = CURRENT_TIMESTAMP
  RETURNING * INTO installation_row;

  FOR grant_spec IN
    SELECT grant_value
    FROM jsonb_array_elements(
      COALESCE(selected_manifest->'defaultGrants', '[]'::jsonb)
    ) AS manifest_grant(grant_value)
  LOOP
    permission_key := grant_spec->>'permissionKey';
    grant_constraints := COALESCE(grant_spec->'constraints', '{}'::jsonb);

    IF permission_key IS NULL OR length(permission_key) = 0 THEN
      RAISE EXCEPTION 'Tool release contains a grant without permissionKey.';
    END IF;

    IF jsonb_typeof(grant_constraints) <> 'object' THEN
      RAISE EXCEPTION 'Tool grant constraints must be an object.';
    END IF;

    IF COALESCE(grant_spec->>'effect', '') NOT IN ('allow', 'deny') THEN
      RAISE EXCEPTION 'Tool release contains an invalid grant effect.';
    END IF;

    permission_effect := (grant_spec->>'effect')::"public"."tool_grant_effect";

    INSERT INTO "public"."tool_grants" (
      "workspace_id",
      "installation_id",
      "permission_key",
      "effect",
      "constraints"
    )
    VALUES (
      target_workspace_id,
      installation_row."id",
      permission_key,
      permission_effect,
      grant_constraints
    )
    ON CONFLICT ("installation_id", "permission_key") DO UPDATE
    SET
      "effect" = EXCLUDED."effect",
      "constraints" = EXCLUDED."constraints",
      "updated_at" = CURRENT_TIMESTAMP;
  END LOOP;

  RETURN QUERY
  SELECT
    installation_row."id",
    installation_row."workspace_id",
    installation_row."tool_definition_id",
    installation_row."tool_release_id",
    installation_row."status",
    installation_row."installed_at";
END;
$$;

REVOKE ALL ON FUNCTION "public"."install_tool"(uuid, text, text)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION "public"."install_tool"(uuid, text, text)
TO authenticated, service_role;

-- Register the first reusable Character Arc tool release and provide one
-- authorization-aware installation transaction for every catalog tool.

INSERT INTO "public"."tool_definitions" (
  "key",
  "name",
  "description",
  "icon",
  "enabled"
)
VALUES (
  'core.goals-paths',
  'Goals and Paths',
  'Turn a current reality into possible paths, milestones, and clear next actions.',
  'route',
  true
)
ON CONFLICT ("key") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "icon" = EXCLUDED."icon",
  "enabled" = true,
  "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "public"."block_types" (
  "tool_definition_id",
  "key",
  "name",
  "description",
  "kind",
  "icon",
  "schema_version",
  "is_system"
)
SELECT
  tool_definition."id",
  block_type."key",
  block_type."name",
  block_type."description",
  block_type."kind"::"public"."block_kind",
  block_type."icon",
  1,
  true
FROM "public"."tool_definitions" AS tool_definition
CROSS JOIN (
  VALUES
    (
      'goals-paths.arc',
      'Arc',
      'A meaningful outcome the user is actively pursuing.',
      'container',
      'target'
    ),
    (
      'goals-paths.path-option',
      'Path option',
      'One possible route from the current reality to the arc.',
      'entity',
      'route'
    ),
    (
      'goals-paths.milestone',
      'Milestone',
      'A verifiable checkpoint on a selected path.',
      'entity',
      'milestone'
    ),
    (
      'goals-paths.action',
      'Action',
      'A concrete next move that advances a milestone.',
      'entity',
      'circle-check'
    )
) AS block_type("key", "name", "description", "kind", "icon")
WHERE tool_definition."key" = 'core.goals-paths'
ON CONFLICT ("key") DO UPDATE
SET
  "tool_definition_id" = EXCLUDED."tool_definition_id",
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "kind" = EXCLUDED."kind",
  "icon" = EXCLUDED."icon",
  "schema_version" = EXCLUDED."schema_version",
  "is_system" = true,
  "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "public"."block_relation_types" (
  "key",
  "name",
  "source_block_type_id",
  "target_block_type_id",
  "cardinality",
  "description",
  "is_system"
)
SELECT
  relation_type."key",
  relation_type."name",
  source_type."id",
  target_type."id",
  relation_type."cardinality"::"public"."relation_cardinality",
  relation_type."description",
  true
FROM (
  VALUES
    (
      'goals-paths.arc-has-path-option',
      'Arc has path option',
      'goals-paths.arc',
      'goals-paths.path-option',
      'one_to_many',
      'Connects an arc to a possible route.'
    ),
    (
      'goals-paths.arc-has-milestone',
      'Arc has milestone',
      'goals-paths.arc',
      'goals-paths.milestone',
      'one_to_many',
      'Connects an arc to a verifiable checkpoint.'
    ),
    (
      'goals-paths.milestone-has-action',
      'Milestone has action',
      'goals-paths.milestone',
      'goals-paths.action',
      'one_to_many',
      'Connects a milestone to a concrete next move.'
    )
) AS relation_type(
  "key",
  "name",
  "source_key",
  "target_key",
  "cardinality",
  "description"
)
JOIN "public"."block_types" AS source_type
  ON source_type."key" = relation_type."source_key"
JOIN "public"."block_types" AS target_type
  ON target_type."key" = relation_type."target_key"
ON CONFLICT ("key") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "source_block_type_id" = EXCLUDED."source_block_type_id",
  "target_block_type_id" = EXCLUDED."target_block_type_id",
  "cardinality" = EXCLUDED."cardinality",
  "description" = EXCLUDED."description",
  "is_system" = true,
  "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "public"."tool_releases" (
  "tool_definition_id",
  "version",
  "status",
  "schema_version",
  "manifest",
  "published_at"
)
SELECT
  tool_definition."id",
  '1.0.0',
  'published'::"public"."tool_release_status",
  1,
  $manifest$
  {
    "manifestVersion": 1,
    "tool": {
      "key": "core.goals-paths",
      "name": "Goals and Paths",
      "description": "Turn a current reality into possible paths, milestones, and clear next actions.",
      "icon": "route",
      "category": "plan"
    },
    "release": { "version": "1.0.0", "schemaVersion": 1 },
    "routes": {
      "home": "/tools/goals-paths",
      "create": "/tools/goals-paths/new"
    },
    "defaultGrants": [
      {
        "permissionKey": "blocks.read.owned",
        "effect": "allow",
        "constraints": {
          "origin": "installation",
          "blockTypeKeys": [
            "goals-paths.arc",
            "goals-paths.path-option",
            "goals-paths.milestone",
            "goals-paths.action"
          ]
        }
      },
      {
        "permissionKey": "blocks.write.owned",
        "effect": "allow",
        "constraints": {
          "origin": "installation",
          "blockTypeKeys": [
            "goals-paths.arc",
            "goals-paths.path-option",
            "goals-paths.milestone",
            "goals-paths.action"
          ]
        }
      },
      {
        "permissionKey": "ai.generate",
        "effect": "deny",
        "constraints": { "requiresEntitlement": "in_app_ai" }
      }
    ],
    "blockTypes": [
      {
        "key": "goals-paths.arc",
        "name": "Arc",
        "description": "A meaningful outcome the user is actively pursuing.",
        "kind": "container",
        "schemaVersion": 1,
        "propertiesSchema": {
          "type": "object",
          "additionalProperties": false,
          "required": ["objective", "currentReality"],
          "properties": {
            "objective": { "type": "string", "minLength": 1, "maxLength": 500 },
            "why": { "type": "string", "maxLength": 1000 },
            "currentReality": { "type": "string", "minLength": 1, "maxLength": 2000 },
            "targetDate": { "type": ["string", "null"], "format": "date" },
            "constraints": {
              "type": "array",
              "maxItems": 20,
              "items": { "type": "string", "maxLength": 300 }
            }
          }
        }
      },
      {
        "key": "goals-paths.path-option",
        "name": "Path option",
        "description": "One possible route from the current reality to the arc.",
        "kind": "entity",
        "schemaVersion": 1,
        "propertiesSchema": {
          "type": "object",
          "additionalProperties": false,
          "required": ["rationale"],
          "properties": {
            "rationale": { "type": "string", "minLength": 1, "maxLength": 2000 },
            "tradeoffs": {
              "type": "array",
              "maxItems": 12,
              "items": { "type": "string", "maxLength": 500 }
            },
            "confidence": { "type": ["number", "null"], "minimum": 0, "maximum": 100 }
          }
        }
      },
      {
        "key": "goals-paths.milestone",
        "name": "Milestone",
        "description": "A verifiable checkpoint on a selected path.",
        "kind": "entity",
        "schemaVersion": 1,
        "propertiesSchema": {
          "type": "object",
          "additionalProperties": false,
          "required": ["successCriteria"],
          "properties": {
            "successCriteria": { "type": "string", "minLength": 1, "maxLength": 1000 },
            "targetDate": { "type": ["string", "null"], "format": "date" }
          }
        }
      },
      {
        "key": "goals-paths.action",
        "name": "Action",
        "description": "A concrete next move that advances a milestone.",
        "kind": "entity",
        "schemaVersion": 1,
        "propertiesSchema": {
          "type": "object",
          "additionalProperties": false,
          "required": ["definitionOfDone"],
          "properties": {
            "definitionOfDone": { "type": "string", "minLength": 1, "maxLength": 1000 },
            "dueDate": { "type": ["string", "null"], "format": "date" },
            "estimateMinutes": { "type": ["integer", "null"], "minimum": 1 }
          }
        }
      }
    ],
    "relationTypes": [
      {
        "key": "goals-paths.arc-has-path-option",
        "name": "Arc has path option",
        "description": "Connects an arc to a possible route.",
        "sourceBlockTypeKey": "goals-paths.arc",
        "targetBlockTypeKey": "goals-paths.path-option",
        "cardinality": "one_to_many"
      },
      {
        "key": "goals-paths.arc-has-milestone",
        "name": "Arc has milestone",
        "description": "Connects an arc to a verifiable checkpoint.",
        "sourceBlockTypeKey": "goals-paths.arc",
        "targetBlockTypeKey": "goals-paths.milestone",
        "cardinality": "one_to_many"
      },
      {
        "key": "goals-paths.milestone-has-action",
        "name": "Milestone has action",
        "description": "Connects a milestone to a concrete next move.",
        "sourceBlockTypeKey": "goals-paths.milestone",
        "targetBlockTypeKey": "goals-paths.action",
        "cardinality": "one_to_many"
      }
    ],
    "actions": [
      {
        "key": "arc.create",
        "name": "Create arc",
        "description": "Creates an arc directly from user-approved information.",
        "execution": "deterministic",
        "requiredPermissions": ["blocks.write.owned"],
        "inputSchema": {
          "type": "object",
          "additionalProperties": false,
          "required": ["objective", "currentReality"],
          "properties": {
            "objective": { "type": "string", "minLength": 1, "maxLength": 500 },
            "why": { "type": "string", "maxLength": 1000 },
            "currentReality": { "type": "string", "minLength": 1, "maxLength": 2000 },
            "targetDate": { "type": ["string", "null"], "format": "date" },
            "constraints": {
              "type": "array",
              "maxItems": 20,
              "items": { "type": "string", "maxLength": 300 }
            }
          }
        },
        "output": {
          "rootBlockTypeKey": "goals-paths.arc",
          "createsBlockTypeKeys": ["goals-paths.arc"]
        }
      },
      {
        "key": "arc.generate-plan",
        "name": "Generate paths and milestones",
        "description": "Proposes structured paths, milestones, and next actions.",
        "execution": "ai_assisted",
        "requiredPermissions": ["blocks.write.owned", "ai.generate"],
        "inputSchema": {
          "type": "object",
          "additionalProperties": false,
          "required": ["objective", "currentReality"],
          "properties": {
            "objective": { "type": "string", "minLength": 1, "maxLength": 500 },
            "why": { "type": "string", "maxLength": 1000 },
            "currentReality": { "type": "string", "minLength": 1, "maxLength": 2000 },
            "targetDate": { "type": ["string", "null"], "format": "date" },
            "constraints": {
              "type": "array",
              "maxItems": 20,
              "items": { "type": "string", "maxLength": 300 }
            }
          }
        },
        "output": {
          "rootBlockTypeKey": "goals-paths.arc",
          "createsBlockTypeKeys": [
            "goals-paths.arc",
            "goals-paths.path-option",
            "goals-paths.milestone",
            "goals-paths.action"
          ]
        }
      },
      {
        "key": "milestone.complete",
        "name": "Complete milestone",
        "description": "Records completion and optional supporting evidence.",
        "execution": "deterministic",
        "requiredPermissions": ["blocks.write.owned"],
        "inputSchema": {
          "type": "object",
          "additionalProperties": false,
          "required": ["milestoneId"],
          "properties": {
            "milestoneId": { "type": "string", "format": "uuid" },
            "evidence": { "type": "string", "maxLength": 2000 }
          }
        },
        "output": {
          "rootBlockTypeKey": "goals-paths.milestone",
          "createsBlockTypeKeys": ["goals-paths.milestone"]
        }
      }
    ]
  }
  $manifest$::jsonb,
  CURRENT_TIMESTAMP
FROM "public"."tool_definitions" AS tool_definition
WHERE tool_definition."key" = 'core.goals-paths'
ON CONFLICT ("tool_definition_id", "version") DO NOTHING;

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

REVOKE ALL ON FUNCTION "public"."install_tool"(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."install_tool"(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION "public"."install_tool"(uuid, text, text) TO authenticated, service_role;

-- New Supabase projects do not expose public tables to the Data API by
-- default. Catalog reads remain RLS-protected and receive explicit access.
GRANT SELECT ON TABLE
  "public"."tool_definitions",
  "public"."tool_releases",
  "public"."tool_installations",
  "public"."tool_grants"
TO authenticated;

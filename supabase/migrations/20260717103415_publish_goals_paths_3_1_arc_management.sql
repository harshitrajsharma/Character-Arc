-- Publish owner-managed Arc editing and deletion without mutating 3.0.0.
-- Arc deletion is a canonical soft archive so evidence and audit receipts remain durable.

ALTER TABLE "public"."blocks"
  ADD COLUMN IF NOT EXISTS "revision" bigint NOT NULL DEFAULT 1;

ALTER TABLE "public"."blocks"
  DROP CONSTRAINT IF EXISTS "blocks_revision_positive";

ALTER TABLE "public"."blocks"
  ADD CONSTRAINT "blocks_revision_positive" CHECK ("revision" > 0);

INSERT INTO "public"."tool_releases" (
  "tool_definition_id", "version", "status", "schema_version", "manifest",
  "published_at"
)
SELECT
  definition."id",
  '3.1.0',
  'published'::"public"."tool_release_status",
  2,
  $manifest$
{"manifestVersion":1,"tool":{"key":"core.goals-paths","name":"Goals and Paths","description":"Turn a current reality into possible paths, milestones, and clear next actions.","icon":"route","category":"plan"},"release":{"version":"3.1.0","schemaVersion":2},"routes":{"home":"/tools/goals-paths","create":"/tools/goals-paths/new"},"defaultGrants":[{"permissionKey":"blocks.read.owned","effect":"allow","constraints":{"origin":"installation","blockTypeKeys":["goals-paths.arc","goals-paths.path-option","goals-paths.milestone","goals-paths.action"]}},{"permissionKey":"blocks.write.owned","effect":"allow","constraints":{"origin":"installation","blockTypeKeys":["goals-paths.arc","goals-paths.path-option","goals-paths.milestone","goals-paths.action"]}},{"permissionKey":"ai.generate","effect":"deny","constraints":{"requiresEntitlement":"in_app_ai"}}],"blockTypes":[{"key":"goals-paths.arc","name":"Arc","description":"A meaningful outcome the user is actively pursuing.","kind":"container","schemaVersion":2,"propertiesSchema":{"type":"object","additionalProperties":false,"required":["objective","currentReality","contentFormat","okf"],"properties":{"objective":{"type":"string","minLength":1,"maxLength":4000,"contentMediaType":"text/markdown"},"why":{"type":"string","minLength":0,"maxLength":4000,"contentMediaType":"text/markdown"},"currentReality":{"type":"string","minLength":1,"maxLength":8000,"contentMediaType":"text/markdown"},"targetDate":{"type":["string","null"],"format":"date"},"constraints":{"type":"array","maxItems":20,"items":{"type":"string","minLength":1,"maxLength":300}},"contentFormat":{"type":"string","minLength":1,"maxLength":80},"okf":{"type":"object","additionalProperties":false,"required":["type","profile","profileVersion"],"properties":{"type":{"type":"string","minLength":1,"maxLength":80},"profile":{"type":"string","minLength":1,"maxLength":120},"profileVersion":{"type":"integer","minimum":1}}}}}},{"key":"goals-paths.path-option","name":"Path option","description":"One possible route from the current reality to the arc.","kind":"entity","schemaVersion":1,"propertiesSchema":{"type":"object","additionalProperties":false,"required":["rationale"],"properties":{"rationale":{"type":"string","minLength":1,"maxLength":2000},"tradeoffs":{"type":"array","maxItems":12,"items":{"type":"string","maxLength":500}},"confidence":{"type":["number","null"],"minimum":0,"maximum":100}}}},{"key":"goals-paths.milestone","name":"Milestone","description":"A verifiable checkpoint on a selected path.","kind":"entity","schemaVersion":1,"propertiesSchema":{"type":"object","additionalProperties":false,"required":["successCriteria"],"properties":{"successCriteria":{"type":"string","minLength":1,"maxLength":1000},"targetDate":{"type":["string","null"],"format":"date"}}}},{"key":"goals-paths.action","name":"Action","description":"A concrete next move that advances a milestone.","kind":"entity","schemaVersion":1,"propertiesSchema":{"type":"object","additionalProperties":false,"required":["definitionOfDone"],"properties":{"definitionOfDone":{"type":"string","minLength":1,"maxLength":1000},"dueDate":{"type":["string","null"],"format":"date"},"estimateMinutes":{"type":["integer","null"],"minimum":1}}}}],"relationTypes":[{"key":"goals-paths.arc-has-path-option","name":"Arc has path option","description":"Connects an arc to a possible route.","sourceBlockTypeKey":"goals-paths.arc","targetBlockTypeKey":"goals-paths.path-option","cardinality":"one_to_many"},{"key":"goals-paths.arc-has-milestone","name":"Arc has milestone","description":"Connects an arc to a verifiable checkpoint.","sourceBlockTypeKey":"goals-paths.arc","targetBlockTypeKey":"goals-paths.milestone","cardinality":"one_to_many"},{"key":"goals-paths.milestone-has-action","name":"Milestone has action","description":"Connects a milestone to a concrete next move.","sourceBlockTypeKey":"goals-paths.milestone","targetBlockTypeKey":"goals-paths.action","cardinality":"one_to_many"}],"actions":[{"key":"arc.create","name":"Create arc","description":"Creates an arc directly from user-approved information.","execution":"deterministic","requiredPermissions":["blocks.write.owned"],"inputSchema":{"type":"object","additionalProperties":false,"required":["title","objective","currentReality"],"properties":{"title":{"type":"string","minLength":1,"maxLength":120},"objective":{"type":"string","minLength":1,"maxLength":4000,"contentMediaType":"text/markdown"},"why":{"type":"string","minLength":0,"maxLength":4000,"contentMediaType":"text/markdown"},"currentReality":{"type":"string","minLength":1,"maxLength":8000,"contentMediaType":"text/markdown"},"targetDate":{"type":["string","null"],"format":"date"},"constraints":{"type":"array","maxItems":20,"items":{"type":"string","minLength":1,"maxLength":300}}}},"output":{"rootBlockTypeKey":"goals-paths.arc","createsBlockTypeKeys":["goals-paths.arc"],"writesBlockTypeKeys":[]}},{"key":"arc.check-in","name":"Record Arc check-in","description":"Records progress and optional evidence for an Arc.","execution":"deterministic","requiredPermissions":["blocks.write.owned"],"inputSchema":{"type":"object","additionalProperties":false,"required":["arcId","progressPercent"],"properties":{"arcId":{"type":"string","format":"uuid"},"progressPercent":{"type":"number","minimum":0,"maximum":100},"note":{"type":"string","maxLength":2000}}},"output":{"rootBlockTypeKey":"goals-paths.arc","createsBlockTypeKeys":[],"writesBlockTypeKeys":["goals-paths.arc"]}},{"key":"arc.set-status","name":"Change Arc status","description":"Changes the personal lifecycle state of an Arc.","execution":"deterministic","requiredPermissions":["blocks.write.owned"],"inputSchema":{"type":"object","additionalProperties":false,"required":["arcId","status"],"properties":{"arcId":{"type":"string","format":"uuid"},"status":{"type":"string","enum":["active","paused","completed","archived"]}}},"output":{"rootBlockTypeKey":"goals-paths.arc","createsBlockTypeKeys":[],"writesBlockTypeKeys":["goals-paths.arc"]}},{"key":"arc.update","name":"Update Arc","description":"Replaces the editable narrative and metadata of an Arc.","execution":"deterministic","requiredPermissions":["blocks.write.owned"],"inputSchema":{"type":"object","additionalProperties":false,"required":["arcId","expectedRevision","title","objective","currentReality","why","targetDate","constraints"],"properties":{"arcId":{"type":"string","format":"uuid"},"expectedRevision":{"type":"integer","minimum":1},"title":{"type":"string","minLength":1,"maxLength":120},"objective":{"type":"string","minLength":1,"maxLength":4000,"contentMediaType":"text/markdown"},"why":{"type":["string","null"],"maxLength":4000,"contentMediaType":"text/markdown"},"currentReality":{"type":"string","minLength":1,"maxLength":8000,"contentMediaType":"text/markdown"},"targetDate":{"type":["string","null"],"format":"date"},"constraints":{"type":"array","maxItems":20,"items":{"type":"string","minLength":1,"maxLength":300}}}},"output":{"rootBlockTypeKey":"goals-paths.arc","createsBlockTypeKeys":[],"writesBlockTypeKeys":["goals-paths.arc"]}},{"key":"arc.delete","name":"Delete Arc","description":"Archives an Arc while retaining its evidence and audit history.","execution":"deterministic","requiredPermissions":["blocks.write.owned"],"inputSchema":{"type":"object","additionalProperties":false,"required":["arcId","expectedRevision"],"properties":{"arcId":{"type":"string","format":"uuid"},"expectedRevision":{"type":"integer","minimum":1}}},"output":{"rootBlockTypeKey":"goals-paths.arc","createsBlockTypeKeys":[],"writesBlockTypeKeys":["goals-paths.arc"]}}]}
$manifest$::jsonb,
  CURRENT_TIMESTAMP
FROM "public"."tool_definitions" AS definition
WHERE definition."key" = 'core.goals-paths'
ON CONFLICT ("tool_definition_id", "version") DO NOTHING;

UPDATE "public"."tool_installations" AS installation
SET
  "tool_release_id" = release."id",
  "updated_at" = CURRENT_TIMESTAMP
FROM "public"."tool_definitions" AS definition
JOIN "public"."tool_releases" AS release
  ON release."tool_definition_id" = definition."id"
  AND release."version" = '3.1.0'
WHERE installation."tool_definition_id" = definition."id"
  AND definition."key" = 'core.goals-paths'
  AND installation."status" = 'active';

INSERT INTO "public"."tool_grants" (
  "workspace_id", "installation_id", "permission_key", "effect", "constraints"
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
  AND release."version" = '3.1.0'
ON CONFLICT ("installation_id", "permission_key") DO UPDATE
SET
  "effect" = EXCLUDED."effect",
  "constraints" = EXCLUDED."constraints",
  "updated_at" = CURRENT_TIMESTAMP;

-- Bind creation to the immutable 3.1 release and handler name.
DO $$
DECLARE
  function_definition text;
BEGIN
  SELECT pg_get_functiondef(
    'public.execute_goals_paths_create_arc_v3(uuid,uuid,text,text,jsonb)'::regprocedure
  ) INTO function_definition;

  function_definition := replace(
    function_definition,
    'execute_goals_paths_create_arc_v3',
    'execute_goals_paths_create_arc_v3_1'
  );
  function_definition := replace(
    function_definition,
    'goals-paths.arc.create.v3',
    'goals-paths.arc.create.v3.1'
  );
  EXECUTE function_definition;
END;
$$;

-- Rebind lifecycle handlers to 3.1 and use declared write scope.
DO $$
DECLARE
  function_definition text;
BEGIN
  SELECT pg_get_functiondef(
    'public.execute_goals_paths_arc_update_v1(uuid,uuid,text,text,text,jsonb)'::regprocedure
  ) INTO function_definition;

  function_definition := replace(
    function_definition,
    'execute_goals_paths_arc_update_v1',
    'execute_goals_paths_arc_update_v2'
  );
  function_definition := replace(function_definition, '''3.0.0''', '''3.1.0''');
  function_definition := replace(
    function_definition,
    '''createsBlockTypeKeys''',
    '''writesBlockTypeKeys'''
  );
  EXECUTE function_definition;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."execute_goals_paths_arc_content_v1"(
  target_workspace_id uuid,
  target_installation_id uuid,
  requested_idempotency_key text,
  requested_handler_version text,
  requested_action_key text,
  action_input jsonb
)
RETURNS TABLE (
  run_id uuid,
  run_status "public"."tool_run_status",
  root_block_id uuid,
  created_block_ids uuid[],
  evidence_ids uuid[],
  error_code text,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := (SELECT auth.uid());
  selected_release_id uuid;
  selected_manifest jsonb;
  selected_action jsonb;
  selected_manifest_hash text;
  selected_input_hash text;
  required_permission jsonb;
  action_block_type_keys text[];
  existing_run "public"."tool_runs"%ROWTYPE;
  created_run "public"."tool_runs"%ROWTYPE;
  selected_arc_id uuid;
  expected_revision bigint;
  current_revision bigint;
  title_text text;
  objective text;
  objective_summary text;
  current_reality text;
  why_text text;
  target_date_text text;
  constraints_value jsonb;
  constraint_value jsonb;
  constraints_markdown text;
  body_markdown text;
  input_key text;
  inserted boolean := false;
BEGIN
  IF actor_id IS NULL OR NOT "public"."can_write_workspace"(target_workspace_id) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Workspace write access is required.';
  END IF;

  IF requested_action_key NOT IN ('arc.update', 'arc.delete')
    OR requested_handler_version <> (CASE requested_action_key
      WHEN 'arc.update' THEN 'goals-paths.arc.update.v1'
      ELSE 'goals-paths.arc.delete.v1'
    END)
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'The requested action handler is unavailable.';
  END IF;

  IF requested_idempotency_key IS NULL
    OR length(requested_idempotency_key) NOT BETWEEN 1 AND 128
    OR jsonb_typeof(action_input) <> 'object'
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'The action request is invalid.';
  END IF;

  SELECT installation."tool_release_id", release."manifest"
  INTO selected_release_id, selected_manifest
  FROM "public"."tool_installations" AS installation
  JOIN "public"."tool_definitions" AS definition
    ON definition."id" = installation."tool_definition_id"
  JOIN "public"."tool_releases" AS release
    ON release."id" = installation."tool_release_id"
  WHERE installation."id" = target_installation_id
    AND installation."workspace_id" = target_workspace_id
    AND installation."status" = 'active'
    AND definition."key" = 'core.goals-paths'
    AND release."version" = '3.1.0';

  IF selected_release_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'The active Goals and Paths installation is unavailable.';
  END IF;

  SELECT action_spec INTO selected_action
  FROM jsonb_array_elements(COALESCE(selected_manifest->'actions', '[]'::jsonb))
    AS manifest_action(action_spec)
  WHERE action_spec->>'key' = requested_action_key
  LIMIT 1;

  IF selected_action IS NULL
    OR selected_action->>'execution' <> 'deterministic'
    OR selected_action->'output'->>'rootBlockTypeKey' <> 'goals-paths.arc'
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'The installed release does not support this Arc action.';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT block_type_key), ARRAY[]::text[])
  INTO action_block_type_keys
  FROM (
    SELECT jsonb_array_elements_text(
      COALESCE(selected_action->'output'->'createsBlockTypeKeys', '[]'::jsonb)
    ) AS block_type_key
    UNION ALL
    SELECT jsonb_array_elements_text(
      COALESCE(selected_action->'output'->'writesBlockTypeKeys', '[]'::jsonb)
    ) AS block_type_key
  ) AS action_types;

  IF cardinality(action_block_type_keys) = 0 THEN
    RAISE EXCEPTION 'The Arc action has no declared block scope.';
  END IF;

  FOR required_permission IN
    SELECT value
    FROM jsonb_array_elements(
      COALESCE(selected_action->'requiredPermissions', '[]'::jsonb)
    )
  LOOP
    IF NOT "private"."tool_grant_allows"(
      target_installation_id,
      trim(both '"' from required_permission::text),
      action_block_type_keys,
      ARRAY[]::text[]
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'The installed tool is not granted this action.';
    END IF;
  END LOOP;

  BEGIN
    selected_arc_id := (action_input->>'arcId')::uuid;
    expected_revision := (action_input->>'expectedRevision')::bigint;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'A valid Arc ID and revision are required.';
  END;

  IF expected_revision < 1 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'A valid Arc revision is required.';
  END IF;

  IF requested_action_key = 'arc.delete' THEN
    FOR input_key IN SELECT jsonb_object_keys(action_input)
    LOOP
      IF input_key NOT IN ('arcId', 'expectedRevision') THEN
        RAISE EXCEPTION USING
          ERRCODE = '22023',
          MESSAGE = 'Delete input contains an unsupported field.';
      END IF;
    END LOOP;
  ELSE
    FOR input_key IN SELECT jsonb_object_keys(action_input)
    LOOP
      IF input_key NOT IN (
        'arcId', 'expectedRevision', 'title', 'objective', 'currentReality',
        'why', 'targetDate', 'constraints'
      ) THEN
        RAISE EXCEPTION USING
          ERRCODE = '22023',
          MESSAGE = 'Update input contains an unsupported field.';
      END IF;
    END LOOP;

    title_text := btrim(action_input->>'title');
    objective := btrim(action_input->>'objective');
    current_reality := btrim(action_input->>'currentReality');
    why_text := NULLIF(btrim(action_input->>'why'), '');
    target_date_text := NULLIF(action_input->>'targetDate', '');
    constraints_value := action_input->'constraints';

    IF title_text IS NULL OR length(title_text) NOT BETWEEN 1 AND 120
      OR objective IS NULL OR length(objective) NOT BETWEEN 1 AND 4000
      OR current_reality IS NULL OR length(current_reality) NOT BETWEEN 1 AND 8000
      OR (why_text IS NOT NULL AND length(why_text) > 4000)
      OR jsonb_typeof(constraints_value) <> 'array'
      OR jsonb_array_length(constraints_value) > 20
    THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'Update input is outside the supported limits.';
    END IF;

    IF target_date_text IS NOT NULL THEN
      IF target_date_text !~ '^\d{4}-\d{2}-\d{2}$' THEN
        RAISE EXCEPTION USING
          ERRCODE = '22023',
          MESSAGE = 'Target date must use YYYY-MM-DD.';
      END IF;
      PERFORM target_date_text::date;
    END IF;

    FOR constraint_value IN
      SELECT value FROM jsonb_array_elements(constraints_value)
    LOOP
      IF jsonb_typeof(constraint_value) <> 'string'
        OR length(btrim(constraint_value #>> '{}')) NOT BETWEEN 1 AND 300
        OR (constraint_value #>> '{}') ~ E'[\r\n]'
      THEN
        RAISE EXCEPTION USING
          ERRCODE = '22023',
          MESSAGE = 'Every constraint must be a short string.';
      END IF;
    END LOOP;

    SELECT btrim(line)
    INTO objective_summary
    FROM regexp_split_to_table(objective, E'\r?\n') AS objective_line(line)
    WHERE btrim(line) <> ''
    LIMIT 1;

    objective_summary := left(
      regexp_replace(
        btrim(regexp_replace(objective_summary, '^[#>*+_~` -]+', '', 'g')),
        '[[:space:]]+',
        ' ',
        'g'
      ),
      280
    );
    IF objective_summary = '' THEN
      objective_summary := left(objective, 280);
    END IF;

    body_markdown :=
      '# Objective' || E'\n\n' || objective ||
      E'\n\n# Current Reality\n\n' || current_reality;

    IF why_text IS NOT NULL THEN
      body_markdown :=
        body_markdown || E'\n\n# Why This Matters\n\n' || why_text;
    END IF;

    IF jsonb_array_length(constraints_value) > 0 THEN
      SELECT string_agg('- ' || constraint_text, E'\n' ORDER BY ordinal)
      INTO constraints_markdown
      FROM jsonb_array_elements_text(constraints_value)
        WITH ORDINALITY AS constraint_item(constraint_text, ordinal);

      body_markdown :=
        body_markdown || E'\n\n# Constraints\n\n' || constraints_markdown;
    END IF;
  END IF;

  selected_manifest_hash := md5(selected_manifest::text);
  selected_input_hash := md5(action_input::text);

  INSERT INTO "public"."tool_runs" (
    "workspace_id", "installation_id", "tool_release_id", "actor_id",
    "action_key", "handler_version", "invocation_source", "status",
    "idempotency_key", "input", "input_hash", "manifest_hash", "started_at"
  ) VALUES (
    target_workspace_id, target_installation_id, selected_release_id, actor_id,
    requested_action_key, requested_handler_version, 'web', 'running',
    requested_idempotency_key, action_input, selected_input_hash,
    selected_manifest_hash, CURRENT_TIMESTAMP
  )
  ON CONFLICT ("installation_id", "idempotency_key") DO NOTHING
  RETURNING * INTO created_run;

  inserted := created_run."id" IS NOT NULL;
  IF NOT inserted THEN
    SELECT * INTO existing_run
    FROM "public"."tool_runs" AS run
    WHERE run."installation_id" = target_installation_id
      AND run."idempotency_key" = requested_idempotency_key;

    IF existing_run."actor_id" <> actor_id
      OR existing_run."action_key" <> requested_action_key
      OR existing_run."handler_version" <> requested_handler_version
      OR existing_run."input_hash" <> selected_input_hash
      OR existing_run."input" <> action_input
    THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'The idempotency key was already used for another request.';
    END IF;
    created_run := existing_run;
  ELSE
    BEGIN
      SELECT block."revision"
      INTO current_revision
      FROM "public"."blocks" AS block
      JOIN "public"."block_types" AS block_type
        ON block_type."id" = block."block_type_id"
      WHERE block."id" = selected_arc_id
        AND block."workspace_id" = target_workspace_id
        AND block."origin_tool_installation_id" = target_installation_id
        AND block."created_by_id" = actor_id
        AND block."status" = 'active'
        AND block."archived_at" IS NULL
        AND block_type."key" = 'goals-paths.arc'
      FOR UPDATE OF block;

      IF current_revision IS NULL THEN
        RAISE EXCEPTION USING
          ERRCODE = 'P0002',
          MESSAGE = 'The Arc is unavailable.';
      END IF;

      IF current_revision <> expected_revision THEN
        RAISE EXCEPTION USING
          ERRCODE = '22023',
          MESSAGE = 'The Arc revision has changed.';
      END IF;

      IF requested_action_key = 'arc.update' THEN
        UPDATE "public"."blocks"
        SET
          "title" = title_text,
          "summary" = objective_summary,
          "body" = body_markdown,
          "properties" = jsonb_build_object(
            'objective', objective,
            'why', why_text,
            'currentReality', current_reality,
            'targetDate', target_date_text,
            'constraints', constraints_value,
            'contentFormat', 'text/markdown',
            'okf', jsonb_build_object(
              'type', 'Character Arc',
              'profile', 'character-arc.arc',
              'profileVersion', 1
            )
          ),
          "schema_version" = 2,
          "revision" = "revision" + 1,
          "updated_at" = CURRENT_TIMESTAMP
        WHERE "id" = selected_arc_id;
      ELSE
        UPDATE "public"."blocks"
        SET
          "status" = 'archived',
          "archived_at" = CURRENT_TIMESTAMP,
          "revision" = "revision" + 1,
          "updated_at" = CURRENT_TIMESTAMP
        WHERE "id" = selected_arc_id;

        UPDATE "public"."user_block_states"
        SET
          "status" = 'archived',
          "last_activity_at" = CURRENT_TIMESTAMP,
          "updated_at" = CURRENT_TIMESTAMP
        WHERE "block_id" = selected_arc_id
          AND "user_id" = actor_id;
      END IF;

      UPDATE "public"."tool_runs"
      SET
        "status" = 'succeeded',
        "output" = jsonb_build_object(
          'rootBlockId', selected_arc_id,
          'createdBlockIds', '[]'::jsonb,
          'evidenceIds', '[]'::jsonb,
          'operation', requested_action_key,
          'previousRevision', current_revision,
          'newRevision', current_revision + 1
        ),
        "completed_at" = CURRENT_TIMESTAMP
      WHERE "id" = created_run."id"
      RETURNING * INTO created_run;
    EXCEPTION WHEN OTHERS THEN
      UPDATE "public"."tool_runs"
      SET
        "status" = 'failed',
        "error_code" = SQLSTATE,
        "error_message" = CASE SQLSTATE
          WHEN '22023' THEN 'This Arc changed elsewhere. Refresh it before trying again.'
          WHEN 'P0002' THEN 'This Arc is unavailable.'
          WHEN '42501' THEN 'Only the Arc owner can make that change.'
          ELSE 'The Arc could not be changed.'
        END,
        "completed_at" = CURRENT_TIMESTAMP
      WHERE "id" = created_run."id"
      RETURNING * INTO created_run;
    END;
  END IF;

  RETURN QUERY SELECT
    created_run."id",
    created_run."status",
    CASE WHEN created_run."output" ? 'rootBlockId'
      THEN (created_run."output"->>'rootBlockId')::uuid ELSE NULL END,
    COALESCE(ARRAY(
      SELECT value::uuid FROM jsonb_array_elements_text(
        COALESCE(created_run."output"->'createdBlockIds', '[]'::jsonb)
      ) AS created_id(value)
    ), ARRAY[]::uuid[]),
    COALESCE(ARRAY(
      SELECT value::uuid FROM jsonb_array_elements_text(
        COALESCE(created_run."output"->'evidenceIds', '[]'::jsonb)
      ) AS evidence_id(value)
    ), ARRAY[]::uuid[]),
    created_run."error_code",
    created_run."error_message";
END;
$$;

REVOKE ALL ON FUNCTION "public"."execute_goals_paths_create_arc_v3_1"(
  uuid, uuid, text, text, jsonb
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION "public"."execute_goals_paths_create_arc_v3_1"(
  uuid, uuid, text, text, jsonb
) TO authenticated, service_role;

REVOKE ALL ON FUNCTION "public"."execute_goals_paths_arc_update_v2"(
  uuid, uuid, text, text, text, jsonb
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION "public"."execute_goals_paths_arc_update_v2"(
  uuid, uuid, text, text, text, jsonb
) TO authenticated, service_role;

REVOKE ALL ON FUNCTION "public"."execute_goals_paths_arc_content_v1"(
  uuid, uuid, text, text, text, jsonb
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION "public"."execute_goals_paths_arc_content_v1"(
  uuid, uuid, text, text, text, jsonb
) TO authenticated, service_role;

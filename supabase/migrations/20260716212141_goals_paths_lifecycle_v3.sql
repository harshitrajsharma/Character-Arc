-- Publish a lifecycle-capable Goals and Paths release. Arc content remains a
-- generic Block; personal lifecycle is projected in user_block_states and
-- every progress update appends immutable evidence.

INSERT INTO "public"."tool_releases" (
  "tool_definition_id",
  "version",
  "status",
  "schema_version",
  "manifest",
  "published_at"
)
SELECT
  definition."id",
  '3.0.0',
  'published'::"public"."tool_release_status",
  2,
  $manifest$
{"manifestVersion":1,"tool":{"key":"core.goals-paths","name":"Goals and Paths","description":"Turn a current reality into possible paths, milestones, and clear next actions.","icon":"route","category":"plan"},"release":{"version":"3.0.0","schemaVersion":2},"routes":{"home":"/tools/goals-paths","create":"/tools/goals-paths/new"},"defaultGrants":[{"permissionKey":"blocks.read.owned","effect":"allow","constraints":{"origin":"installation","blockTypeKeys":["goals-paths.arc","goals-paths.path-option","goals-paths.milestone","goals-paths.action"]}},{"permissionKey":"blocks.write.owned","effect":"allow","constraints":{"origin":"installation","blockTypeKeys":["goals-paths.arc","goals-paths.path-option","goals-paths.milestone","goals-paths.action"]}},{"permissionKey":"ai.generate","effect":"deny","constraints":{"requiresEntitlement":"in_app_ai"}}],"blockTypes":[{"key":"goals-paths.arc","name":"Arc","description":"A meaningful outcome the user is actively pursuing.","kind":"container","schemaVersion":2,"propertiesSchema":{"type":"object","additionalProperties":false,"required":["objective","currentReality","contentFormat","okf"],"properties":{"objective":{"type":"string","minLength":1,"maxLength":4000,"contentMediaType":"text/markdown"},"why":{"type":"string","minLength":0,"maxLength":4000,"contentMediaType":"text/markdown"},"currentReality":{"type":"string","minLength":1,"maxLength":8000,"contentMediaType":"text/markdown"},"targetDate":{"type":["string","null"],"format":"date"},"constraints":{"type":"array","maxItems":20,"items":{"type":"string","minLength":1,"maxLength":300}},"contentFormat":{"type":"string","minLength":1,"maxLength":80},"okf":{"type":"object","additionalProperties":false,"required":["type","profile","profileVersion"],"properties":{"type":{"type":"string","minLength":1,"maxLength":80},"profile":{"type":"string","minLength":1,"maxLength":120},"profileVersion":{"type":"integer","minimum":1}}}}}},{"key":"goals-paths.path-option","name":"Path option","description":"One possible route from the current reality to the arc.","kind":"entity","schemaVersion":1,"propertiesSchema":{"type":"object","additionalProperties":false,"required":["rationale"],"properties":{"rationale":{"type":"string","minLength":1,"maxLength":2000},"tradeoffs":{"type":"array","maxItems":12,"items":{"type":"string","maxLength":500}},"confidence":{"type":["number","null"],"minimum":0,"maximum":100}}}},{"key":"goals-paths.milestone","name":"Milestone","description":"A verifiable checkpoint on a selected path.","kind":"entity","schemaVersion":1,"propertiesSchema":{"type":"object","additionalProperties":false,"required":["successCriteria"],"properties":{"successCriteria":{"type":"string","minLength":1,"maxLength":1000},"targetDate":{"type":["string","null"],"format":"date"}}}},{"key":"goals-paths.action","name":"Action","description":"A concrete next move that advances a milestone.","kind":"entity","schemaVersion":1,"propertiesSchema":{"type":"object","additionalProperties":false,"required":["definitionOfDone"],"properties":{"definitionOfDone":{"type":"string","minLength":1,"maxLength":1000},"dueDate":{"type":["string","null"],"format":"date"},"estimateMinutes":{"type":["integer","null"],"minimum":1}}}}],"relationTypes":[{"key":"goals-paths.arc-has-path-option","name":"Arc has path option","description":"Connects an arc to a possible route.","sourceBlockTypeKey":"goals-paths.arc","targetBlockTypeKey":"goals-paths.path-option","cardinality":"one_to_many"},{"key":"goals-paths.arc-has-milestone","name":"Arc has milestone","description":"Connects an arc to a verifiable checkpoint.","sourceBlockTypeKey":"goals-paths.arc","targetBlockTypeKey":"goals-paths.milestone","cardinality":"one_to_many"},{"key":"goals-paths.milestone-has-action","name":"Milestone has action","description":"Connects a milestone to a concrete next move.","sourceBlockTypeKey":"goals-paths.milestone","targetBlockTypeKey":"goals-paths.action","cardinality":"one_to_many"}],"actions":[{"key":"arc.create","name":"Create arc","description":"Creates an arc directly from user-approved information.","execution":"deterministic","requiredPermissions":["blocks.write.owned"],"inputSchema":{"type":"object","additionalProperties":false,"required":["title","objective","currentReality"],"properties":{"title":{"type":"string","minLength":1,"maxLength":120},"objective":{"type":"string","minLength":1,"maxLength":4000,"contentMediaType":"text/markdown"},"why":{"type":"string","minLength":0,"maxLength":4000,"contentMediaType":"text/markdown"},"currentReality":{"type":"string","minLength":1,"maxLength":8000,"contentMediaType":"text/markdown"},"targetDate":{"type":["string","null"],"format":"date"},"constraints":{"type":"array","maxItems":20,"items":{"type":"string","minLength":1,"maxLength":300}}}},"output":{"rootBlockTypeKey":"goals-paths.arc","createsBlockTypeKeys":["goals-paths.arc"]}},{"key":"arc.check-in","name":"Record Arc check-in","description":"Records progress and optional evidence for an Arc.","execution":"deterministic","requiredPermissions":["blocks.write.owned"],"inputSchema":{"type":"object","additionalProperties":false,"required":["arcId","progressPercent"],"properties":{"arcId":{"type":"string","format":"uuid"},"progressPercent":{"type":"number","minimum":0,"maximum":100},"note":{"type":"string","maxLength":2000}}},"output":{"rootBlockTypeKey":"goals-paths.arc","createsBlockTypeKeys":["goals-paths.arc"]}},{"key":"arc.set-status","name":"Change Arc status","description":"Changes the personal lifecycle state of an Arc.","execution":"deterministic","requiredPermissions":["blocks.write.owned"],"inputSchema":{"type":"object","additionalProperties":false,"required":["arcId","status"],"properties":{"arcId":{"type":"string","format":"uuid"},"status":{"type":"string","enum":["active","paused","completed","archived"]}}},"output":{"rootBlockTypeKey":"goals-paths.arc","createsBlockTypeKeys":["goals-paths.arc"]}}]}
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
  AND release."version" = '3.0.0'
WHERE installation."tool_definition_id" = definition."id"
  AND definition."key" = 'core.goals-paths'
  AND installation."status" = 'active';

-- Preserve the audited v2 implementation while binding it to the immutable
-- v3 release and handler name.
DO $$
DECLARE
  function_definition text;
BEGIN
  SELECT pg_get_functiondef(
    'public.execute_goals_paths_create_arc_v2(uuid,uuid,text,text,jsonb)'::regprocedure
  ) INTO function_definition;

  function_definition := replace(
    function_definition,
    'execute_goals_paths_create_arc_v2',
    'execute_goals_paths_create_arc_v3'
  );
  function_definition := replace(
    function_definition,
    'goals-paths.arc.create.v2',
    'goals-paths.arc.create.v3'
  );
  EXECUTE function_definition;
END;
$$;

CREATE OR REPLACE FUNCTION "private"."initialize_goals_paths_arc_state"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW."created_by_id" IS NOT NULL AND EXISTS (
    SELECT 1
    FROM "public"."block_types" AS block_type
    WHERE block_type."id" = NEW."block_type_id"
      AND block_type."key" = 'goals-paths.arc'
  ) THEN
    INSERT INTO "public"."user_block_states" (
      "workspace_id", "user_id", "block_id", "status",
      "progress_percent", "last_activity_at"
    ) VALUES (
      NEW."workspace_id", NEW."created_by_id", NEW."id", 'active', 0,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("user_id", "block_id") DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "initialize_goals_paths_arc_state" ON "public"."blocks";
CREATE TRIGGER "initialize_goals_paths_arc_state"
AFTER INSERT ON "public"."blocks"
FOR EACH ROW EXECUTE FUNCTION "private"."initialize_goals_paths_arc_state"();

INSERT INTO "public"."user_block_states" (
  "workspace_id", "user_id", "block_id", "status", "progress_percent",
  "last_activity_at"
)
SELECT
  block."workspace_id", block."created_by_id", block."id", 'active', 0,
  block."updated_at"
FROM "public"."blocks" AS block
JOIN "public"."block_types" AS block_type ON block_type."id" = block."block_type_id"
WHERE block_type."key" = 'goals-paths.arc'
  AND block."created_by_id" IS NOT NULL
  AND block."archived_at" IS NULL
ON CONFLICT ("user_id", "block_id") DO NOTHING;

CREATE OR REPLACE FUNCTION "public"."execute_goals_paths_arc_update_v1"(
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
  selected_evidence_id uuid;
  selected_progress numeric;
  selected_note text;
  selected_status "public"."user_block_status";
  inserted boolean := false;
BEGIN
  IF actor_id IS NULL OR NOT "public"."can_write_workspace"(target_workspace_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Workspace write access is required.';
  END IF;

  IF requested_action_key NOT IN ('arc.check-in', 'arc.set-status')
    OR requested_handler_version <> (CASE requested_action_key
      WHEN 'arc.check-in' THEN 'goals-paths.arc.check-in.v1'
      ELSE 'goals-paths.arc.set-status.v1'
    END)
  THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'The requested action handler is unavailable.';
  END IF;

  IF requested_idempotency_key IS NULL
    OR length(requested_idempotency_key) NOT BETWEEN 1 AND 128
    OR jsonb_typeof(action_input) <> 'object'
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'The action request is invalid.';
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
    AND release."version" = '3.0.0';

  IF selected_release_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'The active Goals and Paths installation is unavailable.';
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
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'The installed release does not support this Arc action.';
  END IF;

  SELECT COALESCE(array_agg(block_type_key), ARRAY[]::text[])
  INTO action_block_type_keys
  FROM jsonb_array_elements_text(selected_action->'output'->'createsBlockTypeKeys')
    AS output_type(block_type_key);

  FOR required_permission IN
    SELECT value FROM jsonb_array_elements(selected_action->'requiredPermissions')
  LOOP
    IF NOT "private"."tool_grant_allows"(
      target_installation_id,
      trim(both '"' from required_permission::text),
      action_block_type_keys,
      ARRAY[]::text[]
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'The installed tool is not granted this action.';
    END IF;
  END LOOP;

  BEGIN
    selected_arc_id := (action_input->>'arcId')::uuid;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A valid Arc ID is required.';
  END;

  IF NOT EXISTS (
    SELECT 1
    FROM "public"."blocks" AS block
    JOIN "public"."block_types" AS block_type ON block_type."id" = block."block_type_id"
    WHERE block."id" = selected_arc_id
      AND block."workspace_id" = target_workspace_id
      AND block."origin_tool_installation_id" = target_installation_id
      AND block."archived_at" IS NULL
      AND block_type."key" = 'goals-paths.arc'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'The Arc is unavailable.';
  END IF;

  IF requested_action_key = 'arc.check-in' THEN
    BEGIN
      selected_progress := (action_input->>'progressPercent')::numeric;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Progress must be a number from 0 to 100.';
    END;
    selected_note := NULLIF(btrim(action_input->>'note'), '');
    IF selected_progress < 0 OR selected_progress > 100
      OR (selected_note IS NOT NULL AND length(selected_note) > 2000)
    THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'The check-in is outside the supported limits.';
    END IF;
  ELSE
    BEGIN
      selected_status := (action_input->>'status')::"public"."user_block_status";
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'The Arc status is invalid.';
    END;
    IF selected_status NOT IN ('active', 'paused', 'completed', 'archived') THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'The Arc status is invalid.';
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

    IF existing_run."action_key" <> requested_action_key
      OR existing_run."input_hash" <> selected_input_hash
      OR existing_run."input" <> action_input
    THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'The idempotency key was already used for another request.';
    END IF;
    created_run := existing_run;
  ELSE
    BEGIN
      IF requested_action_key = 'arc.check-in' THEN
        INSERT INTO "public"."progress_evidence" (
          "workspace_id", "user_id", "block_id", "source_type", "source_id",
          "evidence_key", "numeric_value", "max_value", "properties", "occurred_at"
        ) VALUES (
          target_workspace_id, actor_id, selected_arc_id, 'manual',
          created_run."id"::text, 'arc.check-in', selected_progress, 100,
          jsonb_build_object('note', selected_note), CURRENT_TIMESTAMP
        ) RETURNING "id" INTO selected_evidence_id;

        INSERT INTO "public"."user_block_states" (
          "workspace_id", "user_id", "block_id", "status",
          "progress_percent", "last_activity_at"
        ) VALUES (
          target_workspace_id, actor_id, selected_arc_id,
          CASE WHEN selected_progress = 100 THEN 'completed' ELSE 'active' END,
          selected_progress, CURRENT_TIMESTAMP
        )
        ON CONFLICT ("user_id", "block_id") DO UPDATE SET
          "status" = EXCLUDED."status",
          "progress_percent" = EXCLUDED."progress_percent",
          "last_activity_at" = EXCLUDED."last_activity_at",
          "updated_at" = CURRENT_TIMESTAMP;
      ELSE
        INSERT INTO "public"."user_block_states" (
          "workspace_id", "user_id", "block_id", "status", "last_activity_at"
        ) VALUES (
          target_workspace_id, actor_id, selected_arc_id, selected_status,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT ("user_id", "block_id") DO UPDATE SET
          "status" = EXCLUDED."status",
          "last_activity_at" = EXCLUDED."last_activity_at",
          "updated_at" = CURRENT_TIMESTAMP;
      END IF;

      UPDATE "public"."tool_runs"
      SET
        "status" = 'succeeded',
        "output" = jsonb_build_object(
          'rootBlockId', selected_arc_id,
          'createdBlockIds', '[]'::jsonb,
          'evidenceIds', CASE WHEN selected_evidence_id IS NULL
            THEN '[]'::jsonb ELSE jsonb_build_array(selected_evidence_id) END
        ),
        "completed_at" = CURRENT_TIMESTAMP
      WHERE "id" = created_run."id"
      RETURNING * INTO created_run;
    EXCEPTION WHEN OTHERS THEN
      UPDATE "public"."tool_runs"
      SET "status" = 'failed', "error_code" = SQLSTATE,
        "error_message" = 'The action could not be completed.',
        "completed_at" = CURRENT_TIMESTAMP
      WHERE "id" = created_run."id"
      RETURNING * INTO created_run;
    END;
  END IF;

  RETURN QUERY SELECT
    created_run."id", created_run."status",
    CASE WHEN created_run."output" ? 'rootBlockId'
      THEN (created_run."output"->>'rootBlockId')::uuid ELSE NULL END,
    COALESCE(ARRAY(SELECT value::uuid FROM jsonb_array_elements_text(
      COALESCE(created_run."output"->'createdBlockIds', '[]'::jsonb)
    ) AS created_id(value)), ARRAY[]::uuid[]),
    COALESCE(ARRAY(SELECT value::uuid FROM jsonb_array_elements_text(
      COALESCE(created_run."output"->'evidenceIds', '[]'::jsonb)
    ) AS evidence_id(value)), ARRAY[]::uuid[]),
    created_run."error_code", created_run."error_message";
END;
$$;

REVOKE ALL ON FUNCTION "public"."execute_goals_paths_create_arc_v3"(
  uuid, uuid, text, text, jsonb
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION "public"."execute_goals_paths_create_arc_v3"(
  uuid, uuid, text, text, jsonb
) TO authenticated, service_role;

REVOKE ALL ON FUNCTION "public"."execute_goals_paths_arc_update_v1"(
  uuid, uuid, text, text, text, jsonb
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION "public"."execute_goals_paths_arc_update_v1"(
  uuid, uuid, text, text, text, jsonb
) TO authenticated, service_role;

GRANT SELECT ON TABLE "public"."user_block_states" TO authenticated, service_role;
GRANT SELECT ON TABLE "public"."progress_evidence" TO authenticated, service_role;

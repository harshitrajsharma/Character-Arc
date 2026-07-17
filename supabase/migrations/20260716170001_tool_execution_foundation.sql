-- Durable, idempotent execution records for strict installed-tool actions.

CREATE TYPE "public"."tool_run_status" AS ENUM (
  'queued',
  'running',
  'succeeded',
  'failed',
  'cancelled'
);

CREATE TABLE "public"."tool_runs" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL,
  "installation_id" uuid,
  "tool_release_id" uuid NOT NULL,
  "actor_id" uuid,
  "action_key" text NOT NULL,
  "handler_version" text NOT NULL,
  "invocation_source" text NOT NULL DEFAULT 'web',
  "status" "public"."tool_run_status" NOT NULL DEFAULT 'queued',
  "idempotency_key" text NOT NULL,
  "input" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "input_hash" text NOT NULL,
  "manifest_hash" text NOT NULL,
  "output" jsonb,
  "error_code" text,
  "error_message" text,
  "started_at" timestamptz(3),
  "completed_at" timestamptz(3),
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tool_runs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tool_runs_installation_id_idempotency_key_key"
    UNIQUE ("installation_id", "idempotency_key"),
  CONSTRAINT "tool_runs_action_key_check"
    CHECK ("action_key" ~ '^[a-z0-9]+([.-][a-z0-9]+)*$'),
  CONSTRAINT "tool_runs_handler_version_check"
    CHECK (length("handler_version") BETWEEN 1 AND 80),
  CONSTRAINT "tool_runs_invocation_source_check"
    CHECK ("invocation_source" IN ('web', 'api', 'mcp', 'cli', 'agent')),
  CONSTRAINT "tool_runs_idempotency_key_check"
    CHECK (length("idempotency_key") BETWEEN 1 AND 128),
  CONSTRAINT "tool_runs_input_hash_check"
    CHECK ("input_hash" ~ '^[0-9a-f]{32}$'),
  CONSTRAINT "tool_runs_manifest_hash_check"
    CHECK ("manifest_hash" ~ '^[0-9a-f]{32}$'),
  CONSTRAINT "tool_runs_input_object_check"
    CHECK (jsonb_typeof("input") = 'object'),
  CONSTRAINT "tool_runs_output_object_check"
    CHECK ("output" IS NULL OR jsonb_typeof("output") = 'object'),
  CONSTRAINT "tool_runs_lifecycle_check" CHECK (
    ("status" = 'queued' AND "started_at" IS NULL AND "completed_at" IS NULL)
    OR ("status" = 'running' AND "started_at" IS NOT NULL AND "completed_at" IS NULL)
    OR ("status" IN ('succeeded', 'failed', 'cancelled') AND "completed_at" IS NOT NULL)
  ),
  CONSTRAINT "tool_runs_error_state_check" CHECK (
    "status" = 'failed'
    OR ("error_code" IS NULL AND "error_message" IS NULL)
  )
);

ALTER TABLE "public"."blocks"
ADD COLUMN "origin_tool_run_id" uuid;

ALTER TABLE "public"."tool_runs"
ADD CONSTRAINT "tool_runs_workspace_id_fkey"
FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id")
ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "tool_runs_installation_id_fkey"
FOREIGN KEY ("installation_id") REFERENCES "public"."tool_installations"("id")
ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "tool_runs_tool_release_id_fkey"
FOREIGN KEY ("tool_release_id") REFERENCES "public"."tool_releases"("id")
ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "tool_runs_actor_id_fkey"
FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."blocks"
ADD CONSTRAINT "blocks_origin_tool_run_id_fkey"
FOREIGN KEY ("origin_tool_run_id") REFERENCES "public"."tool_runs"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "tool_runs_workspace_id_status_created_at_idx"
ON "public"."tool_runs"("workspace_id", "status", "created_at");

CREATE INDEX "tool_runs_actor_id_created_at_idx"
ON "public"."tool_runs"("actor_id", "created_at");

CREATE INDEX "tool_runs_tool_release_id_action_key_created_at_idx"
ON "public"."tool_runs"("tool_release_id", "action_key", "created_at");

CREATE INDEX "blocks_origin_tool_run_id_idx"
ON "public"."blocks"("origin_tool_run_id");

CREATE OR REPLACE FUNCTION "public"."validate_tool_run_installation"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  installation_workspace_id uuid;
  installation_release_id uuid;
BEGIN
  IF NEW."installation_id" IS NULL THEN
    IF NEW."status" NOT IN ('succeeded', 'failed', 'cancelled') THEN
      RAISE EXCEPTION 'only terminal tool runs may detach from an installation';
    END IF;

    RETURN NEW;
  END IF;

  SELECT
    installation."workspace_id",
    installation."tool_release_id"
  INTO
    installation_workspace_id,
    installation_release_id
  FROM "public"."tool_installations" AS installation
  WHERE installation."id" = NEW."installation_id";

  IF installation_workspace_id IS DISTINCT FROM NEW."workspace_id" THEN
    RAISE EXCEPTION 'tool run installation must belong to the run workspace';
  END IF;

  IF installation_release_id IS DISTINCT FROM NEW."tool_release_id" THEN
    RAISE EXCEPTION 'tool run release must match the installed release';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "tool_runs_installation_guard"
BEFORE INSERT OR UPDATE ON "public"."tool_runs"
FOR EACH ROW EXECUTE FUNCTION "public"."validate_tool_run_installation"();

CREATE OR REPLACE FUNCTION "public"."validate_block_tool_run"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  run_workspace_id uuid;
  run_installation_id uuid;
BEGIN
  IF NEW."origin_tool_run_id" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    run."workspace_id",
    run."installation_id"
  INTO
    run_workspace_id,
    run_installation_id
  FROM "public"."tool_runs" AS run
  WHERE run."id" = NEW."origin_tool_run_id";

  IF run_workspace_id IS DISTINCT FROM NEW."workspace_id" THEN
    RAISE EXCEPTION 'origin tool run must belong to the block workspace';
  END IF;

  IF run_installation_id IS DISTINCT FROM NEW."origin_tool_installation_id" THEN
    RAISE EXCEPTION 'origin tool run and installation must match';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "blocks_origin_tool_run_guard"
BEFORE INSERT OR UPDATE ON "public"."blocks"
FOR EACH ROW EXECUTE FUNCTION "public"."validate_block_tool_run"();

CREATE TRIGGER "tool_runs_set_updated_at"
BEFORE UPDATE ON "public"."tool_runs"
FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE OR REPLACE FUNCTION "public"."protect_published_tool_release"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD."status" = 'published' THEN
    RAISE EXCEPTION 'Published tool releases are immutable; publish a new version.';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "tool_releases_protect_published"
BEFORE UPDATE OR DELETE ON "public"."tool_releases"
FOR EACH ROW EXECUTE FUNCTION "public"."protect_published_tool_release"();

CREATE SCHEMA IF NOT EXISTS "private";
REVOKE ALL ON SCHEMA "private" FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION "private"."clear_tool_grants_for_reconcile"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW."status" = 'active' THEN
    DELETE FROM "public"."tool_grants"
    WHERE "installation_id" = NEW."id";
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION "private"."clear_tool_grants_for_reconcile"()
FROM PUBLIC, anon, authenticated;

CREATE TRIGGER "tool_installations_reconcile_grants"
AFTER INSERT OR UPDATE OF "tool_release_id", "status"
ON "public"."tool_installations"
FOR EACH ROW EXECUTE FUNCTION "private"."clear_tool_grants_for_reconcile"();

CREATE OR REPLACE FUNCTION "private"."tool_grant_allows"(
  target_installation_id uuid,
  requested_permission_key text,
  requested_block_type_keys text[],
  active_entitlements text[] DEFAULT ARRAY[]::text[]
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  grant_row record;
  constraint_key text;
  constraint_block_type jsonb;
  constraints_match boolean;
  has_allow boolean := false;
BEGIN
  FOR grant_row IN
    SELECT grant_rule."effect", grant_rule."constraints"
    FROM "public"."tool_grants" AS grant_rule
    WHERE grant_rule."installation_id" = target_installation_id
      AND grant_rule."permission_key" = requested_permission_key
  LOOP
    IF jsonb_typeof(grant_row."constraints") <> 'object' THEN
      RETURN false;
    END IF;

    FOR constraint_key IN
      SELECT jsonb_object_keys(grant_row."constraints")
    LOOP
      IF constraint_key NOT IN ('origin', 'blockTypeKeys', 'requiresEntitlement') THEN
        RETURN false;
      END IF;
    END LOOP;

    IF grant_row."constraints" ? 'origin'
      AND grant_row."constraints"->>'origin' <> 'installation'
    THEN
      RETURN false;
    END IF;

    constraints_match := true;

    IF grant_row."constraints" ? 'blockTypeKeys' THEN
      IF jsonb_typeof(grant_row."constraints"->'blockTypeKeys') <> 'array'
        OR cardinality(requested_block_type_keys) = 0
      THEN
        RETURN false;
      END IF;

      FOR constraint_block_type IN
        SELECT value
        FROM jsonb_array_elements(grant_row."constraints"->'blockTypeKeys')
      LOOP
        IF jsonb_typeof(constraint_block_type) <> 'string'
          OR length(trim(both '"' from constraint_block_type::text)) = 0
        THEN
          RETURN false;
        END IF;
      END LOOP;

      constraints_match := NOT EXISTS (
        SELECT 1
        FROM unnest(requested_block_type_keys) AS requested_key
        WHERE NOT EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(
            grant_row."constraints"->'blockTypeKeys'
          ) AS allowed_key
          WHERE allowed_key = requested_key
        )
      );
    END IF;

    IF grant_row."constraints" ? 'requiresEntitlement' THEN
      IF jsonb_typeof(grant_row."constraints"->'requiresEntitlement') <> 'string'
        OR length(grant_row."constraints"->>'requiresEntitlement') = 0
      THEN
        RETURN false;
      END IF;

      constraints_match := constraints_match
        AND (grant_row."constraints"->>'requiresEntitlement' = ANY(active_entitlements));
    END IF;

    IF constraints_match AND grant_row."effect" = 'deny' THEN
      RETURN false;
    END IF;

    IF constraints_match AND grant_row."effect" = 'allow' THEN
      has_allow := true;
    END IF;
  END LOOP;

  RETURN has_allow;
END;
$$;

REVOKE ALL ON FUNCTION "private"."tool_grant_allows"(uuid, text, text[], text[])
FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION "public"."execute_goals_paths_create_arc"(
  target_workspace_id uuid,
  target_installation_id uuid,
  requested_idempotency_key text,
  requested_handler_version text,
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
  selected_block_type_id uuid;
  selected_manifest_hash text;
  selected_input_hash text;
  required_permission jsonb;
  action_block_type_keys text[];
  existing_run "public"."tool_runs"%ROWTYPE;
  created_run "public"."tool_runs"%ROWTYPE;
  created_block_id uuid;
  objective text;
  current_reality text;
  why_text text;
  target_date_text text;
  constraints_value jsonb;
  constraint_value jsonb;
  input_key text;
  inserted boolean := false;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Authentication is required to execute tools.';
  END IF;

  IF NOT "public"."can_write_workspace"(target_workspace_id) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Workspace write access is required.';
  END IF;

  IF requested_idempotency_key IS NULL
    OR length(requested_idempotency_key) NOT BETWEEN 1 AND 128
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'A valid idempotency key is required.';
  END IF;

  IF requested_handler_version <> 'goals-paths.arc.create.v1' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'The requested action handler is unavailable.';
  END IF;

  IF jsonb_typeof(action_input) <> 'object' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Action input must be an object.';
  END IF;

  SELECT
    installation."tool_release_id",
    release."manifest"
  INTO
    selected_release_id,
    selected_manifest
  FROM "public"."tool_installations" AS installation
  JOIN "public"."tool_definitions" AS definition
    ON definition."id" = installation."tool_definition_id"
  JOIN "public"."tool_releases" AS release
    ON release."id" = installation."tool_release_id"
  WHERE installation."id" = target_installation_id
    AND installation."workspace_id" = target_workspace_id
    AND installation."status" = 'active'
    AND definition."key" = 'core.goals-paths';

  IF selected_release_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'The active Goals and Paths installation is unavailable.';
  END IF;

  selected_manifest_hash := md5(selected_manifest::text);
  selected_input_hash := md5(action_input::text);

  SELECT action_spec
  INTO selected_action
  FROM jsonb_array_elements(
    COALESCE(selected_manifest->'actions', '[]'::jsonb)
  ) AS manifest_action(action_spec)
  WHERE action_spec->>'key' = 'arc.create'
  LIMIT 1;

  IF selected_action IS NULL
    OR selected_action->>'execution' <> 'deterministic'
    OR selected_action->'output'->>'rootBlockTypeKey' <> 'goals-paths.arc'
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'The installed release does not support arc creation.';
  END IF;

  SELECT COALESCE(array_agg(block_type_key), ARRAY[]::text[])
  INTO action_block_type_keys
  FROM jsonb_array_elements_text(
    COALESCE(
      selected_action->'output'->'createsBlockTypeKeys',
      '[]'::jsonb
    )
  ) AS output_type(block_type_key);

  IF cardinality(action_block_type_keys) = 0 THEN
    RAISE EXCEPTION 'The arc.create action has no declared output block types.';
  END IF;

  FOR required_permission IN
    SELECT value
    FROM jsonb_array_elements(
      COALESCE(selected_action->'requiredPermissions', '[]'::jsonb)
    )
  LOOP
    IF jsonb_typeof(required_permission) <> 'string'
      OR NOT "private"."tool_grant_allows"(
        target_installation_id,
        trim(both '"' from required_permission::text),
        action_block_type_keys,
        ARRAY[]::text[]
      )
    THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'The installed tool is not granted this action.';
    END IF;
  END LOOP;

  FOR input_key IN SELECT jsonb_object_keys(action_input)
  LOOP
    IF input_key NOT IN ('objective', 'why', 'currentReality', 'targetDate', 'constraints') THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'Action input contains an unsupported field.';
    END IF;
  END LOOP;

  objective := btrim(action_input->>'objective');
  current_reality := btrim(action_input->>'currentReality');
  why_text := NULLIF(btrim(action_input->>'why'), '');
  target_date_text := NULLIF(action_input->>'targetDate', '');
  constraints_value := COALESCE(action_input->'constraints', '[]'::jsonb);

  IF objective IS NULL OR length(objective) NOT BETWEEN 1 AND 500
    OR current_reality IS NULL OR length(current_reality) NOT BETWEEN 1 AND 2000
    OR (why_text IS NOT NULL AND length(why_text) > 1000)
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Action input is outside the supported limits.';
  END IF;

  IF target_date_text IS NOT NULL THEN
    IF target_date_text !~ '^\d{4}-\d{2}-\d{2}$' THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'Target date must use YYYY-MM-DD.';
    END IF;

    PERFORM target_date_text::date;
  END IF;

  IF jsonb_typeof(constraints_value) <> 'array'
    OR jsonb_array_length(constraints_value) > 20
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Constraints must be an array with at most 20 items.';
  END IF;

  FOR constraint_value IN SELECT value FROM jsonb_array_elements(constraints_value)
  LOOP
    IF jsonb_typeof(constraint_value) <> 'string'
      OR length(trim(both '"' from constraint_value::text)) > 300
    THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'Every constraint must be a short string.';
    END IF;
  END LOOP;

  INSERT INTO "public"."tool_runs" (
    "workspace_id",
    "installation_id",
    "tool_release_id",
    "actor_id",
    "action_key",
    "handler_version",
    "invocation_source",
    "status",
    "idempotency_key",
    "input",
    "input_hash",
    "manifest_hash",
    "started_at"
  )
  VALUES (
    target_workspace_id,
    target_installation_id,
    selected_release_id,
    actor_id,
    'arc.create',
    requested_handler_version,
    'web',
    'running',
    requested_idempotency_key,
    action_input,
    selected_input_hash,
    selected_manifest_hash,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT ("installation_id", "idempotency_key") DO NOTHING
  RETURNING * INTO created_run;

  inserted := created_run."id" IS NOT NULL;

  IF NOT inserted THEN
    SELECT *
    INTO existing_run
    FROM "public"."tool_runs" AS run
    WHERE run."installation_id" = target_installation_id
      AND run."idempotency_key" = requested_idempotency_key;

    IF existing_run."action_key" <> 'arc.create'
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
      SELECT block_type."id"
      INTO selected_block_type_id
      FROM "public"."block_types" AS block_type
      JOIN "public"."tool_definitions" AS definition
        ON definition."id" = block_type."tool_definition_id"
      WHERE block_type."key" = 'goals-paths.arc'
        AND definition."key" = 'core.goals-paths';

      IF selected_block_type_id IS NULL THEN
        RAISE EXCEPTION 'The goals-paths.arc block type is unavailable.';
      END IF;

      created_block_id := gen_random_uuid();

      INSERT INTO "public"."blocks" (
        "id",
        "workspace_id",
        "block_type_id",
        "created_by_id",
        "origin_tool_installation_id",
        "origin_tool_run_id",
        "title",
        "slug",
        "summary",
        "status",
        "visibility",
        "allow_agent_access",
        "properties",
        "schema_version"
      )
      VALUES (
        created_block_id,
        target_workspace_id,
        selected_block_type_id,
        actor_id,
        target_installation_id,
        created_run."id",
        objective,
        'arc-' || replace(created_run."id"::text, '-', ''),
        current_reality,
        'active',
        'private',
        false,
        jsonb_build_object(
          'objective', objective,
          'why', why_text,
          'currentReality', current_reality,
          'targetDate', target_date_text,
          'constraints', constraints_value
        ),
        1
      );

      UPDATE "public"."tool_runs"
      SET
        "status" = 'succeeded',
        "output" = jsonb_build_object(
          'rootBlockId', created_block_id,
          'createdBlockIds', jsonb_build_array(created_block_id),
          'evidenceIds', '[]'::jsonb
        ),
        "completed_at" = CURRENT_TIMESTAMP
      WHERE "id" = created_run."id"
      RETURNING * INTO created_run;
    EXCEPTION WHEN OTHERS THEN
      UPDATE "public"."tool_runs"
      SET
        "status" = 'failed',
        "error_code" = SQLSTATE,
        "error_message" = 'The action could not be completed.',
        "completed_at" = CURRENT_TIMESTAMP
      WHERE "id" = created_run."id"
      RETURNING * INTO created_run;
    END;
  END IF;

  RETURN QUERY
  SELECT
    created_run."id",
    created_run."status",
    CASE
      WHEN created_run."output" ? 'rootBlockId'
      THEN (created_run."output"->>'rootBlockId')::uuid
      ELSE NULL
    END,
    COALESCE(
      ARRAY(
        SELECT value::uuid
        FROM jsonb_array_elements_text(
          COALESCE(created_run."output"->'createdBlockIds', '[]'::jsonb)
        ) AS created_id(value)
      ),
      ARRAY[]::uuid[]
    ),
    COALESCE(
      ARRAY(
        SELECT value::uuid
        FROM jsonb_array_elements_text(
          COALESCE(created_run."output"->'evidenceIds', '[]'::jsonb)
        ) AS evidence_id(value)
      ),
      ARRAY[]::uuid[]
    ),
    created_run."error_code",
    created_run."error_message";
END;
$$;

REVOKE ALL ON FUNCTION "public"."execute_goals_paths_create_arc"(
  uuid,
  uuid,
  text,
  text,
  jsonb
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION "public"."execute_goals_paths_create_arc"(
  uuid,
  uuid,
  text,
  text,
  jsonb
) TO authenticated, service_role;

ALTER TABLE "public"."tool_runs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tool_runs_workspace_select"
ON "public"."tool_runs"
FOR SELECT
TO authenticated
USING ((SELECT "public"."can_read_workspace"("workspace_id")));

GRANT SELECT ON TABLE
  "public"."tool_runs",
  "public"."blocks",
  "public"."block_types",
  "public"."workspaces"
TO authenticated;

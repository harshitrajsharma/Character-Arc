-- Provision application records only after Supabase has verified the user's email.
-- The function is idempotent because it runs on both insert and confirmation update.
CREATE OR REPLACE FUNCTION "public"."handle_new_auth_user"()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  personal_workspace_id uuid;
  resolved_name text;
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;

  resolved_name := COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''), 'My Workspace');

  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'avatar_url', '')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name),
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url);

  SELECT id
  INTO personal_workspace_id
  FROM public.workspaces
  WHERE created_by_id = NEW.id AND kind = 'personal'
  LIMIT 1;

  IF personal_workspace_id IS NULL THEN
    INSERT INTO public.workspaces (created_by_id, kind, name, slug)
    VALUES (NEW.id, 'personal', resolved_name, 'personal-' || NEW.id::text)
    RETURNING id INTO personal_workspace_id;
  END IF;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (personal_workspace_id, NEW.id, 'owner')
  ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = 'owner';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "on_auth_user_created" ON "auth"."users";
DROP TRIGGER IF EXISTS "on_auth_user_email_confirmed" ON "auth"."users";

CREATE TRIGGER "on_auth_user_created"
AFTER INSERT ON "auth"."users"
FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_auth_user"();

CREATE TRIGGER "on_auth_user_email_confirmed"
AFTER UPDATE OF email_confirmed_at ON "auth"."users"
FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION "public"."handle_new_auth_user"();

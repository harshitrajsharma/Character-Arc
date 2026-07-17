-- PostgreSQL resolves the CASE expression as text inside VALUES. Cast the
-- computed state explicitly to the enum used by user_block_states.status.
DO $$
DECLARE
  function_definition text;
BEGIN
  SELECT pg_get_functiondef(
    'public.execute_goals_paths_arc_update_v1(uuid,uuid,text,text,text,jsonb)'::regprocedure
  ) INTO function_definition;

  function_definition := replace(
    function_definition,
    'CASE WHEN selected_progress = 100 THEN ''completed'' ELSE ''active'' END,',
    '(CASE WHEN selected_progress = 100 THEN ''completed'' ELSE ''active'' END)::"public"."user_block_status",'
  );

  IF function_definition NOT LIKE '%END)::"public"."user_block_status",%' THEN
    RAISE EXCEPTION 'The Arc check-in status cast could not be installed.';
  END IF;

  EXECUTE function_definition;
END;
$$;

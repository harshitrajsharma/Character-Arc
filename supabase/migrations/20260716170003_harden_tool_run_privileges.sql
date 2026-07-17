-- RLS remains the row boundary, while explicit ACLs remove unused write paths.
REVOKE ALL ON TABLE "public"."tool_runs" FROM anon, authenticated;

GRANT SELECT ON TABLE "public"."tool_runs" TO authenticated;
GRANT ALL ON TABLE "public"."tool_runs" TO service_role;

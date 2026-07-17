# Database workflow

Supabase SQL migrations are the single executable database history. Prisma is the server-only ORM and application model.

## First local setup

Install and initialize the Supabase CLI, then start the local stack:

```powershell
supabase init
supabase start
supabase db reset
bun run db:generate
```

`supabase db reset` applies every file in `supabase/migrations` to the local Supabase database, including Auth linkage, triggers, checks, and RLS.

## Normal schema change

1. Edit `prisma/schema.prisma`.
2. Run `bun run db:format` and `bun run db:validate`.
3. Create one new timestamped SQL file under `supabase/migrations`.
4. Add the relational DDL plus any required checks, triggers, indexes, grants, and RLS policies.
5. Run `supabase db reset` against local development.
6. Run `bun run db:generate`.
7. Test both allowed and denied RLS cases.

For large schema changes, Prisma can generate a starting SQL diff:

```powershell
bunx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
```

Review that output before placing it in a Supabase migration. Prisma does not generate Supabase Auth triggers, RLS policies, or all PostgreSQL checks.

Do not also run `prisma migrate dev` for this database. Maintaining two migration histories will eventually create drift.

## Hosted deployment

After local verification:

```powershell
supabase db push
bun run db:generate
```

Review the target project and migration diff before pushing. Never put a service-role key or direct database password in browser code.

## Auth email templates

The hosted **Confirm signup** email must use `supabase/templates/confirmation.html`. It contains `{{ .Token }}` so Supabase sends the six-digit OTP expected by the signup verification screen. Do not replace it with `{{ .ConfirmationURL }}` unless the application is intentionally changed back to link-based confirmation.

Hosted email templates are Auth project configuration, not database migrations. Update them through the Supabase Dashboard or Management API and verify the remote template after deployment.

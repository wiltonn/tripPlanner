# Migration Plan: Prisma → Supabase

## Summary

Replace Prisma ORM with Supabase JS client. Add multi-tenancy via organizations with RLS.

## Prerequisites

1. Supabase project created (local or hosted)
2. Environment variables configured:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Migration Steps

### Step 1: Apply SQL Migration

```bash
supabase db push
# or
supabase migration up
```

This runs `supabase/migrations/00001_initial_schema.sql` which creates:
- 4 enum types
- 14 tables with constraints
- RLS policies on all tables
- 2 helper functions (is_org_member, get_org_role)
- Auto-owner trigger
- Updated_at triggers
- All indexes

### Step 2: Generate TypeScript Types

```bash
pnpm -F @trip-planner/db db:gen-types
```

This overwrites `infra/db/src/database.types.ts` with types generated from the live schema.

### Step 3: Data Migration (if existing data)

If migrating from existing Prisma/PostgreSQL data:

1. Export existing trips, day_plans, places, routes, route_alternatives
2. Create an organization for the existing data
3. Add the user as owner of that organization
4. Insert data with `organization_id` set to the new org
5. Use the admin client (bypasses RLS) for bulk inserts

### Step 4: Verify

Run verification queries:

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;

-- Check policies
SELECT tablename, policyname FROM pg_policies
WHERE schemaname = 'public' ORDER BY tablename;

-- Check indexes
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public' ORDER BY indexname;
```

## Rollback Strategy

1. The migration is additive — no existing tables are dropped
2. To rollback: drop all new tables, enums, functions, and triggers
3. Restore Prisma schema and `@prisma/client` dependency
4. Revert `infra/db/src/client.ts` to Prisma singleton

## Breaking Changes

| Area | Before | After |
|------|--------|-------|
| Column naming | camelCase (Prisma) | snake_case (Supabase) |
| Domain schemas | `startDate`, `dayPlanId` | `start_date`, `day_plan_id` |
| Auth | None | Supabase Auth JWT required |
| API headers | None | `Authorization: Bearer <token>`, `x-organization-id: <uuid>` |
| DB client | `prisma.trip.create()` | `supabase.from('trips').insert()` |
| Timestamps | JavaScript Date objects | ISO 8601 strings |

## Environment Variable Changes

### Removed
- `DATABASE_URL`

### Added
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Verification Checklist

- [ ] Migration applies cleanly on Supabase branch
- [ ] All 14 tables created with correct columns
- [ ] All RLS policies active
- [ ] All indexes created
- [ ] Auto-owner trigger fires on org creation
- [ ] Updated_at triggers fire on row updates
- [ ] `supabase gen types` produces valid TypeScript
- [ ] API routes compile with new Supabase client
- [ ] Auth middleware correctly validates JWTs
- [ ] RLS blocks cross-org data access
- [ ] Cascade deletes work (delete org → all children gone)
- [ ] Tracked\<T\> JSONB round-trips correctly

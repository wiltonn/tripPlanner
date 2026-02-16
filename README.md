# Trip Planner

A full-stack multi-day trip planning system with interactive map rendering, route alternatives, offline-first mobile, and multi-tenant auth.

## Tech Stack

| Layer | Tech |
|-------|------|
| Web | Next.js 15, React 19, Mapbox GL JS 3, Tailwind 4, Zustand |
| API | Fastify 5, LRU cache, Zod validation |
| Mobile | React Native, Expo 52, Mapbox SDK, SQLite |
| Database | Supabase PostgreSQL with RLS |
| Auth | Supabase Auth (cookie sessions + Bearer tokens) |
| Shared | TypeScript, pnpm workspaces, Turborepo, Vitest |

## Prerequisites

- Node.js >= 20
- pnpm 9.15+ (`corepack enable`)
- Supabase project (for auth + database)
- Mapbox access token (public + secret)

## Setup

```bash
pnpm install
```

Create a `.env` file in the project root:

```
MAPBOX_TOKEN=<your_public_token>
MAPBOX_SECRET_TOKEN=<your_secret_token>
API_PORT=4000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
```

Create `apps/web/.env.local`:

```
NEXT_PUBLIC_MAPBOX_TOKEN=<your_public_token>
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
```

Run Supabase migrations and generate types:

```bash
pnpm db:migrate
pnpm db:generate
```

## Development

```bash
# Start all apps (web on :3000, api on :4000)
pnpm dev

# Start individually
pnpm -F @trip-planner/web dev       # Web on :3000
pnpm -F @trip-planner/api dev       # API on :4000
pnpm -F @trip-planner/mobile start  # Expo mobile
```

## Testing

```bash
# Run all tests
pnpm test

# Run per-package
pnpm -F @trip-planner/core test
pnpm -F @trip-planner/map test
pnpm -F @trip-planner/api test

# Run guardrails (lint + test for core, map, api)
pnpm guardrails
```

## Project Structure

```
apps/
  web/          Next.js frontend with Mapbox GL map + Supabase auth
  api/          Fastify routing API with auth + CRUD routes
  mobile/       React Native + Expo app (offline-first)

packages/
  core/         Domain types, Zod schemas, GeoJSON validation
  map/          GeoJSON builders, normalizer, layer styles
  db/           Supabase client factory + generated DB types

supabase/
  migrations/   Multi-tenant RLS schema

docs/
  auth-setup.md           Supabase auth configuration guide
  db/schema-spec.md       Database design with RLS matrix
  db/migration-plan.md    Migration strategy
```

## Architecture

- **Routing is server-side only** — clients call `POST /routes/directions`, never Mapbox directly
- **GeoJSON is the rendering contract** — all map data flows as validated FeatureCollections with deterministic IDs
- **Domain model is authoritative** — `packages/core` defines all shared types; apps import, never redefine
- **Segments carry cumulative metrics** — elapsed distance/duration and route totals are baked into GeoJSON properties at normalization time
- **Multi-tenant auth** — Supabase RLS scopes all data to organizations; web uses cookie sessions, API validates Bearer tokens with `x-organization-id` header
- **Offline-first mobile** — trip data persisted to SQLite, tile packs managed with size estimation

## API Routes

**Public:**
- `POST /routes/directions` — routing with alternatives and caching
- `POST /routes/isochrone` — travel time contours
- `GET /search/places` — place search
- `GET /health`

**Protected** (Bearer token + x-organization-id):
- `/trips` — CRUD (create, list, get, update, delete)
- `/day-plans` — CRUD
- `/places` — CRUD

## Documentation

- [`CLAUDE.md`](./CLAUDE.md) — architectural guidelines and guardrail skills
- [`docs/auth-setup.md`](./docs/auth-setup.md) — Supabase auth configuration
- [`docs/db/schema-spec.md`](./docs/db/schema-spec.md) — database schema with RLS matrix
- [`docs/db/migration-plan.md`](./docs/db/migration-plan.md) — migration strategy

# Trip Planner

Multi-day trip planning app with route alternatives, segment interaction, and ETA deltas. Built on Mapbox GL JS with a server-side routing API.

## Tech Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Web**: Next.js 14, React 18, Mapbox GL JS 3
- **API**: Fastify 5, tsx
- **Packages**: Zod schemas, GeoJSON builders, layer composition
- **Tests**: Vitest

## Prerequisites

- Node.js >= 18
- pnpm 9.x (`corepack enable`)
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
```

Create `apps/web/.env.local`:

```
NEXT_PUBLIC_MAPBOX_TOKEN=<your_public_token>
```

## Development

```bash
# Start all apps (web on :3000, api on :4000)
pnpm dev

# Start individually
pnpm -F @trip-planner/web dev
pnpm -F @trip-planner/api dev
```

## Testing

```bash
# Run all tests
pnpm test

# Run per-package
pnpm -F @trip-planner/core test
pnpm -F @trip-planner/map test
pnpm -F @trip-planner/api test
```

## Project Structure

```
apps/
  web/          Next.js frontend with Mapbox GL map
  api/          Fastify routing API (proxies Mapbox Directions)

packages/
  core/         Domain types, Zod schemas, GeoJSON validation
  map/          GeoJSON builders, normalizer, layer styles
```

## Architecture

- **Routing is server-side only** — clients call `POST /routes/directions`, never Mapbox directly
- **GeoJSON is the rendering contract** — all map data flows as validated FeatureCollections with deterministic IDs
- **Domain model is authoritative** — `packages/core` defines all shared types; apps import, never redefine
- **Segments carry cumulative metrics** — elapsed distance/duration and route totals are baked into GeoJSON properties at normalization time, not computed in the UI

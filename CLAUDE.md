# CLAUDE.md

## Project: Multi-Day Trip Planner (Mapbox | Web + Mobile | Offline-Aware)

This repository contains a full-stack trip planning system designed for:

* Multi-day route previews (day-by-day polylines)
* Route alternatives (fastest, scenic, avoid highways)
* Tappable route segments with ETA deltas
* Offline resilience (mobile-first)
* Advanced overlays (clusters, isochrones, elevation, custom icons)
* Hybrid navigation (deep link to Google / Apple / Waze)

---

# Architectural Doctrine

This project follows strict domain and rendering separation.

If unsure, prefer:

**Determinism over magic**
**Domain purity over convenience**
**GeoJSON as source of truth**
**Server-orchestrated routing**
**Offline-first mobile**

---

# System Topology

```
apps/
  web/        # Next.js 14 + Mapbox GL JS 3
  api/        # Fastify 5 (routing proxy, LRU cache)
  mobile/     # React Native + Mapbox SDK (planned)

packages/
  core/       # Domain model + zod schemas + GeoJSON validation
  map/        # GeoJSON builders, normalizer, layer styles

infra/
  db/         # Prisma schema + migrations (planned)
```

---

# Non-Negotiable Rules

## 1. Routing Is Server-Side Only

Clients MUST NOT call Mapbox Directions API directly.

All routing goes through:

```
POST /routes/directions
```

The API must:

* Normalize Mapbox responses
* Convert geometry to canonical GeoJSON
* Cache by deterministic key
* Never leak raw Mapbox payloads

---

## 2. GeoJSON Is the Rendering Contract

All map data must be GeoJSON.

Never render raw coordinate arrays directly in UI.

Every feature must contain:

* Stable deterministic IDs
* Required properties
* Proper [lon, lat] ordering

---

## 3. Domain Model Is Authoritative

`packages/core` defines:

* Trip
* DayPlan
* Place
* Route
* RouteAlternative
* GeoJSON feature schemas

Apps may not redefine these types.

All validation must use zod.

---

## 4. Mobile Is Offline-First

Mobile must:

* Persist trip + route data locally
* Cache offline tile regions
* Render without network
* Only refresh routing if explicitly requested

Web offline is best-effort only.

---

# Canonical GeoJSON Schemas

## Place Feature

```ts
{
  type: "Feature",
  geometry: { type: "Point", coordinates: [lon, lat] },
  properties: {
    id: string,
    name: string,
    category: string,
    dayIndex?: number
  }
}
```

---

## Route Segment Feature

Each step is represented individually. Segments carry cumulative metrics so tooltips and UI can compute elapsed/remaining without re-deriving from the route.

```ts
{
  type: "Feature",
  geometry: { type: "LineString", coordinates: [...] },
  properties: {
    id: string,               // deterministic: routeId:altId:legIndex:stepIndex
    altId: number,
    dayIndex: number,
    legIndex: number,
    stepIndex: number,
    distance: number,          // this segment (meters)
    duration: number,          // this segment (seconds)
    name: string,
    cumulativeDistance: number, // running sum from day start (meters)
    cumulativeDuration: number,// running sum from day start (seconds)
    altTotalDistance: number,   // route total for self-contained tooltip math
    altTotalDuration: number
  }
}
```

IDs must be deterministic.

---

# Mapbox Rendering Model

Each day has one source and 4 layers:

* Source: `route-day-{index}` (promoteId: `id`)
* `route-day-{i}-other` — dimmed non-selected alternatives (dashed)
* `route-day-{i}-outline` — wider dark outline for selected alt
* `route-day-{i}-base` — primary route line; width cascades: selected (9) > hover (8) > default (6)
* `route-day-{i}-active` — glow overlay; amber `#fbbf24` when selected, white when hover

Feature-state keys: `hover` (boolean), `selected` (boolean).

Places use:

* Clustered GeoJSON source (`places`)
* `clusters` — circle layer
* `cluster-count` — symbol layer
* `unclustered-point` — circle layer with `selected` feature-state

Never mix days without `dayIndex` property + filter.

---

# Required Claude Guardrail Skills

Claude must use the following reusable skills during development.

---

## 1. ts-lsp-guard

Purpose:
Ensure type integrity across the monorepo.

Must:

* Run TypeScript compiler
* Enforce no implicit any
* Prevent circular dependencies
* Ensure apps import domain types only from `core`
* Ensure zod schemas match TypeScript interfaces

Invoke:

* After domain changes
* Before API refactors
* Before mobile build

---

## 2. geojson-validator

Purpose:
Validate all GeoJSON before rendering.

Must:

* Ensure FeatureCollection validity
* Enforce [lon, lat] ordering
* Verify geometry type consistency
* Ensure required properties exist
* Reject null geometries
* Validate bbox correctness

Invoke:

* After routing normalization
* After geometry transformations

---

## 3. routing-contract-check

Purpose:
Enforce API stability.

Must:

* Validate `/routes/directions` output schema
* Confirm no raw Mapbox payload returned
* Verify deterministic IDs
* Verify caching layer used
* Validate alternative selection logic

Invoke:

* Before deployment
* After Mapbox SDK updates

---

## 4. route-performance-audit

Purpose:
Prevent map performance degradation.

Must:

* Count features per source
* Warn if > 5000 segments per day
* Suggest geometry simplification
* Detect unnecessary source re-creation
* Validate bbox fitting logic

Invoke:

* After routing logic changes
* Before mobile release

---

## 5. offline-region-estimator

Purpose:
Prevent excessive tile downloads.

Must:

* Estimate tile size per region
* Warn if > 200MB
* Suggest zoom caps
* Validate route corridor buffer bounds

Invoke:

* When offline pack logic changes
* Before production mobile release

---

## 6. mapbox-layer-compose

Purpose:
Ensure consistent layer definitions.

Must:

* Separate base vs active layers
* Support feature-state
* Avoid duplicate styling logic
* Validate day filtering

---

## 7. geojson-normalize

Purpose:
Convert Mapbox Directions response into canonical GeoJSON.

Must:

* Generate per-step segment features
* Preserve coordinate ordering
* Compute cumulative metrics
* Compute bbox
* Produce deterministic IDs

---

## 8. directions-cache-key

Purpose:
Generate deterministic routing cache keys.

Must:

* Round coordinates to 5 decimals
* Sort parameters
* Include profile + avoid flags
* Include departureTime if present

---

## 9. nav-deeplink

Purpose:
Generate navigation links.

Must support:

* Apple Maps
* Google Maps
* Waze
* Mode selection
* Platform detection

---

# API Contract

## POST /routes/directions

Input:

```
{
  profile: "driving" | "walking" | "cycling",
  coordinates: [[lon,lat], ...],
  alternatives: boolean,
  avoid?: {
    tolls?: boolean,
    ferries?: boolean,
    highways?: boolean
  }
}
```

Output:

```
{
  summary: NormalizedSummary[],
  geojson: {
    routeLines: FeatureCollection,
    segments: FeatureCollection,
    bbox: [minLon, minLat, maxLon, maxLat]
  }
}
```

Never return raw Mapbox response.

---

# Performance Constraints

* Max 5000 segment features per day
* Use geometry simplification if exceeded
* Avoid re-registering sources unnecessarily
* Always fit map to bbox after route load

---

# Tooling

* Package manager: pnpm 9.x
* Build orchestration: Turborepo
* Tests: Vitest (`pnpm test` runs all via turbo)
* Web: `pnpm -F @trip-planner/web dev` (port 3000)
* API: `pnpm -F @trip-planner/api dev` (port 4000)

---

# Coding Standards

* TypeScript only
* Zod at all boundaries
* Deterministic IDs
* No implicit any
* Unit tests for routing normalization
* No Mapbox secret tokens in client

---

# What Must Never Happen

* Direct Mapbox Directions call from client
* Duplicate domain types across apps
* Geometry stored without validation
* Raw API payload passed to UI
* Offline region without size estimation
* Dynamic route metrics computed in UI without canonical source

---

# Development Order

1. ~~Domain model + zod~~ (done)
2. ~~Routing API + caching~~ (done)
3. ~~Web Map rendering~~ (done)
4. ~~Route alternatives UI~~ (done)
5. ~~Segment interaction~~ (done — cumulative metrics, click persistence, ETA deltas)
6. Mobile map
7. Offline packs
8. Guardrail skills integration
9. Isochrones
10. Elevation profiles

---

# Future Extensions

* Trip sharing + collaboration
* AI itinerary suggestions
* Weather overlays
* Traffic prediction modeling
* Crowd density heatmaps
* Live re-route comparison

---

# Execution Philosophy

This system is:

* Deterministic
* Domain-driven
* GeoJSON-native
* Cache-aware
* Performance-conscious
* Offline-resilient

If a change increases ambiguity, reduce it.

If a feature increases rendering complexity, measure it.

If a refactor touches routing, run guardrail skills.

---


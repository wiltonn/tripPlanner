# Skill: geojson-normalize

## Purpose

Convert Mapbox Directions API responses into canonical GeoJSON conforming to the project's domain model.

## When to Use

Use this skill whenever:
- Processing a raw Mapbox Directions API response
- Creating or modifying route normalization logic in `packages/map/src/normalize.ts`
- Building route data for map rendering

## Existing Implementation

The normalizer lives at `packages/map/src/normalize.ts` and uses helpers from `packages/map/src/geojson.ts`.

## Requirements

When writing or modifying normalization code, always:

1. **Preserve [lon, lat] coordinate order** — Mapbox uses `[longitude, latitude]`. Never swap to `[lat, lon]`.
2. **Generate per-step segment features** — Each `MapboxStep` becomes its own `Feature<LineString>` with a stable, deterministic ID using the pattern `{routeId}:{altId}:{legIndex}:{stepIndex}`.
3. **Include cumulative distance/duration metadata** — Every segment feature must carry `distance` (meters) and `duration` (seconds) in its properties.
4. **Compute bbox** — The output must include a bounding box `[minLng, minLat, maxLng, maxLat]` covering all route coordinates.
5. **Skip degenerate steps** — Steps with fewer than 2 coordinates must be skipped.

## Output Shape

The `normalizeDirections()` function must return:

```ts
{
  lines: GeoJSONFeatureCollection,      // Full route polylines (one per alternative)
  segments: GeoJSONFeatureCollection,   // Per-step segment features
  bbox: BBox,                           // [minLng, minLat, maxLng, maxLat]
  summary: NormalizedSummary[]          // Per-alternative metrics
}
```

## Segment Feature Properties

```ts
{
  id: string,         // deterministic: "{routeId}:{altId}:{legIndex}:{stepIndex}"
  dayIndex: number,
  altId: number,
  legIndex: number,
  stepIndex: number,
  distance: number,   // meters
  duration: number,   // seconds
  name: string        // step name from Mapbox
}
```

## Line Feature Properties

```ts
{
  id: string,         // "{routeId}:{altId}"
  dayIndex: number,
  altId: number,
  distance: number,   // total meters
  duration: number    // total seconds
}
```

## Rules

- All types must come from `packages/map/src/geojson.ts` and `packages/map/src/normalize.ts` — never define parallel GeoJSON types.
- Use `createFeature()`, `createLineString()`, `createFeatureCollection()` helpers from `geojson.ts`.
- IDs must be deterministic and stable across calls with the same input.
- Never return raw Mapbox API shapes to callers — always normalize first.
- All route transformations must be unit-tested.

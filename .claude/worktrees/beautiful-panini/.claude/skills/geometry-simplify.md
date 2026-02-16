# Skill: geometry-simplify

## Purpose

Enforce the 5,000 feature-per-day limit for route segments, simplify geometry when over the limit, and ensure bbox fitting on map load.

## When to Use

Use this skill whenever:
- Normalizing route data that may produce a high segment count
- Rendering a day's route on the map
- Implementing initial map viewport fitting
- Optimizing map performance for complex multi-leg routes

## Feature Count Limit

**Route segments per day must remain under 5,000 features.** This is a hard performance constraint from the CLAUDE.md.

### Check and Simplify

```ts
const MAX_SEGMENTS_PER_DAY = 5000;

function enforceSegmentLimit(
  segments: GeoJSONFeatureCollection,
  dayIndex: number
): GeoJSONFeatureCollection {
  const daySegments = segments.features.filter(
    (f) => (f.properties as Record<string, unknown>).dayIndex === dayIndex
  );

  if (daySegments.length <= MAX_SEGMENTS_PER_DAY) {
    return segments;
  }

  // Simplify: merge consecutive steps within the same leg
  return mergeStepsWithinLegs(daySegments, dayIndex);
}
```

## Geometry Simplification Strategies

When the segment count exceeds the limit, apply these strategies in order:

### 1. Merge Consecutive Steps (Preferred)

Combine adjacent steps within the same leg into fewer, longer segments. Preserves all coordinates but reduces feature count.

```ts
function mergeStepsWithinLegs(
  features: GeoJSONFeature[],
  dayIndex: number
): GeoJSONFeatureCollection {
  // Group by routeId:altId:legIndex
  const groups = new Map<string, GeoJSONFeature[]>();
  for (const f of features) {
    const p = f.properties as Record<string, unknown>;
    const key = `${p.routeId}:${p.altId}:${p.legIndex}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(f);
  }

  const merged: GeoJSONFeature[] = [];
  for (const [, legFeatures] of groups) {
    // Determine merge factor to stay under budget
    const budget = Math.floor(MAX_SEGMENTS_PER_DAY / groups.size);
    const mergeFactor = Math.ceil(legFeatures.length / budget);

    for (let i = 0; i < legFeatures.length; i += mergeFactor) {
      const batch = legFeatures.slice(i, i + mergeFactor);
      merged.push(mergeSegmentBatch(batch));
    }
  }

  return createFeatureCollection(merged);
}
```

### 2. Douglas-Peucker Coordinate Simplification (Fallback)

If merging steps isn't enough, reduce coordinate density on individual LineStrings.

```ts
function simplifyCoordinates(
  coords: [number, number][],
  tolerance: number = 0.00005 // ~5m at equator
): [number, number][] {
  if (coords.length <= 2) return coords;
  // Apply Douglas-Peucker algorithm
  // Always keep first and last points
  return douglasPeucker(coords, tolerance);
}
```

Use a library like `@turf/simplify` if available, or implement Douglas-Peucker directly.

### 3. Zoom-Dependent Detail (Advanced)

At low zoom levels, use simplified geometry. At high zoom, show full detail. This can be done via source `tolerance` in Mapbox GL:

```ts
map.addSource(sourceId, {
  type: "geojson",
  data: featureCollection,
  tolerance: 0.5, // simplification tolerance in screen pixels
});
```

## BBox Fitting

Always fit the map viewport to the route bbox on initial load or day change.

```ts
function fitMapToBBox(map: mapboxgl.Map, bbox: BBox, padding: number = 50): void {
  map.fitBounds(
    [[bbox[0], bbox[1]], [bbox[2], bbox[3]]],
    { padding, duration: 500 }
  );
}
```

## Avoiding Unnecessary Re-renders

- **Only update source data when it actually changes** — compare feature counts or a hash before calling `setData()`.
- **Use `map.getSource(id).setData()` instead of removing and re-adding sources.**
- **Batch source updates** — if multiple days change, update all sources before triggering a repaint.

```ts
function updateSourceIfChanged(
  map: mapboxgl.Map,
  sourceId: string,
  newData: GeoJSONFeatureCollection
): void {
  const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
  if (!source) return;
  source.setData(newData as unknown as GeoJSON.FeatureCollection);
}
```

## Rules

- **Hard limit: 5,000 segment features per day** — always enforce before rendering.
- **Prefer merging steps over dropping coordinates** — merging preserves route accuracy.
- **Always use bbox fitting on load** — never leave the map at a default viewport when route data is available.
- **Never re-render sources unnecessarily** — check for changes first.
- **Use helpers from `packages/map/src/geojson.ts`** — `createFeatureCollection()`, etc.
- **BBox type is `[minLng, minLat, maxLng, maxLat]`** from `packages/map/src/geojson.ts`.

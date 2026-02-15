# Skill: offline-region-planner

## Purpose

Define offline map tile regions for the mobile app so users can view trips without network connectivity.

## When to Use

Use this skill whenever:
- Implementing offline pack download logic in the React Native mobile app
- Working with Mapbox offline tile APIs
- Building trip pre-caching or background download features

## Region Types

### 1. Home Base Region

A circular area around the trip's starting point.

- **Center**: first place coordinate of day 1
- **Radius**: 10km default (configurable)
- **Zoom range**: 10 to 15 (max)
- **Style**: current map style URL

```ts
interface HomeBaseRegion {
  name: string;          // "trip-{tripId}-homebase"
  center: [number, number]; // [lon, lat]
  radiusKm: number;
  minZoom: number;
  maxZoom: number;
  styleURL: string;
}
```

### 2. Route Corridor Region

A bounding box buffered around the full route geometry.

- **BBox**: derived from the normalized route bbox + buffer
- **Buffer**: 5km on each side (configurable)
- **Zoom range**: 8 to 14 (max)
- **Style**: current map style URL

```ts
interface CorridorRegion {
  name: string;          // "trip-{tripId}-day-{dayIndex}-corridor"
  bounds: [[number, number], [number, number]]; // [[swLon, swLat], [neLon, neLat]]
  minZoom: number;
  maxZoom: number;
  styleURL: string;
}
```

## Buffer Calculation

To buffer a bbox by a distance in km:

```ts
function bufferBBox(bbox: BBox, bufferKm: number): BBox {
  // ~0.009 degrees per km at equator for latitude
  // longitude adjustment: divide by cos(latitude)
  const latBuffer = bufferKm * 0.009;
  const midLat = (bbox[1] + bbox[3]) / 2;
  const lngBuffer = bufferKm * 0.009 / Math.cos((midLat * Math.PI) / 180);

  return [
    bbox[0] - lngBuffer,
    bbox[1] - latBuffer,
    bbox[2] + lngBuffer,
    bbox[3] + latBuffer,
  ];
}
```

## Tile Count Estimation

Before downloading, estimate tile count to avoid excessive downloads:

```ts
function estimateTileCount(
  bounds: [[number, number], [number, number]],
  minZoom: number,
  maxZoom: number
): number {
  // Approximate: tiles double per zoom level in each axis
  let total = 0;
  for (let z = minZoom; z <= maxZoom; z++) {
    const tilesPerAxis = Math.pow(2, z);
    const lngSpan = bounds[1][0] - bounds[0][0];
    const latSpan = bounds[1][1] - bounds[0][1];
    const xTiles = Math.ceil((lngSpan / 360) * tilesPerAxis);
    const yTiles = Math.ceil((latSpan / 180) * tilesPerAxis);
    total += xTiles * yTiles;
  }
  return total;
}
```

## Rules

- **Cap max zoom at 15** — higher zooms produce massive tile counts with minimal benefit for routing.
- **Warn if estimated tile count exceeds 10,000** — prompt user confirmation before downloading.
- **Region names must be deterministic** — use `trip-{tripId}-homebase` and `trip-{tripId}-day-{dayIndex}-corridor`.
- **Persist region metadata locally** — store download status in SQLite/MMKV so the app knows what's cached.
- **Delete stale regions** — when a trip is updated, remove outdated offline packs before creating new ones.
- Use `packages/map/src/styles.ts` for style URLs.
- Coordinate order is always `[lon, lat]`.

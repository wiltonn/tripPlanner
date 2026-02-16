# Skill: directions-cache-key

## Purpose

Generate deterministic cache keys for Mapbox Directions API requests so identical routing queries always produce the same key, enabling reliable server-side caching.

## When to Use

Use this skill whenever:
- Implementing or modifying the directions caching layer in the API server
- Building the `/routes/directions` endpoint
- Working with Redis or any cache store for route responses

## Rules for Key Generation

1. **Round coordinates to 5 decimal places** — This gives ~1.1m precision, sufficient for routing. Use `coord.toFixed(5)`.
2. **Sort all parameters alphabetically** — Ensures consistent key regardless of property insertion order.
3. **Include the routing profile** — `driving`, `walking`, or `cycling` must be part of the key.
4. **Include avoid flags** — `tolls`, `ferries`, `highways` booleans. Only include flags that are `true`.
5. **Include departureTime if present** — ISO 8601 string, truncated to minute precision.
6. **Use a stable separator** — Use `|` between key segments and `:` within coordinate pairs.

## Key Format

```
directions|{profile}|{coords}|{avoid}|{departureTime?}
```

Where:
- `{profile}` = `driving` | `walking` | `cycling`
- `{coords}` = sorted coordinate pairs as `lon:lat` joined by `,` (e.g., `-74.00600:40.71280,-73.98513:40.74882`)
- `{avoid}` = alphabetically sorted active avoid flags joined by `,` (e.g., `ferries,tolls`) or empty string
- `{departureTime}` = ISO minute-truncated string or omitted

## Implementation Pattern

```ts
function buildDirectionsCacheKey(request: DirectionsRequest): string {
  const profile = request.profile;

  const coords = request.coordinates
    .map(([lon, lat]) => `${lon.toFixed(5)}:${lat.toFixed(5)}`)
    .join(",");

  const avoid = Object.entries(request.avoid ?? {})
    .filter(([, v]) => v === true)
    .map(([k]) => k)
    .sort()
    .join(",");

  const parts = ["directions", profile, coords, avoid];

  if (request.departureTime) {
    // Truncate to minute precision
    const dt = new Date(request.departureTime);
    dt.setSeconds(0, 0);
    parts.push(dt.toISOString());
  }

  return parts.join("|");
}
```

## Rules

- Never include non-deterministic data (timestamps of cache creation, random IDs) in the key.
- The `DirectionsRequest` schema is defined in `packages/core/src/schemas.ts` — use it for validation.
- Cache keys must be unit-tested with known inputs/outputs.
- Coordinate order is always `[lon, lat]` (Mapbox convention).

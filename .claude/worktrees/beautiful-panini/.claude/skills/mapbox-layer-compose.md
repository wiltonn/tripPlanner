# Skill: mapbox-layer-compose

## Purpose

Generate consistent Mapbox GL layer definitions for route rendering, ensuring separation of concerns between base, outline, and active layers with hover/selection state support.

## When to Use

Use this skill whenever:
- Adding or modifying Mapbox GL JS layers in the web app
- Adding or modifying Mapbox layers in the React Native mobile app
- Creating day-based route rendering logic
- Implementing place clustering layers

## Existing Code

Base styles live at `packages/map/src/styles.ts`. Layer composition should build on these constants.

## Route Layer Structure

Each day must have its own source and three layers:

### Source
- ID: `route-day-{dayIndex}`
- Type: `geojson`
- Data: a `FeatureCollection` filtered to the specific day

### Layers (per day)

1. **Outline layer** (`route-day-{dayIndex}-outline`)
   - Type: `line`
   - Wider stroke, muted color
   - Renders behind the base layer
   - Purpose: visual contrast against the map

2. **Base line layer** (`route-day-{dayIndex}-base`)
   - Type: `line`
   - Normal width, primary route color
   - Uses `feature-state` for hover highlight

3. **Active layer** (`route-day-{dayIndex}-active`)
   - Type: `line`
   - Bold width, bright color
   - Filtered to show only when the day is selected
   - Use a `["==", ["get", "dayIndex"], selectedDay]` filter or toggle visibility

### Layer Definition Pattern

```ts
function composeRouteLayers(dayIndex: number) {
  const sourceId = `route-day-${dayIndex}`;
  return {
    source: {
      id: sourceId,
      type: "geojson" as const,
      data: { type: "FeatureCollection", features: [] },
    },
    layers: [
      {
        id: `${sourceId}-outline`,
        type: "line" as const,
        source: sourceId,
        paint: {
          "line-color": "#94a3b8",
          "line-width": 8,
          "line-opacity": 0.5,
        },
      },
      {
        id: `${sourceId}-base`,
        type: "line" as const,
        source: sourceId,
        paint: {
          "line-color": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            "#2563eb",
            "#3b82f6",
          ],
          "line-width": 4,
        },
      },
      {
        id: `${sourceId}-active`,
        type: "line" as const,
        source: sourceId,
        paint: {
          "line-color": "#1d4ed8",
          "line-width": 6,
        },
        layout: {
          visibility: "none",
        },
      },
    ],
  };
}
```

## Place Layer Structure

Places use a clustered source with three layers:

1. **Cluster circle layer** (`places-cluster`)
   - Type: `circle`
   - Filter: `["has", "point_count"]`
   - Radius scaled by `point_count`

2. **Cluster count layer** (`places-cluster-count`)
   - Type: `symbol`
   - Filter: `["has", "point_count"]`
   - Text field: `["get", "point_count_abbreviated"]`

3. **Unclustered point layer** (`places-unclustered`)
   - Type: `symbol`
   - Filter: `["!", ["has", "point_count"]]`
   - Icon from custom sprite or circle fallback

## Rules

- Never mix days in a single source without a `dayIndex` property and filter.
- Use `feature-state` for hover — not paint expression toggling.
- Avoid inline style duplication — derive colors/widths from `packages/map/src/styles.ts`.
- Layer IDs must follow the naming convention: `{sourceId}-{role}`.
- All layer definitions must be functions that return plain objects — no side effects.

# Skill: feature-interaction

## Purpose

Handle route segment click/tap interactions on the map, identifying segments via feature properties and displaying duration, distance, and delta comparisons against the selected alternative.

## When to Use

Use this skill whenever:
- Implementing click/tap handlers on route segment layers
- Building segment tooltip popovers (web) or bottom sheets (mobile)
- Displaying route alternative comparison deltas
- Working with `feature-state` for hover/selection highlighting

## Segment Identification

When a user clicks/taps a route segment, identify it using feature properties — never by pixel position or geometry comparison.

```ts
// Web (Mapbox GL JS)
map.on("click", `route-day-${dayIndex}-base`, (e) => {
  const feature = e.features?.[0];
  if (!feature) return;

  const props = feature.properties;
  // props.id, props.routeId, props.altId, props.legIndex, props.stepIndex
  // props.distance, props.duration, props.name
});
```

```ts
// Mobile (React Native Mapbox)
onPress={(e) => {
  const feature = e.features?.[0];
  if (!feature) return;
  const props = feature.properties;
}}
```

## Delta Computation

Deltas compare the clicked segment's parent alternative against the currently selected alternative. **Always use precomputed metrics from the normalized summary — never recompute from geometry.**

```ts
interface SegmentDelta {
  segmentId: string;
  segmentDistance: number;
  segmentDuration: number;
  altTotalDistance: number;
  altTotalDuration: number;
  selectedTotalDistance: number;
  selectedTotalDuration: number;
  distanceDelta: number;    // alt - selected (positive = longer)
  durationDelta: number;    // alt - selected (positive = slower)
}

function computeAlternativeDelta(
  clickedAltId: number,
  selectedAltId: number,
  summaries: NormalizedSummary[],
  segmentProps: SegmentProperties
): SegmentDelta {
  const altSummary = summaries[clickedAltId];
  const selectedSummary = summaries[selectedAltId];

  return {
    segmentId: segmentProps.id,
    segmentDistance: segmentProps.distance,
    segmentDuration: segmentProps.duration,
    altTotalDistance: altSummary.totalDistance,
    altTotalDuration: altSummary.totalDuration,
    selectedTotalDistance: selectedSummary.totalDistance,
    selectedTotalDuration: selectedSummary.totalDuration,
    distanceDelta: altSummary.totalDistance - selectedSummary.totalDistance,
    durationDelta: altSummary.totalDuration - selectedSummary.totalDuration,
  };
}
```

## Hover State Management

Use Mapbox `feature-state` for hover highlighting — not paint expression toggling.

```ts
let hoveredFeatureId: string | null = null;

map.on("mousemove", layerId, (e) => {
  if (e.features && e.features.length > 0) {
    if (hoveredFeatureId !== null) {
      map.setFeatureState({ source: sourceId, id: hoveredFeatureId }, { hover: false });
    }
    hoveredFeatureId = e.features[0].id as string;
    map.setFeatureState({ source: sourceId, id: hoveredFeatureId }, { hover: true });
  }
});

map.on("mouseleave", layerId, () => {
  if (hoveredFeatureId !== null) {
    map.setFeatureState({ source: sourceId, id: hoveredFeatureId }, { hover: false });
    hoveredFeatureId = null;
  }
});
```

## Display Format

When showing segment info in a tooltip/popover:
- Distance: format as km (if >= 1000m) or meters
- Duration: format as minutes (if >= 60s) or seconds
- Delta: show with +/- prefix and color coding (green = faster/shorter, red = slower/longer)

## Rules

- **Never compute delta on the fly from geometry** — always use precomputed `NormalizedSummary` metrics.
- **Identify segments by feature properties only** — never by coordinate lookup or spatial query.
- **Use `feature-state` for hover** — the base layer paint already references `["feature-state", "hover"]` (see mapbox-layer-compose skill).
- **Types come from `packages/map/src/normalize.ts`** — use `SegmentProperties`, `NormalizedSummary`.
- **Segment tooltip must show**: segment name, distance, duration, and delta vs selected alternative.

# Skill: place-geojson

## Purpose

Create GeoJSON Point features for places that conform to the project's mandatory schema, and configure clustered Mapbox sources and layers for rendering them.

## When to Use

Use this skill whenever:
- Converting `Place` domain objects into GeoJSON features for map rendering
- Setting up the places source with clustering enabled
- Adding or modifying place marker layers (clusters, counts, unclustered points)

## Place Feature Schema (Mandatory)

Every place must be represented as a GeoJSON Feature with this exact shape:

```ts
{
  type: "Feature",
  geometry: { type: "Point", coordinates: [lon, lat] },
  properties: {
    id: string,          // Place UUID from domain model
    name: string,
    category: string,
    dayIndex?: number    // which day this place belongs to
  }
}
```

## Converting Domain Places to GeoJSON

```ts
import { Place } from "@trip-planner/core";
import { createPoint, createFeature, createFeatureCollection } from "./geojson";

interface PlaceFeatureProperties {
  id: string;
  name: string;
  category: string;
  dayIndex?: number;
}

function placeToFeature(place: Place, dayIndex?: number): GeoJSONFeature<GeoJSONPoint> {
  const props: PlaceFeatureProperties = {
    id: place.id,
    name: place.name,
    category: place.category ?? "default",
    dayIndex,
  };
  return createFeature(
    createPoint(place.lng, place.lat),
    props as unknown as Record<string, unknown>,
    place.id
  );
}

function placesToFeatureCollection(
  places: Place[],
  dayIndex?: number
): GeoJSONFeatureCollection {
  return createFeatureCollection(
    places.map((p) => placeToFeature(p, dayIndex) as unknown as GeoJSONFeature)
  );
}
```

## Clustered Source Configuration

```ts
const placesSource = {
  id: "places",
  type: "geojson" as const,
  data: { type: "FeatureCollection", features: [] },
  cluster: true,
  clusterMaxZoom: 14,
  clusterRadius: 50,
};
```

## Place Layers

### 1. Cluster Circle Layer

```ts
{
  id: "places-cluster",
  type: "circle",
  source: "places",
  filter: ["has", "point_count"],
  paint: {
    "circle-color": [
      "step", ["get", "point_count"],
      "#51bbd6",   // < 10
      10, "#f1f075", // 10-29
      30, "#f28cb1"  // 30+
    ],
    "circle-radius": [
      "step", ["get", "point_count"],
      20,          // < 10
      10, 30,      // 10-29
      30, 40       // 30+
    ],
  },
}
```

### 2. Cluster Count Layer

```ts
{
  id: "places-cluster-count",
  type: "symbol",
  source: "places",
  filter: ["has", "point_count"],
  layout: {
    "text-field": ["get", "point_count_abbreviated"],
    "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
    "text-size": 12,
  },
}
```

### 3. Unclustered Point Layer

```ts
{
  id: "places-unclustered",
  type: "symbol",
  source: "places",
  filter: ["!", ["has", "point_count"]],
  layout: {
    "icon-image": "marker-15",   // or custom sprite
    "icon-size": 1.5,
    "text-field": ["get", "name"],
    "text-offset": [0, 1.2],
    "text-anchor": "top",
    "text-size": 11,
  },
  paint: {
    "text-color": "#333",
    "text-halo-color": "#fff",
    "text-halo-width": 1,
  },
}
```

## Filtering by Day

To show only places for a specific day, apply a filter:

```ts
map.setFilter("places-unclustered", ["==", ["get", "dayIndex"], selectedDayIndex]);
```

Or update the source data to only include that day's places.

## Rules

- **Coordinate order is `[lon, lat]`** — `place.lng` first, `place.lat` second.
- **Use `createPoint()` and `createFeature()` from `packages/map/src/geojson.ts`** — never construct GeoJSON objects manually.
- **Feature ID must be the Place UUID** — enables `feature-state` lookups.
- **Category defaults to `"default"`** if the Place has no category.
- **Never mix days in a single source without `dayIndex`** property and a filter.
- **Domain types come from `packages/core/src/types.ts`** — never define parallel Place types.

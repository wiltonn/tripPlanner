import mapboxgl from "mapbox-gl";
import type { Map as MapboxMap } from "mapbox-gl";
import type { GeoJSONFeatureCollection } from "@trip-planner/map";

export function addPlacesSource(
  map: MapboxMap,
  placesFC: GeoJSONFeatureCollection
): void {
  map.addSource("places", {
    type: "geojson",
    data: placesFC as unknown as GeoJSON.FeatureCollection,
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 50,
  });
}

export function addRouteDaySources(
  map: MapboxMap,
  daySegments: GeoJSONFeatureCollection[]
): void {
  for (let i = 0; i < daySegments.length; i++) {
    map.addSource(`route-day-${i}`, {
      type: "geojson",
      data: daySegments[i] as unknown as GeoJSON.FeatureCollection,
      promoteId: "id",
    });
  }
}

const EMPTY_FC: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

export function addIsochroneSource(map: MapboxMap): void {
  map.addSource("isochrone", {
    type: "geojson",
    data: EMPTY_FC,
  });
}

export function updateIsochroneSource(
  map: MapboxMap,
  fc: GeoJSONFeatureCollection | null
): void {
  const source = map.getSource("isochrone") as mapboxgl.GeoJSONSource | undefined;
  if (!source) return;
  source.setData(
    fc ? (fc as unknown as GeoJSON.FeatureCollection) : EMPTY_FC
  );
}

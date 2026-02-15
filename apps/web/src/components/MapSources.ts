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

import mapboxgl from "mapbox-gl";
import type { Map as MapboxMap, FilterSpecification } from "mapbox-gl";
import { PLACE_MARKER_COLOR } from "@trip-planner/map";

const DAY_COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"];

function dayColor(dayIndex: number): string {
  return DAY_COLORS[dayIndex % DAY_COLORS.length];
}

function altFilter(selectedAltId: number, match: boolean): FilterSpecification {
  return (match
    ? ["==", ["get", "altId"], selectedAltId]
    : ["!=", ["get", "altId"], selectedAltId]) as FilterSpecification;
}

// ---------------------------------------------------------------------------
// Route layers (per day) — 4 layers each: other, outline, base, active
// ---------------------------------------------------------------------------

export function addRouteLayers(
  map: MapboxMap,
  dayCount: number,
  activeDayIndex: number,
  selectedAltIndex: Record<number, number> = {}
): void {
  for (let i = 0; i < dayCount; i++) {
    const isActive = i === activeDayIndex;
    const color = dayColor(i);
    const source = `route-day-${i}`;
    const selAlt = selectedAltIndex[i] ?? 0;

    // Other layer — dimmed non-selected alternatives
    map.addLayer({
      id: `route-day-${i}-other`,
      type: "line",
      source,
      filter: altFilter(selAlt, false),
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": color,
        "line-width": 4,
        "line-opacity": isActive ? 0.2 : 0,
        "line-dasharray": [2, 2],
      },
    });

    // Outline layer (wider, darker) — selected alt only
    map.addLayer({
      id: `route-day-${i}-outline`,
      type: "line",
      source,
      filter: altFilter(selAlt, true),
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#1e3a5f",
        "line-width": isActive ? 10 : 5,
        "line-opacity": isActive ? 0.4 : 0.1,
      },
    });

    // Base layer — selected alt only
    map.addLayer({
      id: `route-day-${i}-base`,
      type: "line",
      source,
      filter: altFilter(selAlt, true),
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": color,
        "line-width": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          isActive ? 9 : 6,
          ["boolean", ["feature-state", "hover"], false],
          isActive ? 8 : 5,
          isActive ? 6 : 3,
        ],
        "line-opacity": isActive ? 1 : 0.3,
      },
    });

    // Active highlight layer (hover glow) — selected alt only
    map.addLayer({
      id: `route-day-${i}-active`,
      type: "line",
      source,
      filter: altFilter(selAlt, true),
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          "#fbbf24",
          "#ffffff",
        ],
        "line-width": 2,
        "line-opacity": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          isActive ? 0.8 : 0,
          ["boolean", ["feature-state", "hover"], false],
          isActive ? 0.6 : 0,
          0,
        ],
        "line-gap-width": isActive ? 6 : 3,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Place layers (clustered)
// ---------------------------------------------------------------------------

export function addPlaceLayers(map: MapboxMap): void {
  // Cluster circles
  map.addLayer({
    id: "clusters",
    type: "circle",
    source: "places",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": [
        "step",
        ["get", "point_count"],
        "#51bbd6",
        5,
        "#f1f075",
        10,
        "#f28cb1",
      ],
      "circle-radius": ["step", ["get", "point_count"], 18, 5, 24, 10, 30],
      "circle-stroke-width": 2,
      "circle-stroke-color": "#fff",
    },
  });

  // Cluster count labels
  map.addLayer({
    id: "cluster-count",
    type: "symbol",
    source: "places",
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-size": 13,
    },
    paint: {
      "text-color": "#333",
    },
  });

  // Unclustered place points
  map.addLayer({
    id: "unclustered-point",
    type: "circle",
    source: "places",
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": PLACE_MARKER_COLOR,
      "circle-radius": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        10,
        7,
      ],
      "circle-stroke-width": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        3,
        2,
      ],
      "circle-stroke-color": "#fff",
    },
  });
}

// ---------------------------------------------------------------------------
// Isochrone layers
// ---------------------------------------------------------------------------

export function addIsochroneLayers(map: MapboxMap): void {
  // Fill layer — opacity decreases with contour size
  map.addLayer({
    id: "isochrone-fill",
    type: "fill",
    source: "isochrone",
    paint: {
      "fill-color": ["get", "color"],
      "fill-opacity": [
        "interpolate",
        ["linear"],
        ["get", "minutes"],
        15, 0.25,
        30, 0.15,
        60, 0.08,
      ],
    },
  });

  // Outline layer — dashed ring borders
  map.addLayer({
    id: "isochrone-outline",
    type: "line",
    source: "isochrone",
    paint: {
      "line-color": ["get", "color"],
      "line-width": 1.5,
      "line-opacity": 0.6,
      "line-dasharray": [3, 2],
    },
  });
}

export function removeIsochroneData(map: MapboxMap): void {
  const source = map.getSource("isochrone") as mapboxgl.GeoJSONSource | undefined;
  if (!source) return;
  source.setData({ type: "FeatureCollection", features: [] });
}

// ---------------------------------------------------------------------------
// Update selected alternative filters
// ---------------------------------------------------------------------------

export function updateSelectedAlt(
  map: MapboxMap,
  dayCount: number,
  selectedAltIndex: Record<number, number>
): void {
  for (let i = 0; i < dayCount; i++) {
    const selAlt = selectedAltIndex[i] ?? 0;
    const matchFilter = altFilter(selAlt, true);
    const noMatchFilter = altFilter(selAlt, false);

    map.setFilter(`route-day-${i}-other`, noMatchFilter);
    map.setFilter(`route-day-${i}-outline`, matchFilter);
    map.setFilter(`route-day-${i}-base`, matchFilter);
    map.setFilter(`route-day-${i}-active`, matchFilter);
  }
}

// ---------------------------------------------------------------------------
// Update active day paint properties
// ---------------------------------------------------------------------------

export function updateActiveDayPaint(
  map: MapboxMap,
  dayCount: number,
  activeDayIndex: number
): void {
  for (let i = 0; i < dayCount; i++) {
    const isActive = i === activeDayIndex;

    // Other layer — only visible for active day
    map.setPaintProperty(`route-day-${i}-other`, "line-opacity", isActive ? 0.2 : 0);

    map.setPaintProperty(`route-day-${i}-outline`, "line-width", isActive ? 10 : 5);
    map.setPaintProperty(`route-day-${i}-outline`, "line-opacity", isActive ? 0.4 : 0.1);

    map.setPaintProperty(`route-day-${i}-base`, "line-width", [
      "case",
      ["boolean", ["feature-state", "selected"], false],
      isActive ? 9 : 6,
      ["boolean", ["feature-state", "hover"], false],
      isActive ? 8 : 5,
      isActive ? 6 : 3,
    ]);
    map.setPaintProperty(`route-day-${i}-base`, "line-opacity", isActive ? 1 : 0.3);

    map.setPaintProperty(`route-day-${i}-active`, "line-color", [
      "case",
      ["boolean", ["feature-state", "selected"], false],
      "#fbbf24",
      "#ffffff",
    ]);
    map.setPaintProperty(`route-day-${i}-active`, "line-opacity", [
      "case",
      ["boolean", ["feature-state", "selected"], false],
      isActive ? 0.8 : 0,
      ["boolean", ["feature-state", "hover"], false],
      isActive ? 0.6 : 0,
      0,
    ]);
    map.setPaintProperty(`route-day-${i}-active`, "line-gap-width", isActive ? 6 : 3);
  }
}

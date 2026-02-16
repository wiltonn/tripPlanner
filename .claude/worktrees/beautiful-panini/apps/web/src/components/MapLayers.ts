import mapboxgl from "mapbox-gl";
import type { Map as MapboxMap, FilterSpecification } from "mapbox-gl";

export const DAY_COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"];
const UNASSIGNED_COLOR = "#9ca3af";

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
// Numbered pin image generation
// ---------------------------------------------------------------------------

const PIN_SIZE = 36;
const MAX_PINS = 20;

interface PinImageData {
  width: number;
  height: number;
  data: Uint8Array;
}

function renderPinImage(
  label: string,
  fillColor: string
): PinImageData {
  const size = PIN_SIZE;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;

  // White border ring
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();

  // Colored fill
  ctx.beginPath();
  ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
  ctx.fillStyle = fillColor;
  ctx.fill();

  // Label text
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${label.length > 1 ? 12 : 14}px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, cx, cy + 1);

  const imgData = ctx.getImageData(0, 0, size, size);
  return { width: size, height: size, data: new Uint8Array(imgData.data.buffer) };
}

export function generatePinImages(map: MapboxMap, dayCount: number): void {
  for (let d = 0; d < dayCount; d++) {
    const color = dayColor(d);
    for (let n = 1; n <= MAX_PINS; n++) {
      const id = `pin-day-${d}-${n}`;
      if (map.hasImage(id)) continue;
      map.addImage(id, renderPinImage(String(n), color));
    }
  }
  // Unassigned pin with "?"
  if (!map.hasImage("pin-unassigned")) {
    map.addImage("pin-unassigned", renderPinImage("?", UNASSIGNED_COLOR));
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

  // Unclustered place pins — symbol layer with numbered icons
  map.addLayer({
    id: "unclustered-point",
    type: "symbol",
    source: "places",
    filter: ["!", ["has", "point_count"]],
    layout: {
      "icon-image": [
        "case",
        ["==", ["get", "dayIndex"], -1],
        "pin-unassigned",
        ["concat", "pin-day-", ["to-string", ["get", "dayIndex"]], "-", ["to-string", ["get", "sortOrder"]]],
      ] as unknown as string,
      "icon-size": 1,
      "icon-allow-overlap": true,
      "icon-anchor": "center",
      "text-field": ["get", "activityName"],
      "text-size": 11,
      "text-offset": [0, 1.5],
      "text-anchor": "top",
      "text-optional": true,
      "text-max-width": 10,
    },
    paint: {
      "text-color": "#333",
      "text-halo-color": "#fff",
      "text-halo-width": 1.5,
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

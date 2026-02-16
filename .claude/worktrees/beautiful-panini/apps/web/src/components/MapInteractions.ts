import mapboxgl from "mapbox-gl";
import type { NormalizedSummary } from "@trip-planner/map";

export interface PlaceClickData {
  id: string;
  name: string;
  category: string;
  dayIndex?: number;
}

interface HoverState {
  source: string;
  id: string | number;
}

let hoveredSegment: HoverState | null = null;
let selectedSegment: HoverState | null = null;
let activePopup: mapboxgl.Popup | null = null;

function formatDistance(meters: number): string {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(1)} km`
    : `${Math.round(meters)} m`;
}

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`;
}

export function setupInteractions(
  map: mapboxgl.Map,
  dayCount: number,
  onPlaceClick: (data: PlaceClickData) => void,
  daySummaries: NormalizedSummary[][] = [],
  onIsochroneRequest?: (coordinates: [number, number]) => void,
  onIsochroneClear?: () => void,
  onMapClickCoords?: (coordinates: [number, number]) => void
): () => void {
  const cleanups: Array<() => void> = [];

  // --- Cluster click: zoom to expansion ---
  const onClusterClick = (e: mapboxgl.MapMouseEvent) => {
    const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
    if (!features.length) return;
    const clusterId = features[0].properties?.cluster_id;
    const source = map.getSource("places") as mapboxgl.GeoJSONSource;
    source.getClusterExpansionZoom(clusterId, (err, zoom) => {
      if (err || zoom == null) return;
      map.easeTo({
        center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number],
        zoom,
      });
    });
  };
  map.on("click", "clusters", onClusterClick);
  cleanups.push(() => map.off("click", "clusters", onClusterClick));

  // --- Unclustered place click ---
  const onPointClick = (e: mapboxgl.MapMouseEvent) => {
    const features = map.queryRenderedFeatures(e.point, { layers: ["unclustered-point"] });
    if (!features.length) return;
    const feat = features[0];
    const props = feat.properties;
    if (!props) return;
    onPlaceClick({
      id: props.id as string,
      name: props.name as string,
      category: props.category as string,
      dayIndex: props.dayIndex as number | undefined,
    });
    // Fire isochrone request with place coordinates
    if (onIsochroneRequest && feat.geometry.type === "Point") {
      const coords = (feat.geometry as GeoJSON.Point).coordinates as [number, number];
      onIsochroneRequest(coords);
    }
  };
  map.on("click", "unclustered-point", onPointClick);
  cleanups.push(() => map.off("click", "unclustered-point", onPointClick));

  // --- Route segment layers ---
  const segmentBaseLayers: string[] = [];
  for (let i = 0; i < dayCount; i++) {
    segmentBaseLayers.push(`route-day-${i}-base`);
  }

  // --- Segment hover ---
  const onSegmentMouseMove = (e: mapboxgl.MapMouseEvent) => {
    const features = map.queryRenderedFeatures(e.point, { layers: segmentBaseLayers });

    // Clear previous hover
    if (hoveredSegment) {
      map.setFeatureState(
        { source: hoveredSegment.source, id: hoveredSegment.id },
        { hover: false }
      );
      hoveredSegment = null;
    }

    if (!features.length) {
      map.getCanvas().style.cursor = "";
      return;
    }

    const feat = features[0];
    const source = feat.source;
    const id = feat.id;
    if (!source || id == null) return;

    map.getCanvas().style.cursor = "pointer";
    map.setFeatureState({ source, id }, { hover: true });
    hoveredSegment = { source, id };
  };
  map.on("mousemove", onSegmentMouseMove);
  cleanups.push(() => map.off("mousemove", onSegmentMouseMove));

  // --- Helper: clear selection ---
  function clearSelection() {
    if (selectedSegment) {
      map.setFeatureState(
        { source: selectedSegment.source, id: selectedSegment.id },
        { selected: false }
      );
      selectedSegment = null;
    }
    if (activePopup) {
      activePopup.remove();
      activePopup = null;
    }
  }

  // --- Helper: compute ETA delta HTML ---
  function buildEtaDeltaHtml(dayIndex: number, altTotalDuration: number): string {
    const summaries = daySummaries[dayIndex];
    if (!summaries || summaries.length < 2) return "";

    const fastest = Math.min(...summaries.map((s) => s.totalDuration));
    const delta = altTotalDuration - fastest;

    if (delta <= 0) {
      return `<div class="segment-tooltip-eta"><span class="segment-tooltip-fastest">Fastest route</span></div>`;
    }

    return `<div class="segment-tooltip-eta"><span class="segment-tooltip-delta">+${formatDuration(delta)} vs fastest</span></div>`;
  }

  // --- Segment click: persistent popup ---
  const onSegmentClick = (e: mapboxgl.MapMouseEvent) => {
    const features = map.queryRenderedFeatures(e.point, { layers: segmentBaseLayers });
    if (!features.length) return;

    // Prevent map click-away from firing on the same event
    e.originalEvent.stopPropagation();

    const feat = features[0];
    const props = feat.properties;
    if (!props) return;

    // Clear previous selection
    clearSelection();

    // Set new selection
    const source = feat.source;
    const id = feat.id;
    if (source && id != null) {
      map.setFeatureState({ source, id }, { selected: true });
      selectedSegment = { source, id };
    }

    const distance = formatDistance(props.distance as number);
    const duration = formatDuration(props.duration as number);
    const name = (props.name as string) || "Route segment";

    const cumDist = formatDistance(props.cumulativeDistance as number);
    const cumDur = formatDuration(props.cumulativeDuration as number);
    const remainDist = formatDistance((props.altTotalDistance as number) - (props.cumulativeDistance as number));
    const remainDur = formatDuration((props.altTotalDuration as number) - (props.cumulativeDuration as number));

    const etaDelta = buildEtaDeltaHtml(props.dayIndex as number, props.altTotalDuration as number);

    activePopup = new mapboxgl.Popup({ closeOnClick: false, maxWidth: "280px" })
      .setLngLat(e.lngLat)
      .setHTML(
        `<div class="segment-tooltip">
          <strong>${name}</strong>
          <div class="segment-tooltip-stats">
            <span>${distance}</span>
            <span>${duration}</span>
          </div>
          <div class="segment-tooltip-progress">
            <span>Elapsed: ${cumDur} (${cumDist})</span>
            <span>Remaining: ${remainDur} (${remainDist})</span>
          </div>
          ${etaDelta}
          <div class="segment-tooltip-meta">Day ${(props.dayIndex as number) + 1} &middot; Leg ${(props.legIndex as number) + 1}</div>
        </div>`
      )
      .addTo(map);

    // When popup is closed via its X button, clear selection
    activePopup.on("close", () => {
      if (selectedSegment) {
        map.setFeatureState(
          { source: selectedSegment.source, id: selectedSegment.id },
          { selected: false }
        );
        selectedSegment = null;
      }
      activePopup = null;
    });
  };
  for (const layer of segmentBaseLayers) {
    map.on("click", layer, onSegmentClick);
    cleanups.push(() => map.off("click", layer, onSegmentClick));
  }

  // --- Click on empty space: dismiss selection + clear isochrone + emit coords ---
  const onMapClick = (e: mapboxgl.MapMouseEvent) => {
    clearSelection();
    onIsochroneClear?.();
    // If no feature was hit, emit coordinates for "add activity" mode
    const features = map.queryRenderedFeatures(e.point, {
      layers: [...segmentBaseLayers, "clusters", "unclustered-point"],
    });
    if (features.length === 0 && onMapClickCoords) {
      onMapClickCoords([e.lngLat.lng, e.lngLat.lat]);
    }
  };
  map.on("click", onMapClick);
  cleanups.push(() => map.off("click", onMapClick));

  // --- Cursor changes for clusters/places ---
  const setCursor = () => { map.getCanvas().style.cursor = "pointer"; };
  const resetCursor = () => { map.getCanvas().style.cursor = ""; };
  for (const layer of ["clusters", "unclustered-point"]) {
    map.on("mouseenter", layer, setCursor);
    map.on("mouseleave", layer, resetCursor);
    cleanups.push(() => {
      map.off("mouseenter", layer, setCursor);
      map.off("mouseleave", layer, resetCursor);
    });
  }

  return () => {
    clearSelection();
    for (const fn of cleanups) fn();
  };
}

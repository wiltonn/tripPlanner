"use client";

import { useRef, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { DEFAULT_MAP_STYLE, DEFAULT_CENTER, DEFAULT_ZOOM } from "@trip-planner/map";
import type { GeoJSONFeatureCollection, BBox, NormalizedSummary } from "@trip-planner/map";
import { addPlacesSource, addRouteDaySources } from "./MapSources";
import { addRouteLayers, addPlaceLayers, updateActiveDayPaint, updateSelectedAlt } from "./MapLayers";
import { setupInteractions, type PlaceClickData } from "./MapInteractions";

interface MapProps {
  placesFC: GeoJSONFeatureCollection;
  daySegments: GeoJSONFeatureCollection[];
  dayBBoxes: BBox[];
  daySummaries: NormalizedSummary[][];
  activeDayIndex: number;
  selectedAltIndex: Record<number, number>;
  onPlaceClick: (data: PlaceClickData) => void;
}

export default function Map({
  placesFC,
  daySegments,
  dayBBoxes,
  daySummaries,
  activeDayIndex,
  selectedAltIndex,
  onPlaceClick,
}: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const readyRef = useRef(false);
  const cleanupInteractionsRef = useRef<(() => void) | null>(null);

  // Stable callback ref to avoid re-wiring interactions
  const onPlaceClickRef = useRef(onPlaceClick);
  onPlaceClickRef.current = onPlaceClick;

  const activeDayRef = useRef(activeDayIndex);
  activeDayRef.current = activeDayIndex;

  const selectedAltRef = useRef(selectedAltIndex);
  selectedAltRef.current = selectedAltIndex;

  const daySummariesRef = useRef(daySummaries);
  daySummariesRef.current = daySummaries;

  // Initialize map once
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: DEFAULT_MAP_STYLE,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.on("load", () => {
      // Add sources
      addRouteDaySources(map, daySegments);
      addPlacesSource(map, placesFC);

      // Add layers (route layers first, then places on top)
      addRouteLayers(map, daySegments.length, activeDayRef.current, selectedAltRef.current);
      addPlaceLayers(map);

      // Setup interactions
      cleanupInteractionsRef.current = setupInteractions(
        map,
        daySegments.length,
        (data) => onPlaceClickRef.current(data),
        daySummariesRef.current
      );

      // Fit to active day bbox
      const bbox = dayBBoxes[activeDayRef.current];
      if (bbox) {
        map.fitBounds(
          [
            [bbox[0], bbox[1]],
            [bbox[2], bbox[3]],
          ],
          { padding: 60, duration: 0 }
        );
      }

      readyRef.current = true;
    });

    mapRef.current = map;

    return () => {
      cleanupInteractionsRef.current?.();
      cleanupInteractionsRef.current = null;
      readyRef.current = false;
      map.remove();
      mapRef.current = null;
    };
    // Only run once on mount — sources/layers are static mock data
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update paint when active day changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;

    updateActiveDayPaint(map, daySegments.length, activeDayIndex);

    // Fly to active day bbox
    const bbox = dayBBoxes[activeDayIndex];
    if (bbox) {
      map.fitBounds(
        [
          [bbox[0], bbox[1]],
          [bbox[2], bbox[3]],
        ],
        { padding: 60, duration: 800 }
      );
    }
  }, [activeDayIndex, daySegments.length, dayBBoxes]);

  // Update alt filters when selection changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;

    updateSelectedAlt(map, daySegments.length, selectedAltIndex);
  }, [selectedAltIndex, daySegments.length]);

  return <div id="map" ref={containerRef} />;
}

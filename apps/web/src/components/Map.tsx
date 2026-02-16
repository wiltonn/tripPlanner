"use client";

import { useRef, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { DEFAULT_MAP_STYLE, DEFAULT_CENTER, DEFAULT_ZOOM } from "@trip-planner/map";
import type { GeoJSONFeatureCollection, BBox, NormalizedSummary } from "@trip-planner/map";
import { addPlacesSource, addRouteDaySources, addIsochroneSource, updateIsochroneSource, updatePlacesSource } from "./MapSources";
import { addRouteLayers, addPlaceLayers, addIsochroneLayers, updateActiveDayPaint, updateSelectedAlt, generatePinImages, DAY_COLORS } from "./MapLayers";
import { setupInteractions, type PlaceClickData } from "./MapInteractions";

import type { MapFocus } from "@trip-planner/core";

interface MapProps {
  placesFC: GeoJSONFeatureCollection;
  daySegments: GeoJSONFeatureCollection[];
  dayBBoxes: BBox[];
  daySummaries: NormalizedSummary[][];
  activeDayIndex: number;
  selectedAltIndex: Record<number, number>;
  onPlaceClick: (data: PlaceClickData) => void;
  isochroneFC: GeoJSONFeatureCollection | null;
  onIsochroneRequest?: (coordinates: [number, number]) => void;
  onIsochroneClear?: () => void;
  mapFocus?: MapFocus | null;
  onMapClickCoords?: (coordinates: [number, number]) => void;
}

export default function Map({
  placesFC,
  daySegments,
  dayBBoxes,
  daySummaries,
  activeDayIndex,
  selectedAltIndex,
  onPlaceClick,
  isochroneFC,
  onIsochroneRequest,
  onIsochroneClear,
  mapFocus,
  onMapClickCoords,
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

  const onIsochroneRequestRef = useRef(onIsochroneRequest);
  onIsochroneRequestRef.current = onIsochroneRequest;

  const onIsochroneClearRef = useRef(onIsochroneClear);
  onIsochroneClearRef.current = onIsochroneClear;

  const onMapClickCoordsRef = useRef(onMapClickCoords);
  onMapClickCoordsRef.current = onMapClickCoords;

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
      addIsochroneSource(map);
      addRouteDaySources(map, daySegments);
      addPlacesSource(map, placesFC);

      // Add layers (isochrone first so routes draw on top)
      addIsochroneLayers(map);
      addRouteLayers(map, daySegments.length, activeDayRef.current, selectedAltRef.current);
      generatePinImages(map, DAY_COLORS.length);
      addPlaceLayers(map);

      // Setup interactions
      cleanupInteractionsRef.current = setupInteractions(
        map,
        daySegments.length,
        (data) => onPlaceClickRef.current(data),
        daySummariesRef.current,
        (coords) => onIsochroneRequestRef.current?.(coords),
        () => onIsochroneClearRef.current?.(),
        (coords) => onMapClickCoordsRef.current?.(coords)
      );

      // Fit to active day bbox, or derive bounds from places
      const bbox = dayBBoxes[activeDayRef.current];
      if (bbox) {
        map.fitBounds(
          [
            [bbox[0], bbox[1]],
            [bbox[2], bbox[3]],
          ],
          { padding: 60, duration: 0 }
        );
      } else if (placesFC.features.length > 0) {
        const coords = placesFC.features
          .map((f) => (f.geometry as GeoJSON.Point).coordinates as [number, number])
          .filter((c) => c[0] !== 0 && c[1] !== 0);
        if (coords.length > 0) {
          const lngs = coords.map((c) => c[0]);
          const lats = coords.map((c) => c[1]);
          map.fitBounds(
            [
              [Math.min(...lngs), Math.min(...lats)],
              [Math.max(...lngs), Math.max(...lats)],
            ],
            { padding: 80, duration: 0, maxZoom: 14 }
          );
        }
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

  // Update isochrone source when FC changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;

    updateIsochroneSource(map, isochroneFC);
  }, [isochroneFC]);

  // Update places source when activities change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;

    updatePlacesSource(map, placesFC);
  }, [placesFC]);

  // Fly to mapFocus target when overlay item is clicked
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current || !mapFocus) return;

    if (mapFocus.bbox) {
      map.fitBounds(
        [
          [mapFocus.bbox[0], mapFocus.bbox[1]],
          [mapFocus.bbox[2], mapFocus.bbox[3]],
        ],
        { padding: 60, duration: 800 }
      );
    } else if (mapFocus.coordinates) {
      map.flyTo({
        center: mapFocus.coordinates,
        zoom: 14,
        duration: 800,
      });
    }
  }, [mapFocus]);

  return <div id="map" ref={containerRef} />;
}

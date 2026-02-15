import React, { useRef, useCallback } from "react";
import { StyleSheet } from "react-native";
import Mapbox, {
  MapView,
  Camera,
  ShapeSource,
  LineLayer,
  CircleLayer,
  SymbolLayer,
} from "@rnmapbox/maps";
import { DEFAULT_MAP_STYLE, DEFAULT_CENTER, DEFAULT_ZOOM } from "@trip-planner/map";
import type { GeoJSONFeatureCollection, BBox } from "@trip-planner/map";
import { dayColor, PLACE_MARKER_COLOR, ROUTE_OUTLINE_COLOR, SELECTED_GLOW_COLOR } from "../theme/colors";

// Metro injects process.env at build time for EXPO_PUBLIC_ prefixed vars
declare const process: { env: Record<string, string | undefined> };

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? "");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Matches @rnmapbox/maps OnPressEvent (not exported from main entry) */
interface OnPressEvent {
  features: GeoJSON.Feature[];
  coordinates: { latitude: number; longitude: number };
  point: { x: number; y: number };
}

export interface PlaceClickData {
  id: string;
  name: string;
  category: string;
  dayIndex?: number;
}

export interface SegmentClickData {
  id: string;
  name: string;
  dayIndex: number;
  altId: number;
  legIndex: number;
  stepIndex: number;
  distance: number;
  duration: number;
  cumulativeDistance: number;
  cumulativeDuration: number;
  altTotalDistance: number;
  altTotalDuration: number;
  coordinate: [number, number];
}

interface TripMapProps {
  placesFC: GeoJSONFeatureCollection;
  daySegments: GeoJSONFeatureCollection[];
  dayBBoxes: BBox[];
  activeDayIndex: number;
  selectedAltIndex: Record<number, number>;
  onPlacePress: (data: PlaceClickData) => void;
  onSegmentPress: (data: SegmentClickData) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Filter a FeatureCollection to only features matching (or not matching) an altId */
function filterByAlt(
  fc: GeoJSONFeatureCollection,
  altId: number,
  match: boolean,
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: (fc.features as unknown as GeoJSON.Feature[]).filter((f) => {
      const fAlt = f.properties?.altId as number;
      return match ? fAlt === altId : fAlt !== altId;
    }),
  };
}

// ---------------------------------------------------------------------------
// Route Layers for a single day
// ---------------------------------------------------------------------------

interface DayRouteLayersProps {
  dayIndex: number;
  segments: GeoJSONFeatureCollection;
  isActive: boolean;
  selectedAlt: number;
  onSegmentPress: (data: SegmentClickData) => void;
}

function DayRouteLayers({
  dayIndex,
  segments,
  isActive,
  selectedAlt,
  onSegmentPress,
}: DayRouteLayersProps) {
  const color = dayColor(dayIndex);
  const otherData = filterByAlt(segments, selectedAlt, false);
  const selectedData = filterByAlt(segments, selectedAlt, true);

  const handlePress = useCallback(
    (e: OnPressEvent) => {
      const feat = e.features?.[0];
      if (!feat?.properties) return;
      const p = feat.properties;
      onSegmentPress({
        id: p.id as string,
        name: (p.name as string) || "Route segment",
        dayIndex: p.dayIndex as number,
        altId: p.altId as number,
        legIndex: p.legIndex as number,
        stepIndex: p.stepIndex as number,
        distance: p.distance as number,
        duration: p.duration as number,
        cumulativeDistance: p.cumulativeDistance as number,
        cumulativeDuration: p.cumulativeDuration as number,
        altTotalDistance: p.altTotalDistance as number,
        altTotalDuration: p.altTotalDuration as number,
        coordinate: [
          e.coordinates.longitude,
          e.coordinates.latitude,
        ],
      });
    },
    [onSegmentPress],
  );

  return (
    <>
      {/* Other (non-selected) alternatives — dimmed, dashed */}
      <ShapeSource id={`route-day-${dayIndex}-other`} shape={otherData}>
        <LineLayer
          id={`route-day-${dayIndex}-other-line`}
          style={{
            lineColor: color,
            lineWidth: 4,
            lineOpacity: isActive ? 0.2 : 0,
            lineDasharray: [2, 2],
            lineJoin: "round",
            lineCap: "round",
          }}
        />
      </ShapeSource>

      {/* Selected alternative — outline + base + glow */}
      <ShapeSource
        id={`route-day-${dayIndex}-selected`}
        shape={selectedData}
        onPress={isActive ? handlePress : undefined}
      >
        <LineLayer
          id={`route-day-${dayIndex}-outline`}
          style={{
            lineColor: ROUTE_OUTLINE_COLOR,
            lineWidth: isActive ? 10 : 5,
            lineOpacity: isActive ? 0.4 : 0.1,
            lineJoin: "round",
            lineCap: "round",
          }}
        />
        <LineLayer
          id={`route-day-${dayIndex}-base`}
          style={{
            lineColor: color,
            lineWidth: isActive ? 6 : 3,
            lineOpacity: isActive ? 1 : 0.3,
            lineJoin: "round",
            lineCap: "round",
          }}
          aboveLayerID={`route-day-${dayIndex}-outline`}
        />
        <LineLayer
          id={`route-day-${dayIndex}-active`}
          style={{
            lineColor: SELECTED_GLOW_COLOR,
            lineWidth: 2,
            lineOpacity: isActive ? 0.6 : 0,
            lineGapWidth: isActive ? 6 : 3,
            lineJoin: "round",
            lineCap: "round",
          }}
          aboveLayerID={`route-day-${dayIndex}-base`}
        />
      </ShapeSource>
    </>
  );
}

// ---------------------------------------------------------------------------
// Place Layers
// ---------------------------------------------------------------------------

interface PlaceLayersProps {
  placesFC: GeoJSONFeatureCollection;
  onPlacePress: (data: PlaceClickData) => void;
}

function PlaceLayers({ placesFC, onPlacePress }: PlaceLayersProps) {
  const handlePress = useCallback(
    (e: OnPressEvent) => {
      const feat = e.features?.[0];
      if (!feat?.properties) return;
      const p = feat.properties;
      onPlacePress({
        id: p.id as string,
        name: p.name as string,
        category: p.category as string,
        dayIndex: p.dayIndex as number | undefined,
      });
    },
    [onPlacePress],
  );

  return (
    <ShapeSource
      id="places"
      shape={placesFC as unknown as GeoJSON.FeatureCollection}
      cluster
      clusterMaxZoomLevel={14}
      clusterRadius={50}
      onPress={handlePress}
    >
      <CircleLayer
        id="clusters"
        filter={["has", "point_count"]}
        style={{
          circleColor: [
            "step",
            ["get", "point_count"],
            "#51bbd6",
            5,
            "#f1f075",
            10,
            "#f28cb1",
          ],
          circleRadius: ["step", ["get", "point_count"], 18, 5, 24, 10, 30],
          circleStrokeWidth: 2,
          circleStrokeColor: "#fff",
        }}
      />
      <SymbolLayer
        id="cluster-count"
        filter={["has", "point_count"]}
        style={{
          textField: ["get", "point_count_abbreviated"],
          textSize: 13,
          textColor: "#333",
        }}
      />
      <CircleLayer
        id="unclustered-point"
        filter={["!", ["has", "point_count"]]}
        style={{
          circleColor: PLACE_MARKER_COLOR,
          circleRadius: 7,
          circleStrokeWidth: 2,
          circleStrokeColor: "#fff",
        }}
      />
    </ShapeSource>
  );
}

// ---------------------------------------------------------------------------
// Main TripMap
// ---------------------------------------------------------------------------

export default function TripMap({
  placesFC,
  daySegments,
  dayBBoxes,
  activeDayIndex,
  selectedAltIndex,
  onPlacePress,
  onSegmentPress,
}: TripMapProps) {
  const cameraRef = useRef<Camera>(null);

  const activeBBox = dayBBoxes[activeDayIndex];
  const bounds = activeBBox
    ? {
        ne: [activeBBox[2], activeBBox[3]] as [number, number],
        sw: [activeBBox[0], activeBBox[1]] as [number, number],
        paddingTop: 80,
        paddingBottom: 200,
        paddingLeft: 40,
        paddingRight: 40,
      }
    : undefined;

  return (
    <MapView
      style={styles.map}
      styleURL={DEFAULT_MAP_STYLE}
      logoEnabled={false}
      attributionEnabled={false}
      compassEnabled
      compassViewPosition={0}
    >
      <Camera
        ref={cameraRef}
        defaultSettings={{
          centerCoordinate: DEFAULT_CENTER,
          zoomLevel: DEFAULT_ZOOM,
        }}
        bounds={bounds}
        animationDuration={800}
      />

      {/* Route layers — render inactive days first, active day on top */}
      {daySegments.map((segments, i) =>
        i !== activeDayIndex ? (
          <DayRouteLayers
            key={`day-${i}`}
            dayIndex={i}
            segments={segments}
            isActive={false}
            selectedAlt={selectedAltIndex[i] ?? 0}
            onSegmentPress={onSegmentPress}
          />
        ) : null,
      )}
      {daySegments[activeDayIndex] != null && (
        <DayRouteLayers
          key={`day-${activeDayIndex}-active`}
          dayIndex={activeDayIndex}
          segments={daySegments[activeDayIndex]}
          isActive={true}
          selectedAlt={selectedAltIndex[activeDayIndex] ?? 0}
          onSegmentPress={onSegmentPress}
        />
      )}

      {/* Place markers on top of routes */}
      <PlaceLayers placesFC={placesFC} onPlacePress={onPlacePress} />
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});

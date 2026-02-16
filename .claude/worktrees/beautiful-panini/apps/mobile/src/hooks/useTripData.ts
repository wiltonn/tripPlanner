import { useState, useEffect, useCallback, useRef } from "react";
import type { GeoJSONFeatureCollection, BBox } from "@trip-planner/map";
import type { NormalizedSummary } from "@trip-planner/map";
import {
  loadAllDayDirections,
  saveDayDirections,
  loadPlaces,
  savePlaces,
} from "../services/trip-storage";
import type { StoredDayDirections } from "../services/trip-storage";
import { placesFC as mockPlaces, dayData as mockDayData, DAY_COUNT } from "../data/mock";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DayRenderData {
  segments: GeoJSONFeatureCollection;
  bbox: BBox;
  summary: NormalizedSummary[];
}

interface TripDataResult {
  trip: { id: string; dayCount: number } | null;
  dayData: DayRenderData[];
  placesFC: GeoJSONFeatureCollection;
  dayBBoxes: BBox[];
  isLoading: boolean;
  isOffline: boolean;
  refresh: () => Promise<void>;
}

const EMPTY_FC: GeoJSONFeatureCollection = { type: "FeatureCollection", features: [] };

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTripData(tripId: string): TripDataResult {
  const [dayData, setDayData] = useState<DayRenderData[]>([]);
  const [placesFC, setPlacesFC] = useState<GeoJSONFeatureCollection>(EMPTY_FC);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const initialLoadDone = useRef(false);

  // Load from local DB first (offline-first)
  useEffect(() => {
    let cancelled = false;

    async function loadLocal() {
      try {
        const dayMap = await loadAllDayDirections(tripId);
        const places = await loadPlaces(tripId);

        if (cancelled) return;

        if (dayMap.size > 0) {
          const data = Array.from(dayMap.entries())
            .sort(([a], [b]) => a - b)
            .map(([, stored]) => storedToDayRender(stored));

          setDayData(data);
          setPlacesFC((places as GeoJSONFeatureCollection) ?? EMPTY_FC);
          setIsOffline(true);
        } else {
          // No local data — seed from mock data
          await seedMockData(tripId);
          setDayData(mockDayData.map(mockToDayRender));
          setPlacesFC(mockPlaces as GeoJSONFeatureCollection);
          setIsOffline(false);
        }
      } catch {
        // DB not yet initialized or read failed — fall back to mock
        setDayData(mockDayData.map(mockToDayRender));
        setPlacesFC(mockPlaces as GeoJSONFeatureCollection);
        setIsOffline(false);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          initialLoadDone.current = true;
        }
      }
    }

    loadLocal();
    return () => { cancelled = true; };
  }, [tripId]);

  // Explicit refresh — the ONLY way to trigger a network fetch
  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      // In a real app, this would call the API:
      // POST /routes/directions for each day
      // For now, re-seed from mock data to simulate a refresh
      await seedMockData(tripId);
      setDayData(mockDayData.map(mockToDayRender));
      setPlacesFC(mockPlaces as GeoJSONFeatureCollection);
      setIsOffline(false);
    } finally {
      setIsLoading(false);
    }
  }, [tripId]);

  const dayBBoxes = dayData.map((d) => d.bbox);

  return {
    trip: dayData.length > 0 ? { id: tripId, dayCount: dayData.length } : null,
    dayData,
    placesFC,
    dayBBoxes,
    isLoading,
    isOffline,
    refresh,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function storedToDayRender(stored: StoredDayDirections): DayRenderData {
  return {
    segments: stored.segments as GeoJSONFeatureCollection,
    bbox: stored.bbox as BBox,
    summary: stored.summary as NormalizedSummary[],
  };
}

function mockToDayRender(d: (typeof mockDayData)[number]): DayRenderData {
  return {
    segments: d.segments as unknown as GeoJSONFeatureCollection,
    bbox: d.bbox as BBox,
    summary: d.summary as unknown as NormalizedSummary[],
  };
}

async function seedMockData(tripId: string): Promise<void> {
  try {
    for (let i = 0; i < DAY_COUNT; i++) {
      const d = mockDayData[i];
      await saveDayDirections(tripId, i, {
        lines: d.lines as unknown as object,
        segments: d.segments as unknown as object,
        bbox: d.bbox as number[],
        summary: d.summary as unknown as object[],
      });
    }
    await savePlaces(tripId, mockPlaces);
  } catch {
    // Storage may not be initialized yet — safe to ignore during seeding
  }
}

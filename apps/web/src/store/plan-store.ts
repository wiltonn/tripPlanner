import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  PlanContext,
  OverlayId,
  MapFocus,
  Tracked,
  Base,
  Activity,
} from "@trip-planner/core";
import { emptyPlanContext, tracked } from "@trip-planner/core";
import type { GeoJSONFeatureCollection } from "@trip-planner/map";
import type { PlaceClickData } from "@/components/MapInteractions";

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

export interface PlanStore {
  // Plan context (domain state)
  context: PlanContext;

  // UI state
  activeDayIndex: number;
  selectedOverlay: OverlayId | null;
  mapFocus: MapFocus | null;

  // Existing UI state (migrated from page.tsx)
  selectedAltIndex: Record<number, number>;
  isochroneFC: GeoJSONFeatureCollection | null;
  selectedPlace: PlaceClickData | null;
  routingProfile: "driving" | "walking" | "cycling";

  // Overlay actions
  setSelectedOverlay: (id: OverlayId | null) => void;
  toggleOverlay: (id: OverlayId) => void;
  setMapFocus: (focus: MapFocus | null) => void;

  // Existing actions (migrated)
  setActiveDayIndex: (index: number) => void;
  setSelectedPlace: (place: PlaceClickData | null) => void;
  setSelectedAltForDay: (dayIndex: number, altIndex: number) => void;
  setIsochroneFC: (fc: GeoJSONFeatureCollection | null) => void;

  // Skeleton actions
  setTripName: (name: string) => void;
  setTripDates: (start: string, end: string) => void;
  setPartySize: (size: number) => void;

  // Base actions
  addBase: (base: Base) => void;

  // Activity actions
  addActivity: (activity: Activity) => void;

  // Context replacement (for loading mock/saved data)
  loadContext: (ctx: PlanContext) => void;
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const usePlanStore = create<PlanStore>()(
  immer((set) => ({
    context: emptyPlanContext(),

    activeDayIndex: 0,
    selectedOverlay: null,
    mapFocus: null,
    selectedAltIndex: {},
    isochroneFC: null,
    selectedPlace: null,
    routingProfile: "driving",

    // Overlay
    setSelectedOverlay: (id) =>
      set((s) => {
        s.selectedOverlay = id;
      }),

    toggleOverlay: (id) =>
      set((s) => {
        s.selectedOverlay = s.selectedOverlay === id ? null : id;
      }),

    setMapFocus: (focus) =>
      set((s) => {
        s.mapFocus = focus;
      }),

    // Migrated
    setActiveDayIndex: (index) =>
      set((s) => {
        s.activeDayIndex = index;
      }),

    setSelectedPlace: (place) =>
      set((s) => {
        s.selectedPlace = place;
      }),

    setSelectedAltForDay: (dayIndex, altIndex) =>
      set((s) => {
        s.selectedAltIndex[dayIndex] = altIndex;
      }),

    setIsochroneFC: (fc) =>
      set((s) => {
        s.isochroneFC = fc;
      }),

    // Skeleton
    setTripName: (name) =>
      set((s) => {
        s.context.skeleton.name = tracked(name) as Tracked<string>;
      }),

    setTripDates: (start, end) =>
      set((s) => {
        s.context.skeleton.startDate = tracked(start) as Tracked<string>;
        s.context.skeleton.endDate = tracked(end) as Tracked<string>;
      }),

    setPartySize: (size) =>
      set((s) => {
        s.context.skeleton.partySize = tracked(size) as Tracked<number>;
      }),

    // Bases
    addBase: (base) =>
      set((s) => {
        s.context.bases.push(base);
      }),

    // Activities
    addActivity: (activity) =>
      set((s) => {
        s.context.activities.push(activity);
      }),

    // Context
    loadContext: (ctx) =>
      set((s) => {
        s.context = ctx;
      }),
  }))
);

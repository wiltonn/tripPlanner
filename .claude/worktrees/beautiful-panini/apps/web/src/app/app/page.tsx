"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Map from "@/components/Map";
import PlaceSidebar from "@/components/PlaceSidebar";
import RouteAlternativesPanel from "@/components/RouteAlternativesPanel";
import AccordionPanel from "@/components/AccordionPanel";
import type { PlaceClickData } from "@/components/MapInteractions";
import { dayData, DAY_COUNT } from "../data/mock";
import { mockPlanContext } from "../data/mock-context";
import { usePlanStore } from "@/store/plan-store";
import { createClient } from "@/lib/supabase";
import {
  createPoint,
  createFeature,
  createFeatureCollection,
} from "@trip-planner/map";
import type { GeoJSONFeatureCollection } from "@trip-planner/map";

const daySegments = dayData.map((d) => d.segments);
const dayBBoxes = dayData.map((d) => d.bbox);
const daySummaries = dayData.map((d) => d.summary);

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const ISOCHRONE_CONTOURS = [15, 30, 60];

export default function MapPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null);
    });
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const activeDayIndex = usePlanStore((s) => s.activeDayIndex);
  const selectedPlace = usePlanStore((s) => s.selectedPlace);
  const setSelectedPlace = usePlanStore((s) => s.setSelectedPlace);
  const selectedAltIndex = usePlanStore((s) => s.selectedAltIndex);
  const setSelectedAltForDay = usePlanStore((s) => s.setSelectedAltForDay);
  const isochroneFC = usePlanStore((s) => s.isochroneFC);
  const setIsochroneFC = usePlanStore((s) => s.setIsochroneFC);
  const routingProfile = usePlanStore((s) => s.routingProfile);
  const mapFocus = usePlanStore((s) => s.mapFocus);
  const loadContext = usePlanStore((s) => s.loadContext);
  const context = usePlanStore((s) => s.context);
  const setPendingActivityCoords = usePlanStore((s) => s.setPendingActivityCoords);

  // Load mock plan context on mount
  useEffect(() => {
    loadContext(mockPlanContext);
  }, [loadContext]);

  // Derive placesFC from context activities + bases
  const placesFC: GeoJSONFeatureCollection = useMemo(() => {
    // Build sort order per day: group activities by dayIndex, assign sortOrder
    const dayGroups: Record<number, string[]> = {};
    for (const a of context.activities) {
      const di = a.dayIndex?.value;
      if (di != null) {
        if (!dayGroups[di]) dayGroups[di] = [];
        dayGroups[di].push(a.id);
      }
    }

    const activityFeatures = context.activities.map((a) => {
      const di = a.dayIndex?.value ?? -1;
      let sortOrder = 1;
      if (di >= 0 && dayGroups[di]) {
        sortOrder = dayGroups[di].indexOf(a.id) + 1;
      }
      return createFeature(
        createPoint(a.location.value[0], a.location.value[1]),
        {
          id: a.id,
          name: a.name.value,
          category: "activity",
          dayIndex: di,
          sortOrder,
          activityName: a.name.value,
          priority: a.priority.value,
        },
        a.id
      );
    });

    const baseFeatures = context.bases.map((b) =>
      createFeature(
        createPoint(b.location.value[0], b.location.value[1]),
        {
          id: b.id,
          name: b.name.value,
          category: "lodging",
          dayIndex: 0,
          sortOrder: 0,
          activityName: b.name.value,
        },
        b.id
      )
    );

    return createFeatureCollection([...activityFeatures, ...baseFeatures]);
  }, [context.activities, context.bases]);

  const currentAlt = selectedAltIndex[activeDayIndex] ?? 0;

  const handlePlaceClick = useCallback(
    (data: PlaceClickData) => {
      setSelectedPlace(data);
    },
    [setSelectedPlace]
  );

  const handleCloseSidebar = useCallback(() => {
    setSelectedPlace(null);
  }, [setSelectedPlace]);

  const handleIsochroneRequest = useCallback(
    async (coordinates: [number, number]) => {
      try {
        const res = await fetch(`${API_BASE}/routes/isochrone`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profile: routingProfile,
            coordinates,
            contours_minutes: ISOCHRONE_CONTOURS,
          }),
        });
        if (!res.ok) {
          console.error("Isochrone fetch failed:", res.status);
          return;
        }
        const data = await res.json();
        setIsochroneFC(data.geojson);
      } catch (err) {
        console.error("Isochrone fetch error:", err);
      }
    },
    [routingProfile, setIsochroneFC]
  );

  const handleIsochroneClear = useCallback(() => {
    setIsochroneFC(null);
  }, [setIsochroneFC]);

  const handleMapClickCoords = useCallback(
    (coordinates: [number, number]) => {
      setPendingActivityCoords(coordinates);
    },
    [setPendingActivityCoords]
  );

  const handleAltChange = useCallback(
    (altIndex: number) => {
      setSelectedAltForDay(activeDayIndex, altIndex);
    },
    [activeDayIndex, setSelectedAltForDay]
  );

  return (
    <div className="app-shell">
      {/* User bar */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 16px",
        background: "rgba(10, 10, 20, 0.7)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        fontSize: "13px", color: "rgba(255,255,255,0.7)",
      }}>
        <span style={{ fontWeight: 600, color: "#fff" }}>TripPlanner</span>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {userEmail && <span>{userEmail}</span>}
          <button
            onClick={handleSignOut}
            style={{
              padding: "4px 12px", borderRadius: "6px",
              border: "1px solid rgba(255,255,255,0.15)",
              background: "transparent", color: "#fff",
              cursor: "pointer", fontSize: "13px",
            }}
          >
            Sign out
          </button>
        </div>
      </div>
      <Map
        placesFC={placesFC}
        daySegments={daySegments}
        dayBBoxes={dayBBoxes}
        daySummaries={daySummaries}
        activeDayIndex={activeDayIndex}
        selectedAltIndex={selectedAltIndex}
        onPlaceClick={handlePlaceClick}
        isochroneFC={isochroneFC}
        onIsochroneRequest={handleIsochroneRequest}
        onIsochroneClear={handleIsochroneClear}
        mapFocus={mapFocus}
        onMapClickCoords={handleMapClickCoords}
      />
      <AccordionPanel dayCount={DAY_COUNT} />
      <RouteAlternativesPanel
        summaries={dayData[activeDayIndex].summary}
        selectedAlt={currentAlt}
        onAltChange={handleAltChange}
      />
      <PlaceSidebar place={selectedPlace} onClose={handleCloseSidebar} />
    </div>
  );
}

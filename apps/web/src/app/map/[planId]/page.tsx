"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Map from "@/components/Map";
import PlaceSidebar from "@/components/PlaceSidebar";
import RouteAlternativesPanel from "@/components/RouteAlternativesPanel";
import AccordionPanel from "@/components/AccordionPanel";
import type { PlaceClickData } from "@/components/MapInteractions";
import { usePlanStore } from "@/store/plan-store";
import { createClient } from "@/lib/supabase";
import { PlanContextSchema } from "@trip-planner/core";
import {
  createPoint,
  createFeature,
  createFeatureCollection,
} from "@trip-planner/map";
import type { GeoJSONFeatureCollection } from "@trip-planner/map";

const ISOCHRONE_CONTOURS = [15, 30, 60];

export default function MapPage(): React.JSX.Element {
  const router = useRouter();
  const params = useParams();
  const planId = params.planId as string;
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [planTitle, setPlanTitle] = useState<string>("");
  const [planLoaded, setPlanLoaded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Load plan + verify ownership, generate if needed
  useEffect(() => {
    const supabase = createClient();

    async function loadPlan() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUserEmail(user.email ?? null);

      const { data: plan } = await supabase
        .from("trip_plans")
        .select("*")
        .eq("id", planId)
        .single();

      if (!plan) {
        router.push("/dashboard");
        return;
      }

      setPlanTitle(plan.title);

      // If plan_context already exists, load it directly
      if (plan.plan_context) {
        const validated = PlanContextSchema.safeParse(plan.plan_context);
        if (validated.success) {
          loadContext(validated.data);
          setPlanLoaded(true);
          return;
        }
        // Invalid stored context — regenerate
        console.warn("Stored plan_context failed validation, regenerating...");
      }

      // No plan_context — trigger generation
      setGenerating(true);
      try {
        const res = await fetch("/api/chat/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destination: plan.destination,
            nights: plan.nights,
            travelers: plan.travelers,
            airport: plan.airport,
            tripStyle: plan.trip_style,
            budget: plan.budget,
          }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.message || `Generation failed (${res.status})`);
        }

        const { planContext } = await res.json();
        const validated = PlanContextSchema.safeParse(planContext);
        if (!validated.success) {
          throw new Error("Generated plan failed validation");
        }

        // Save to DB
        await supabase
          .from("trip_plans")
          .update({ plan_context: planContext, status: "ready" })
          .eq("id", planId);

        loadContext(validated.data);
        setPlanLoaded(true);
      } catch (err) {
        console.error("Plan generation error:", err);
        setError(err instanceof Error ? err.message : "Failed to generate plan");
      } finally {
        setGenerating(false);
      }
    }

    loadPlan();
  }, [planId, router, loadContext]);

  // Derive dayCount from context dailySchedules
  const dayCount = context.dailySchedules.length || 1;

  // Derive placesFC from context activities + bases
  const placesFC: GeoJSONFeatureCollection = useMemo(() => {
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
        const res = await fetch(`/api/routes/isochrone`, {
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

  function handleRetry() {
    setError(null);
    setPlanLoaded(false);
    // Re-trigger the effect by forcing a state change
    window.location.reload();
  }

  // Generating overlay
  if (generating) {
    return (
      <div className="app-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a14" }}>
        <div style={{ textAlign: "center" }}>
          <div className="generating-spinner" />
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "15px", marginTop: "16px" }}>
            Generating your itinerary...
          </div>
          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "12px", marginTop: "8px" }}>
            This may take a few seconds
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="app-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a14" }}>
        <div style={{ textAlign: "center", maxWidth: "400px" }}>
          <div style={{ color: "#f87171", fontSize: "15px", marginBottom: "16px" }}>
            {error}
          </div>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button
              onClick={handleRetry}
              style={{
                padding: "8px 20px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              Retry
            </button>
            <Link
              href="/dashboard"
              style={{
                padding: "8px 20px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.15)",
                background: "transparent",
                color: "rgba(255,255,255,0.6)",
                textDecoration: "none",
                fontSize: "13px",
              }}
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (!planLoaded) {
    return (
      <div className="app-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a14" }}>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px" }}>Loading...</div>
      </div>
    );
  }

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
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link
            href="/dashboard"
            style={{ color: "rgba(255,255,255,0.5)", textDecoration: "none", fontSize: "13px" }}
          >
            &larr; My Trips
          </Link>
          <span style={{ fontWeight: 600, color: "#fff" }}>{planTitle || "TripPlanner"}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {userEmail && <span>{userEmail}</span>}
        </div>
      </div>
      <Map
        placesFC={placesFC}
        daySegments={[]}
        dayBBoxes={[]}
        daySummaries={[]}
        activeDayIndex={activeDayIndex}
        selectedAltIndex={selectedAltIndex}
        onPlaceClick={handlePlaceClick}
        isochroneFC={isochroneFC}
        onIsochroneRequest={handleIsochroneRequest}
        onIsochroneClear={handleIsochroneClear}
        mapFocus={mapFocus}
        onMapClickCoords={handleMapClickCoords}
      />
      <AccordionPanel dayCount={dayCount} />
      {context.dailySchedules.length > 0 && (
        <RouteAlternativesPanel
          summaries={[]}
          selectedAlt={currentAlt}
          onAltChange={handleAltChange}
        />
      )}
      <PlaceSidebar place={selectedPlace} onClose={handleCloseSidebar} />
    </div>
  );
}

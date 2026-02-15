"use client";

import { useState, useCallback } from "react";
import Map from "@/components/Map";
import DayTimeline from "@/components/DayTimeline";
import PlaceSidebar from "@/components/PlaceSidebar";
import RouteAlternativesPanel from "@/components/RouteAlternativesPanel";
import type { PlaceClickData } from "@/components/MapInteractions";
import { placesFC, dayData, DAY_COUNT } from "./data/mock";

const daySegments = dayData.map((d) => d.segments);
const dayBBoxes = dayData.map((d) => d.bbox);
const daySummaries = dayData.map((d) => d.summary);

export default function MapPage() {
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [selectedPlace, setSelectedPlace] = useState<PlaceClickData | null>(null);
  const [selectedAltIndex, setSelectedAltIndex] = useState<Record<number, number>>({});

  const currentAlt = selectedAltIndex[activeDayIndex] ?? 0;

  const handlePlaceClick = useCallback((data: PlaceClickData) => {
    setSelectedPlace(data);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSelectedPlace(null);
  }, []);

  const handleAltChange = useCallback(
    (altIndex: number) => {
      setSelectedAltIndex((prev) => ({ ...prev, [activeDayIndex]: altIndex }));
    },
    [activeDayIndex]
  );

  return (
    <div className="app-shell">
      <Map
        placesFC={placesFC}
        daySegments={daySegments}
        dayBBoxes={dayBBoxes}
        daySummaries={daySummaries}
        activeDayIndex={activeDayIndex}
        selectedAltIndex={selectedAltIndex}
        onPlaceClick={handlePlaceClick}
      />
      <DayTimeline
        dayCount={DAY_COUNT}
        activeDayIndex={activeDayIndex}
        onDayChange={setActiveDayIndex}
      />
      <RouteAlternativesPanel
        summaries={dayData[activeDayIndex].summary}
        selectedAlt={currentAlt}
        onAltChange={handleAltChange}
      />
      <PlaceSidebar place={selectedPlace} onClose={handleCloseSidebar} />
    </div>
  );
}

import React, { useState, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import TripMap from "../components/TripMap";
import DayTimeline from "../components/DayTimeline";
import RouteAlternativesPanel from "../components/RouteAlternativesPanel";
import PlaceSheet from "../components/PlaceSheet";
import SegmentSheet from "../components/SegmentSheet";
import type { PlaceClickData, SegmentClickData } from "../components/TripMap";
import { placesFC, dayData, DAY_COUNT } from "../data/mock";

const daySegments = dayData.map((d) => d.segments);
const dayBBoxes = dayData.map((d) => d.bbox);
const daySummaries = dayData.map((d) => d.summary);

export default function MapScreen() {
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [selectedAltIndex, setSelectedAltIndex] = useState<Record<number, number>>({});
  const [selectedPlace, setSelectedPlace] = useState<PlaceClickData | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<SegmentClickData | null>(null);

  const currentAlt = selectedAltIndex[activeDayIndex] ?? 0;

  const handlePlacePress = useCallback((data: PlaceClickData) => {
    setSelectedSegment(null);
    setSelectedPlace(data);
  }, []);

  const handleSegmentPress = useCallback((data: SegmentClickData) => {
    setSelectedPlace(null);
    setSelectedSegment(data);
  }, []);

  const handleAltChange = useCallback(
    (altIndex: number) => {
      setSelectedAltIndex((prev) => ({ ...prev, [activeDayIndex]: altIndex }));
    },
    [activeDayIndex],
  );

  const handleClosePlaceSheet = useCallback(() => {
    setSelectedPlace(null);
  }, []);

  const handleCloseSegmentSheet = useCallback(() => {
    setSelectedSegment(null);
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={styles.container}>
        <TripMap
          placesFC={placesFC}
          daySegments={daySegments}
          dayBBoxes={dayBBoxes}
          activeDayIndex={activeDayIndex}
          selectedAltIndex={selectedAltIndex}
          onPlacePress={handlePlacePress}
          onSegmentPress={handleSegmentPress}
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

        <PlaceSheet place={selectedPlace} onClose={handleClosePlaceSheet} />
        <SegmentSheet
          segment={selectedSegment}
          daySummaries={daySummaries}
          onClose={handleCloseSegmentSheet}
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
});

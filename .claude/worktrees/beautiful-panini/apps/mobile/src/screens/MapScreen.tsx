import React, { useState, useCallback } from "react";
import { View, Pressable, Text, StyleSheet, ActivityIndicator } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import TripMap from "../components/TripMap";
import DayTimeline from "../components/DayTimeline";
import RouteAlternativesPanel from "../components/RouteAlternativesPanel";
import PlaceSheet from "../components/PlaceSheet";
import SegmentSheet from "../components/SegmentSheet";
import OfflineManager from "../components/OfflineManager";
import type { PlaceClickData, SegmentClickData } from "../components/TripMap";
import { useTripData } from "../hooks/useTripData";
import { useOfflinePacks } from "../hooks/useOfflinePacks";

const MOCK_TRIP_ID = "mock-trip-id";

export default function MapScreen() {
  const { trip, dayData, placesFC, dayBBoxes, isLoading } = useTripData(MOCK_TRIP_ID);
  const {
    dayStates,
    downloadDay,
    downloadAll,
    deleteAll,
    deleteDay,
    isAnyDownloading,
    totalEstimatedMB,
  } = useOfflinePacks(MOCK_TRIP_ID, dayBBoxes);

  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [selectedAltIndex, setSelectedAltIndex] = useState<Record<number, number>>({});
  const [selectedPlace, setSelectedPlace] = useState<PlaceClickData | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<SegmentClickData | null>(null);
  const [offlineManagerVisible, setOfflineManagerVisible] = useState(false);

  const currentAlt = selectedAltIndex[activeDayIndex] ?? 0;

  const daySegments = dayData.map((d) => d.segments);
  const daySummaries = dayData.map((d) => d.summary);

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

  if (isLoading || !trip) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

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
          dayCount={trip.dayCount}
          activeDayIndex={activeDayIndex}
          onDayChange={setActiveDayIndex}
          packStates={dayStates}
        />

        <RouteAlternativesPanel
          summaries={dayData[activeDayIndex]?.summary ?? []}
          selectedAlt={currentAlt}
          onAltChange={handleAltChange}
        />

        <Pressable
          style={styles.offlineFab}
          onPress={() => setOfflineManagerVisible(true)}
        >
          <Text style={styles.offlineFabText}>↓</Text>
        </Pressable>

        <OfflineManager
          visible={offlineManagerVisible}
          dayStates={dayStates}
          isAnyDownloading={isAnyDownloading}
          totalEstimatedMB={totalEstimatedMB}
          onDownloadDay={downloadDay}
          onDownloadAll={downloadAll}
          onDeleteAll={deleteAll}
          onDeleteDay={deleteDay}
          onClose={() => setOfflineManagerVisible(false)}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  offlineFab: {
    position: "absolute",
    bottom: 140,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1f2937",
    borderWidth: 1,
    borderColor: "#374151",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  offlineFabText: {
    fontSize: 20,
    color: "#f9fafb",
    fontWeight: "700",
  },
});

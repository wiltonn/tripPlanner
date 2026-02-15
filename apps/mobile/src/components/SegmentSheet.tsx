import React, { useCallback, useMemo, useRef, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import type { NormalizedSummary } from "@trip-planner/map";
import type { SegmentClickData } from "./TripMap";
import { formatDistance, formatDuration } from "../utils/format";

interface SegmentSheetProps {
  segment: SegmentClickData | null;
  daySummaries: NormalizedSummary[][];
  onClose: () => void;
}

export default function SegmentSheet({ segment, daySummaries, onClose }: SegmentSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => [260], []);

  useEffect(() => {
    if (segment) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [segment]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!segment) return null;

  const remaining = {
    distance: segment.altTotalDistance - segment.cumulativeDistance,
    duration: segment.altTotalDuration - segment.cumulativeDuration,
  };

  // ETA delta vs fastest alternative
  const summaries = daySummaries[segment.dayIndex];
  let etaDeltaText = "";
  if (summaries && summaries.length >= 2) {
    const fastest = Math.min(...summaries.map((s) => s.totalDuration));
    const delta = segment.altTotalDuration - fastest;
    etaDeltaText = delta <= 0 ? "Fastest route" : `+${formatDuration(delta)} vs fastest`;
  }

  return (
    <BottomSheet
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={handleClose}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.indicator}
    >
      <BottomSheetView style={styles.content}>
        <Text style={styles.name}>{segment.name}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{formatDistance(segment.distance)}</Text>
            <Text style={styles.statLabel}>Segment</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{formatDuration(segment.duration)}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
        </View>

        <View style={styles.progressRow}>
          <View style={styles.progressItem}>
            <Text style={styles.progressLabel}>Elapsed</Text>
            <Text style={styles.progressValue}>
              {formatDuration(segment.cumulativeDuration)} ({formatDistance(segment.cumulativeDistance)})
            </Text>
          </View>
          <View style={styles.progressItem}>
            <Text style={styles.progressLabel}>Remaining</Text>
            <Text style={styles.progressValue}>
              {formatDuration(remaining.duration)} ({formatDistance(remaining.distance)})
            </Text>
          </View>
        </View>

        {etaDeltaText !== "" && (
          <View style={styles.etaRow}>
            <Text
              style={[
                styles.etaText,
                etaDeltaText === "Fastest route" ? styles.etaFastest : styles.etaDelta,
              ]}
            >
              {etaDeltaText}
            </Text>
          </View>
        )}

        <Text style={styles.meta}>
          Day {segment.dayIndex + 1} &middot; Leg {segment.legIndex + 1}
        </Text>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  indicator: {
    backgroundColor: "#d1d5db",
    width: 40,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  statLabel: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
  },
  progressRow: {
    gap: 4,
    marginBottom: 10,
  },
  progressItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  progressLabel: {
    fontSize: 13,
    color: "#6b7280",
  },
  progressValue: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "500",
  },
  etaRow: {
    marginBottom: 8,
  },
  etaText: {
    fontSize: 13,
    fontWeight: "600",
  },
  etaFastest: {
    color: "#16a34a",
  },
  etaDelta: {
    color: "#dc2626",
  },
  meta: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
  },
});

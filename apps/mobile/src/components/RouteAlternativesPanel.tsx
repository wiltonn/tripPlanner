import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import type { NormalizedSummary } from "@trip-planner/map";
import { formatDistance, formatDuration } from "../utils/format";

interface RouteAlternativesPanelProps {
  summaries: NormalizedSummary[];
  selectedAlt: number;
  onAltChange: (altIndex: number) => void;
}

export default function RouteAlternativesPanel({
  summaries,
  selectedAlt,
  onAltChange,
}: RouteAlternativesPanelProps) {
  if (summaries.length <= 1) return null;

  const fastestDuration = Math.min(...summaries.map((s) => s.totalDuration));

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {summaries.map((summary, i) => {
          const isSelected = i === selectedAlt;
          const isFastest = summary.totalDuration === fastestDuration;
          const delta = summary.totalDuration - fastestDuration;

          return (
            <Pressable
              key={i}
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => onAltChange(i)}
            >
              <View style={styles.header}>
                <Text style={[styles.routeLabel, isSelected && styles.textSelected]}>
                  Route {i + 1}
                </Text>
                {isFastest && (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>Fastest</Text>
                  </View>
                )}
              </View>
              <View style={styles.stats}>
                <Text style={[styles.stat, isSelected && styles.textSelected]}>
                  {formatDistance(summary.totalDistance)}
                </Text>
                <Text style={[styles.stat, isSelected && styles.textSelected]}>
                  {formatDuration(summary.totalDuration)}
                </Text>
              </View>
              {delta > 0 && (
                <Text style={styles.delta}>+{formatDuration(delta)}</Text>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 140,
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  cardSelected: {
    borderColor: "#3b82f6",
    backgroundColor: "#eff6ff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  routeLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },
  textSelected: {
    color: "#1d4ed8",
  },
  tag: {
    backgroundColor: "#dcfce7",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#16a34a",
  },
  stats: {
    flexDirection: "row",
    gap: 12,
  },
  stat: {
    fontSize: 13,
    color: "#6b7280",
  },
  delta: {
    fontSize: 12,
    color: "#dc2626",
    marginTop: 2,
  },
});

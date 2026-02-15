import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { dayColor } from "../theme/colors";

interface DayTimelineProps {
  dayCount: number;
  activeDayIndex: number;
  onDayChange: (index: number) => void;
}

export default function DayTimeline({
  dayCount,
  activeDayIndex,
  onDayChange,
}: DayTimelineProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {Array.from({ length: dayCount }, (_, i) => {
          const isActive = i === activeDayIndex;
          const color = dayColor(i);

          return (
            <Pressable
              key={i}
              style={[
                styles.button,
                isActive && { backgroundColor: color, borderColor: color },
              ]}
              onPress={() => onDayChange(i)}
            >
              <Text style={[styles.label, isActive && styles.activeLabel]}>
                Day {i + 1}
              </Text>
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
    top: 60,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  activeLabel: {
    color: "#fff",
  },
});

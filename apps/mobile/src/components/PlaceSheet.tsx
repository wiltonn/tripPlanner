import React, { useCallback, useMemo, useRef, useEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import type { PlaceClickData } from "./TripMap";

interface PlaceSheetProps {
  place: PlaceClickData | null;
  onClose: () => void;
}

export default function PlaceSheet({ place, onClose }: PlaceSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => [200], []);

  useEffect(() => {
    if (place) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [place]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!place) return null;

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
        <View style={styles.header}>
          <Text style={styles.name}>{place.name}</Text>
          <Pressable onPress={handleClose} hitSlop={12}>
            <Text style={styles.closeBtn}>X</Text>
          </Pressable>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Category</Text>
          <Text style={styles.value}>{place.category}</Text>
        </View>
        {place.dayIndex !== undefined && (
          <View style={styles.field}>
            <Text style={styles.label}>Day</Text>
            <Text style={styles.value}>Day {place.dayIndex + 1}</Text>
          </View>
        )}
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
  },
  closeBtn: {
    fontSize: 18,
    color: "#9ca3af",
    fontWeight: "600",
    paddingLeft: 12,
  },
  field: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  label: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  value: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
  },
});

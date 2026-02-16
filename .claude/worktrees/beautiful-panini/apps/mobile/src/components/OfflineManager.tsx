import React, { useRef, useCallback, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import type { DayPackState } from "../hooks/useOfflinePacks";
import { dayColor } from "../theme/colors";

interface OfflineManagerProps {
  visible: boolean;
  dayStates: DayPackState[];
  isAnyDownloading: boolean;
  totalEstimatedMB: number;
  onDownloadDay: (dayIndex: number) => void;
  onDownloadAll: () => void;
  onDeleteAll: () => void;
  onDeleteDay: (dayIndex: number) => void;
  onClose: () => void;
}

export default function OfflineManager({
  visible,
  dayStates,
  isAnyDownloading,
  totalEstimatedMB,
  onDownloadDay,
  onDownloadAll,
  onDeleteAll,
  onDeleteDay,
  onClose,
}: OfflineManagerProps) {
  const sheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.expand();
    } else {
      sheetRef.current?.close();
    }
  }, [visible]);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) onClose();
    },
    [onClose],
  );

  const hasAnyComplete = dayStates.some((s) => s.status === "complete");
  const hasAnyDownloadable = dayStates.some(
    (s) => s.status === "none" || s.status === "error",
  );

  if (!visible) return null;

  return (
    <BottomSheet
      ref={sheetRef}
      index={0}
      snapPoints={["50%", "80%"]}
      enablePanDownToClose
      onChange={handleSheetChange}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Offline Maps</Text>
        <Text style={styles.subtitle}>
          Total estimated: {totalEstimatedMB.toFixed(1)} MB
        </Text>

        {dayStates.some((s) => s.estimate?.exceedsLimit) && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              Some days exceed the 200MB limit. Max zoom will be reduced automatically.
            </Text>
          </View>
        )}

        {dayStates.map((state) => (
          <View key={state.dayIndex} style={styles.dayRow}>
            <View style={styles.dayInfo}>
              <View
                style={[styles.dayDot, { backgroundColor: dayColor(state.dayIndex) }]}
              />
              <View style={styles.dayText}>
                <Text style={styles.dayLabel}>Day {state.dayIndex + 1}</Text>
                <Text style={styles.daySize}>
                  {state.estimate
                    ? `${state.estimate.estimatedSizeMB.toFixed(1)} MB · ${state.estimate.tileCount} tiles`
                    : "Estimating..."}
                  {state.estimate?.exceedsLimit &&
                    state.estimate.suggestedMaxZoom !== undefined &&
                    ` · Zoom capped at ${state.estimate.suggestedMaxZoom}`}
                </Text>
              </View>
            </View>

            <View style={styles.dayActions}>
              {state.status === "downloading" && (
                <View style={styles.progressContainer}>
                  <ActivityIndicator size="small" color="#3b82f6" />
                  <Text style={styles.progressText}>
                    {Math.round(state.progress * 100)}%
                  </Text>
                </View>
              )}

              {state.status === "complete" && (
                <View style={styles.rowActions}>
                  <Text style={styles.completeText}>Ready</Text>
                  <Pressable
                    style={styles.deleteBtn}
                    onPress={() => onDeleteDay(state.dayIndex)}
                  >
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </Pressable>
                </View>
              )}

              {state.status === "error" && (
                <View style={styles.rowActions}>
                  <Text style={styles.errorText}>Failed</Text>
                  <Pressable
                    style={styles.retryBtn}
                    onPress={() => onDownloadDay(state.dayIndex)}
                  >
                    <Text style={styles.retryBtnText}>Retry</Text>
                  </Pressable>
                </View>
              )}

              {(state.status === "none" || state.status === "pending") && (
                <Pressable
                  style={styles.downloadBtn}
                  onPress={() => onDownloadDay(state.dayIndex)}
                  disabled={isAnyDownloading}
                >
                  <Text
                    style={[
                      styles.downloadBtnText,
                      isAnyDownloading && styles.disabledText,
                    ]}
                  >
                    Download
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        ))}

        <View style={styles.bottomActions}>
          {hasAnyDownloadable && (
            <Pressable
              style={[styles.actionBtn, styles.downloadAllBtn]}
              onPress={onDownloadAll}
              disabled={isAnyDownloading}
            >
              <Text style={styles.actionBtnText}>
                {isAnyDownloading ? "Downloading..." : "Download All"}
              </Text>
            </Pressable>
          )}

          {hasAnyComplete && (
            <Pressable
              style={[styles.actionBtn, styles.deleteAllBtn]}
              onPress={onDeleteAll}
              disabled={isAnyDownloading}
            >
              <Text style={[styles.actionBtnText, styles.deleteAllText]}>
                Delete All
              </Text>
            </Pressable>
          )}
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: "#1f2937",
  },
  handle: {
    backgroundColor: "#6b7280",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#f9fafb",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#9ca3af",
    marginBottom: 16,
  },
  warningBanner: {
    backgroundColor: "#92400e",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  warningText: {
    color: "#fef3c7",
    fontSize: 12,
    fontWeight: "500",
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#374151",
  },
  dayInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  dayDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  dayText: {
    flex: 1,
  },
  dayLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#f3f4f6",
  },
  daySize: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },
  dayActions: {
    marginLeft: 12,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  progressText: {
    fontSize: 12,
    color: "#3b82f6",
    fontWeight: "600",
  },
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  completeText: {
    fontSize: 12,
    color: "#22c55e",
    fontWeight: "600",
  },
  errorText: {
    fontSize: 12,
    color: "#ef4444",
    fontWeight: "600",
  },
  downloadBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#3b82f6",
  },
  downloadBtnText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
  },
  retryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#f59e0b",
  },
  retryBtnText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
  },
  deleteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#374151",
  },
  deleteBtnText: {
    fontSize: 12,
    color: "#ef4444",
    fontWeight: "600",
  },
  disabledText: {
    opacity: 0.5,
  },
  bottomActions: {
    marginTop: 20,
    gap: 10,
  },
  actionBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  downloadAllBtn: {
    backgroundColor: "#3b82f6",
  },
  deleteAllBtn: {
    backgroundColor: "#374151",
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  deleteAllText: {
    color: "#ef4444",
  },
});

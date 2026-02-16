import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { PackStatus } from "../hooks/useOfflinePacks";

interface OfflineStatusBadgeProps {
  status: PackStatus;
  progress?: number;
}

const STATUS_CONFIG: Record<PackStatus, { icon: string; color: string }> = {
  none: { icon: "☁", color: "#9ca3af" },
  pending: { icon: "⏳", color: "#6b7280" },
  downloading: { icon: "↓", color: "#3b82f6" },
  complete: { icon: "✓", color: "#22c55e" },
  error: { icon: "!", color: "#ef4444" },
};

export default function OfflineStatusBadge({
  status,
  progress,
}: OfflineStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <View style={[styles.badge, { backgroundColor: config.color }]}>
      <Text style={styles.icon}>{config.icon}</Text>
      {status === "downloading" && progress !== undefined && (
        <Text style={styles.progress}>{Math.round(progress * 100)}%</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    marginLeft: 4,
  },
  icon: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "700",
  },
  progress: {
    fontSize: 8,
    color: "#fff",
    fontWeight: "600",
    marginLeft: 2,
  },
});

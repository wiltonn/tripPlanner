import { useState, useEffect, useCallback } from "react";
import type { BBox } from "@trip-planner/core";
import { estimateOfflineRegion } from "@trip-planner/core";
import type { OfflineRegionEstimate } from "@trip-planner/core";
import { loadTripPacks } from "../services/trip-storage";
import type { PackMeta } from "../services/trip-storage";
import {
  downloadDayPack,
  downloadTripPacks,
  deleteTripPacks,
  deleteDayPack,
} from "../services/offline-packs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PackStatus = "none" | "pending" | "downloading" | "complete" | "error";

export interface DayPackState {
  dayIndex: number;
  status: PackStatus;
  progress: number;
  estimate?: OfflineRegionEstimate;
  error?: string;
}

interface OfflinePacksResult {
  dayStates: DayPackState[];
  downloadDay: (dayIndex: number) => Promise<void>;
  downloadAll: () => Promise<void>;
  deleteAll: () => Promise<void>;
  deleteDay: (dayIndex: number) => Promise<void>;
  isAnyDownloading: boolean;
  totalProgress: number;
  totalEstimatedMB: number;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useOfflinePacks(
  tripId: string,
  dayBBoxes: BBox[],
): OfflinePacksResult {
  const [dayStates, setDayStates] = useState<DayPackState[]>([]);

  // Initialize states with estimates for each day
  useEffect(() => {
    async function init() {
      const estimates = dayBBoxes.map((bbox, i) => ({
        dayIndex: i,
        estimate: estimateOfflineRegion(bbox),
      }));

      // Load existing pack metadata from DB
      let existingPacks: PackMeta[] = [];
      try {
        existingPacks = await loadTripPacks(tripId);
      } catch {
        // DB not initialized
      }

      const packMap = new Map<number, PackMeta>();
      for (const pack of existingPacks) {
        packMap.set(pack.dayIndex, pack);
      }

      const states: DayPackState[] = estimates.map(({ dayIndex, estimate }) => {
        const existing = packMap.get(dayIndex);
        return {
          dayIndex,
          status: existing ? (existing.status as PackStatus) : "none",
          progress: existing?.progress ?? 0,
          estimate,
        };
      });

      setDayStates(states);
    }

    if (dayBBoxes.length > 0) {
      init();
    }
  }, [tripId, dayBBoxes.length]);

  // Progress callback
  const handleProgress = useCallback(
    (dayIndex: number, progress: number, status: PackMeta["status"]) => {
      setDayStates((prev) =>
        prev.map((s) =>
          s.dayIndex === dayIndex
            ? { ...s, progress, status: status as PackStatus }
            : s,
        ),
      );
    },
    [],
  );

  // Error callback
  const handleError = useCallback((dayIndex: number, error: Error) => {
    setDayStates((prev) =>
      prev.map((s) =>
        s.dayIndex === dayIndex
          ? { ...s, status: "error" as PackStatus, error: error.message }
          : s,
      ),
    );
  }, []);

  const downloadDay = useCallback(
    async (dayIndex: number) => {
      if (!dayBBoxes[dayIndex]) return;

      setDayStates((prev) =>
        prev.map((s) =>
          s.dayIndex === dayIndex
            ? { ...s, status: "downloading" as PackStatus, progress: 0, error: undefined }
            : s,
        ),
      );

      await downloadDayPack(
        { tripId, dayIndex, bbox: dayBBoxes[dayIndex] },
        handleProgress,
        handleError,
      );
    },
    [tripId, dayBBoxes, handleProgress, handleError],
  );

  const downloadAll = useCallback(async () => {
    setDayStates((prev) =>
      prev.map((s) =>
        s.status !== "complete"
          ? { ...s, status: "pending" as PackStatus, progress: 0, error: undefined }
          : s,
      ),
    );

    const bboxesToDownload = dayBBoxes.filter((_, i) => {
      const state = dayStates[i];
      return state?.status !== "complete";
    });

    if (bboxesToDownload.length === dayBBoxes.length) {
      await downloadTripPacks(tripId, dayBBoxes, handleProgress, handleError);
    } else {
      // Only download non-complete days
      for (let i = 0; i < dayBBoxes.length; i++) {
        if (dayStates[i]?.status !== "complete") {
          await downloadDayPack(
            { tripId, dayIndex: i, bbox: dayBBoxes[i] },
            handleProgress,
            handleError,
          );
        }
      }
    }
  }, [tripId, dayBBoxes, dayStates, handleProgress, handleError]);

  const deleteAllPacks = useCallback(async () => {
    await deleteTripPacks(tripId);
    setDayStates((prev) =>
      prev.map((s) => ({ ...s, status: "none" as PackStatus, progress: 0, error: undefined })),
    );
  }, [tripId]);

  const deleteDayPack_ = useCallback(
    async (dayIndex: number) => {
      await deleteDayPack(tripId, dayIndex);
      setDayStates((prev) =>
        prev.map((s) =>
          s.dayIndex === dayIndex
            ? { ...s, status: "none" as PackStatus, progress: 0, error: undefined }
            : s,
        ),
      );
    },
    [tripId],
  );

  const isAnyDownloading = dayStates.some((s) => s.status === "downloading");

  const totalProgress =
    dayStates.length > 0
      ? dayStates.reduce((sum, s) => sum + (s.status === "complete" ? 1 : s.progress), 0) /
        dayStates.length
      : 0;

  const totalEstimatedMB = dayStates.reduce(
    (sum, s) => sum + (s.estimate?.estimatedSizeMB ?? 0),
    0,
  );

  return {
    dayStates,
    downloadDay,
    downloadAll,
    deleteAll: deleteAllPacks,
    deleteDay: deleteDayPack_,
    isAnyDownloading,
    totalProgress,
    totalEstimatedMB,
  };
}

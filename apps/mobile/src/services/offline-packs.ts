import Mapbox from "@rnmapbox/maps";
import { estimateOfflineRegion } from "@trip-planner/core";
import type { BBox } from "@trip-planner/core";
import {
  savePackMeta,
  updatePackStatus,
  loadTripPacks,
  deleteTripPackMeta,
} from "./trip-storage";
import type { PackMeta } from "./trip-storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DownloadDayPackOptions {
  tripId: string;
  dayIndex: number;
  bbox: BBox;
  minZoom?: number;
  maxZoom?: number;
  bufferKm?: number;
  styleURL?: string;
}

export type PackProgressCallback = (
  dayIndex: number,
  progress: number,
  status: PackMeta["status"],
) => void;

export type PackErrorCallback = (dayIndex: number, error: Error) => void;

// ---------------------------------------------------------------------------
// Pack Name Convention
// ---------------------------------------------------------------------------

function packName(tripId: string, dayIndex: number): string {
  return `trip:${tripId}:day:${dayIndex}`;
}

// ---------------------------------------------------------------------------
// Download a Single Day Pack
// ---------------------------------------------------------------------------

export async function downloadDayPack(
  options: DownloadDayPackOptions,
  onProgress?: PackProgressCallback,
  onError?: PackErrorCallback,
  force: boolean = false,
): Promise<void> {
  const {
    tripId,
    dayIndex,
    bbox,
    minZoom = 6,
    maxZoom = 16,
    bufferKm = 5,
    styleURL = Mapbox.StyleURL.Street,
  } = options;

  // GUARDRAIL: Always estimate before downloading
  const estimate = estimateOfflineRegion(bbox, minZoom, maxZoom, bufferKm);

  if (estimate.exceedsLimit && !force) {
    const msg = `Offline region for day ${dayIndex + 1} exceeds 200MB limit ` +
      `(${estimate.estimatedSizeMB}MB, ${estimate.tileCount} tiles). ` +
      (estimate.suggestedMaxZoom !== undefined
        ? `Suggested max zoom: ${estimate.suggestedMaxZoom}.`
        : "Region too large even at minimum zoom.");
    const error = new Error(msg);
    onError?.(dayIndex, error);
    return;
  }

  const name = packName(tripId, dayIndex);
  const [sw, ne] = estimate.bounds;

  // Persist metadata to SQLite
  await savePackMeta({
    name,
    tripId,
    dayIndex,
    bounds: JSON.stringify(estimate.bounds),
    minZoom: estimate.suggestedMaxZoom !== undefined && !force
      ? minZoom
      : minZoom,
    maxZoom: estimate.suggestedMaxZoom ?? maxZoom,
    estimatedTiles: estimate.tileCount,
    estimatedSizeMB: estimate.estimatedSizeMB,
    status: "downloading",
    progress: 0,
    completedSizeBytes: 0,
    createdAt: Date.now(),
  });

  onProgress?.(dayIndex, 0, "downloading");

  try {
    await Mapbox.offlineManager.createPack(
      {
        name,
        styleURL,
        bounds: [ne, sw] as [[number, number], [number, number]],
        minZoom: minZoom,
        maxZoom: estimate.suggestedMaxZoom ?? maxZoom,
      },
      (_pack, status) => {
        if (status) {
          const progress = status.percentage / 100;
          onProgress?.(dayIndex, progress, "downloading");
          updatePackStatus(name, "downloading", progress, status.completedTileSize ?? 0);

          if (status.percentage >= 100) {
            onProgress?.(dayIndex, 1, "complete");
            updatePackStatus(name, "complete", 1, status.completedTileSize ?? 0);
          }
        }
      },
      (_pack, error) => {
        const err = new Error(error.message);
        onError?.(dayIndex, err);
        updatePackStatus(name, "error");
      },
    );
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    onError?.(dayIndex, error);
    await updatePackStatus(name, "error");
  }
}

// ---------------------------------------------------------------------------
// Download All Days (Sequential)
// ---------------------------------------------------------------------------

export async function downloadTripPacks(
  tripId: string,
  dayBBoxes: BBox[],
  onProgress?: PackProgressCallback,
  onError?: PackErrorCallback,
): Promise<void> {
  for (let i = 0; i < dayBBoxes.length; i++) {
    await downloadDayPack(
      { tripId, dayIndex: i, bbox: dayBBoxes[i] },
      onProgress,
      onError,
    );
  }
}

// ---------------------------------------------------------------------------
// Delete All Packs for a Trip
// ---------------------------------------------------------------------------

export async function deleteTripPacks(tripId: string): Promise<void> {
  const packs = await loadTripPacks(tripId);
  for (const pack of packs) {
    try {
      await Mapbox.offlineManager.deletePack(pack.name);
    } catch {
      // Pack may not exist in Mapbox if download never started
    }
  }
  await deleteTripPackMeta(tripId);
}

// ---------------------------------------------------------------------------
// Delete a Single Day Pack
// ---------------------------------------------------------------------------

export async function deleteDayPack(
  tripId: string,
  dayIndex: number,
): Promise<void> {
  const name = packName(tripId, dayIndex);
  try {
    await Mapbox.offlineManager.deletePack(name);
  } catch {
    // Pack may not exist
  }
  await updatePackStatus(name, "pending", 0, 0);
}

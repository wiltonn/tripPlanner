import { z } from "zod";
import type { BBox } from "./geojson";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AVG_TILE_SIZE_KB = 20;
const MAX_REGION_SIZE_MB = 200;
const DEFAULT_BUFFER_KM = 5;
const DEFAULT_MIN_ZOOM = 6;
const DEFAULT_MAX_ZOOM = 16;

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const OfflineRegionBoundsSchema = z.tuple([
  z.tuple([z.number(), z.number()]), // [swLon, swLat]
  z.tuple([z.number(), z.number()]), // [neLon, neLat]
]);

export type OfflineRegionBounds = z.infer<typeof OfflineRegionBoundsSchema>;

export const OfflineRegionEstimateSchema = z.object({
  bounds: OfflineRegionBoundsSchema,
  minZoom: z.number().int().nonnegative(),
  maxZoom: z.number().int().nonnegative(),
  tileCount: z.number().int().nonnegative(),
  estimatedSizeMB: z.number().nonnegative(),
  exceedsLimit: z.boolean(),
  suggestedMaxZoom: z.number().int().nonnegative().optional(),
});

export type OfflineRegionEstimate = z.infer<typeof OfflineRegionEstimateSchema>;

// ---------------------------------------------------------------------------
// bufferBBox — expand a bbox by a corridor buffer in km
// ---------------------------------------------------------------------------

export function bufferBBox(
  bbox: BBox,
  bufferKm: number = DEFAULT_BUFFER_KM,
): OfflineRegionBounds {
  const [minLon, minLat, maxLon, maxLat] = bbox;

  // Latitude: 1 degree ≈ 111 km
  const latBuffer = bufferKm / 111;

  // Longitude: 1 degree ≈ 111 * cos(lat) km — use center latitude
  const centerLat = (minLat + maxLat) / 2;
  const lonBuffer = bufferKm / (111 * Math.cos((centerLat * Math.PI) / 180));

  return [
    [minLon - lonBuffer, minLat - latBuffer],
    [maxLon + lonBuffer, maxLat + latBuffer],
  ];
}

// ---------------------------------------------------------------------------
// tileCountAtZoom — Web Mercator tile count for a bounds at a given zoom
// ---------------------------------------------------------------------------

function lonToTileX(lon: number, zoom: number): number {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

function latToTileY(lat: number, zoom: number): number {
  const latRad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      Math.pow(2, zoom),
  );
}

export function tileCountAtZoom(
  sw: [number, number],
  ne: [number, number],
  zoom: number,
): number {
  const [swLon, swLat] = sw;
  const [neLon, neLat] = ne;

  const xMin = lonToTileX(swLon, zoom);
  const xMax = lonToTileX(neLon, zoom);
  // Note: in Web Mercator, higher latitude = lower Y tile index
  const yMin = latToTileY(neLat, zoom);
  const yMax = latToTileY(swLat, zoom);

  const cols = Math.abs(xMax - xMin) + 1;
  const rows = Math.abs(yMax - yMin) + 1;

  return cols * rows;
}

// ---------------------------------------------------------------------------
// estimateOfflineRegion — full estimation with guardrails
// ---------------------------------------------------------------------------

export function estimateOfflineRegion(
  bbox: BBox,
  minZoom: number = DEFAULT_MIN_ZOOM,
  maxZoom: number = DEFAULT_MAX_ZOOM,
  bufferKm: number = DEFAULT_BUFFER_KM,
): OfflineRegionEstimate {
  const bounds = bufferBBox(bbox, bufferKm);
  const [sw, ne] = bounds;

  let totalTiles = 0;
  for (let z = minZoom; z <= maxZoom; z++) {
    totalTiles += tileCountAtZoom(sw, ne, z);
  }

  const estimatedSizeMB = (totalTiles * AVG_TILE_SIZE_KB) / 1024;
  const exceedsLimit = estimatedSizeMB > MAX_REGION_SIZE_MB;

  let suggestedMaxZoom: number | undefined;
  if (exceedsLimit) {
    // Walk maxZoom down until under limit
    for (let z = maxZoom - 1; z >= minZoom; z--) {
      let tiles = 0;
      for (let zz = minZoom; zz <= z; zz++) {
        tiles += tileCountAtZoom(sw, ne, zz);
      }
      const sizeMB = (tiles * AVG_TILE_SIZE_KB) / 1024;
      if (sizeMB <= MAX_REGION_SIZE_MB) {
        suggestedMaxZoom = z;
        break;
      }
    }
    // If even minZoom is too large, suggest minZoom as fallback
    if (suggestedMaxZoom === undefined) {
      suggestedMaxZoom = minZoom;
    }
  }

  return {
    bounds,
    minZoom,
    maxZoom,
    tileCount: totalTiles,
    estimatedSizeMB: Math.round(estimatedSizeMB * 100) / 100,
    exceedsLimit,
    ...(suggestedMaxZoom !== undefined ? { suggestedMaxZoom } : {}),
  };
}

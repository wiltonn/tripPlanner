import { describe, it, expect } from "vitest";
import {
  bufferBBox,
  tileCountAtZoom,
  estimateOfflineRegion,
  OfflineRegionEstimateSchema,
} from "../offline-estimator";
import type { BBox } from "../geojson";

// NYC area bbox: roughly Manhattan
const NYC_BBOX: BBox = [-74.02, 40.7, -73.93, 40.8];

// Continent-spanning bbox: US coast-to-coast
const US_BBOX: BBox = [-124.7, 25.1, -66.9, 49.4];

describe("offline-region-estimator", () => {
  describe("bufferBBox", () => {
    it("expands bbox by default 5km buffer", () => {
      const [sw, ne] = bufferBBox(NYC_BBOX);
      expect(sw[0]).toBeLessThan(NYC_BBOX[0]);
      expect(sw[1]).toBeLessThan(NYC_BBOX[1]);
      expect(ne[0]).toBeGreaterThan(NYC_BBOX[2]);
      expect(ne[1]).toBeGreaterThan(NYC_BBOX[3]);
    });

    it("zero buffer returns unbuffered bounds", () => {
      const [sw, ne] = bufferBBox(NYC_BBOX, 0);
      expect(sw[0]).toBeCloseTo(NYC_BBOX[0], 10);
      expect(sw[1]).toBeCloseTo(NYC_BBOX[1], 10);
      expect(ne[0]).toBeCloseTo(NYC_BBOX[2], 10);
      expect(ne[1]).toBeCloseTo(NYC_BBOX[3], 10);
    });

    it("buffer at equator differs from high latitude", () => {
      const equatorBBox: BBox = [-74.02, -0.05, -73.93, 0.05];
      const arcticBBox: BBox = [-74.02, 69.95, -73.93, 70.05];

      const [eqSW] = bufferBBox(equatorBBox, 10);
      const [arcSW] = bufferBBox(arcticBBox, 10);

      // At higher latitudes, longitude buffer should be larger (more degrees per km)
      const eqLonExpansion = equatorBBox[0] - eqSW[0];
      const arcLonExpansion = arcticBBox[0] - arcSW[0];
      expect(arcLonExpansion).toBeGreaterThan(eqLonExpansion);
    });
  });

  describe("tileCountAtZoom", () => {
    it("returns 1 tile at zoom 0 for a bounded region", () => {
      // At zoom 0, the entire world fits in a single tile (0,0)
      // Using coordinates within a single tile
      const count = tileCountAtZoom([-74, 40], [-73, 41], 0);
      expect(count).toBe(1);
    });

    it("returns more tiles at higher zoom levels", () => {
      const sw: [number, number] = [NYC_BBOX[0], NYC_BBOX[1]];
      const ne: [number, number] = [NYC_BBOX[2], NYC_BBOX[3]];

      const atZoom10 = tileCountAtZoom(sw, ne, 10);
      const atZoom12 = tileCountAtZoom(sw, ne, 12);
      expect(atZoom12).toBeGreaterThan(atZoom10);
    });

    it("returns positive count for valid bounds", () => {
      const sw: [number, number] = [NYC_BBOX[0], NYC_BBOX[1]];
      const ne: [number, number] = [NYC_BBOX[2], NYC_BBOX[3]];

      for (let z = 0; z <= 16; z++) {
        expect(tileCountAtZoom(sw, ne, z)).toBeGreaterThan(0);
      }
    });
  });

  describe("estimateOfflineRegion", () => {
    it("NYC bbox at zoom 6-16 stays under 200MB", () => {
      const estimate = estimateOfflineRegion(NYC_BBOX);
      expect(estimate.exceedsLimit).toBe(false);
      expect(estimate.suggestedMaxZoom).toBeUndefined();
    });

    it("continent-spanning bbox exceeds limit with suggestedMaxZoom", () => {
      const estimate = estimateOfflineRegion(US_BBOX);
      expect(estimate.exceedsLimit).toBe(true);
      expect(estimate.suggestedMaxZoom).toBeDefined();
      expect(estimate.suggestedMaxZoom!).toBeLessThan(16);
      expect(estimate.suggestedMaxZoom!).toBeGreaterThanOrEqual(6);
    });

    it("output validates against OfflineRegionEstimateSchema", () => {
      const estimate = estimateOfflineRegion(NYC_BBOX);
      const result = OfflineRegionEstimateSchema.safeParse(estimate);
      expect(result.success).toBe(true);
    });

    it("respects custom minZoom and maxZoom", () => {
      const narrow = estimateOfflineRegion(NYC_BBOX, 10, 12);
      const wide = estimateOfflineRegion(NYC_BBOX, 6, 16);
      expect(narrow.tileCount).toBeLessThan(wide.tileCount);
      expect(narrow.minZoom).toBe(10);
      expect(narrow.maxZoom).toBe(12);
    });

    it("size is proportional to tile count", () => {
      const estimate = estimateOfflineRegion(NYC_BBOX);
      // 20KB per tile, converted to MB
      const expectedMB = (estimate.tileCount * 20) / 1024;
      expect(estimate.estimatedSizeMB).toBeCloseTo(expectedMB, 1);
    });
  });
});

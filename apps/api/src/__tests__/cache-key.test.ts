import { describe, it, expect } from "vitest";
import { buildDirectionsCacheKey } from "../services/cache-key";
import type { DirectionsRequest } from "@trip-planner/core";

function makeRequest(
  overrides: Partial<DirectionsRequest> = {}
): DirectionsRequest {
  return {
    profile: "driving",
    coordinates: [
      [-122.4194, 37.7749],
      [-118.2437, 34.0522],
    ],
    alternatives: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Coordinate rounding
// ---------------------------------------------------------------------------

describe("directions-cache-key: coordinate rounding", () => {
  it("rounds coordinates to 5 decimal places", () => {
    const key = buildDirectionsCacheKey(makeRequest());
    expect(key).toContain("-122.41940,37.77490");
  });

  it("produces same key for coords differing beyond 5th decimal", () => {
    const a = buildDirectionsCacheKey(
      makeRequest({
        coordinates: [
          [-122.41940001, 37.77490002],
          [-118.24370003, 34.05220004],
        ],
      })
    );
    const b = buildDirectionsCacheKey(
      makeRequest({
        coordinates: [
          [-122.41940009, 37.77490008],
          [-118.24370007, 34.05220006],
        ],
      })
    );
    expect(a).toBe(b);
  });
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

describe("directions-cache-key: determinism", () => {
  it("same input always produces same key", () => {
    const req = makeRequest();
    const a = buildDirectionsCacheKey(req);
    const b = buildDirectionsCacheKey(req);
    expect(a).toBe(b);
  });
});

// ---------------------------------------------------------------------------
// Profile inclusion
// ---------------------------------------------------------------------------

describe("directions-cache-key: profile inclusion", () => {
  it("different profiles produce different keys", () => {
    const driving = buildDirectionsCacheKey(makeRequest({ profile: "driving" }));
    const walking = buildDirectionsCacheKey(makeRequest({ profile: "walking" }));
    const cycling = buildDirectionsCacheKey(makeRequest({ profile: "cycling" }));
    expect(driving).not.toBe(walking);
    expect(driving).not.toBe(cycling);
    expect(walking).not.toBe(cycling);
  });
});

// ---------------------------------------------------------------------------
// Avoid flags
// ---------------------------------------------------------------------------

describe("directions-cache-key: avoid flags", () => {
  it("includes avoid flags in alphabetical order", () => {
    const key = buildDirectionsCacheKey(
      makeRequest({
        avoid: { tolls: true, highways: true, ferries: true },
      })
    );
    expect(key).toContain("avoid:ferries,highways,tolls");
  });

  it("omits avoid section when no flags are set", () => {
    const key = buildDirectionsCacheKey(makeRequest({ avoid: undefined }));
    expect(key).not.toContain("avoid:");
  });

  it("omits avoid section when all flags are false", () => {
    const key = buildDirectionsCacheKey(
      makeRequest({
        avoid: { tolls: false, highways: false, ferries: false },
      })
    );
    expect(key).not.toContain("avoid:");
  });
});

// ---------------------------------------------------------------------------
// Alternatives flag
// ---------------------------------------------------------------------------

describe("directions-cache-key: alternatives flag", () => {
  it("true vs false produce different keys", () => {
    const withAlt = buildDirectionsCacheKey(
      makeRequest({ alternatives: true })
    );
    const withoutAlt = buildDirectionsCacheKey(
      makeRequest({ alternatives: false })
    );
    expect(withAlt).not.toBe(withoutAlt);
  });
});

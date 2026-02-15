import { describe, it, expect } from "vitest";
import {
  generateAppleMapsLink,
  generateGoogleMapsLink,
  generateWazeLink,
  generateNavLink,
} from "../nav-deeplink";
import type { NavDeeplinkOptions } from "../nav-deeplink";

const NYC: [number, number] = [-73.9857, 40.7484]; // [lon, lat]
const LA: [number, number] = [-118.2437, 34.0522];

const baseOptions: NavDeeplinkOptions = {
  destination: NYC,
  mode: "driving",
};

// ---------------------------------------------------------------------------
// Apple Maps
// ---------------------------------------------------------------------------

describe("generateAppleMapsLink", () => {
  it("generates maps:// scheme with correct lat,lon", () => {
    const link = generateAppleMapsLink(baseOptions);
    expect(link).toMatch(/^maps:\/\/\?/);
    expect(link).toContain("daddr=40.7484%2C-73.9857");
  });

  it("sets dirflg=d for driving", () => {
    const link = generateAppleMapsLink({ ...baseOptions, mode: "driving" });
    expect(link).toContain("dirflg=d");
  });

  it("sets dirflg=w for walking", () => {
    const link = generateAppleMapsLink({ ...baseOptions, mode: "walking" });
    expect(link).toContain("dirflg=w");
  });

  it("falls back to dirflg=w for cycling", () => {
    const link = generateAppleMapsLink({ ...baseOptions, mode: "cycling" });
    expect(link).toContain("dirflg=w");
  });

  it("includes origin when provided", () => {
    const link = generateAppleMapsLink({ ...baseOptions, origin: LA });
    expect(link).toContain("saddr=34.0522%2C-118.2437");
  });

  it("URL-encodes label in destination", () => {
    const link = generateAppleMapsLink({
      ...baseOptions,
      label: "Empire State Building",
    });
    expect(link).toContain("Empire+State+Building");
  });
});

// ---------------------------------------------------------------------------
// Google Maps
// ---------------------------------------------------------------------------

describe("generateGoogleMapsLink", () => {
  it("generates https google maps URL", () => {
    const link = generateGoogleMapsLink(baseOptions);
    expect(link).toMatch(/^https:\/\/www\.google\.com\/maps\/dir\/\?/);
  });

  it("sets api=1", () => {
    const link = generateGoogleMapsLink(baseOptions);
    expect(link).toContain("api=1");
  });

  it("sets travelmode=driving for driving", () => {
    const link = generateGoogleMapsLink({ ...baseOptions, mode: "driving" });
    expect(link).toContain("travelmode=driving");
  });

  it("sets travelmode=walking for walking", () => {
    const link = generateGoogleMapsLink({ ...baseOptions, mode: "walking" });
    expect(link).toContain("travelmode=walking");
  });

  it("sets travelmode=bicycling for cycling", () => {
    const link = generateGoogleMapsLink({ ...baseOptions, mode: "cycling" });
    expect(link).toContain("travelmode=bicycling");
  });

  it("includes origin when provided", () => {
    const link = generateGoogleMapsLink({ ...baseOptions, origin: LA });
    expect(link).toContain("origin=34.0522%2C-118.2437");
  });

  it("includes destination with lat,lon ordering", () => {
    const link = generateGoogleMapsLink(baseOptions);
    expect(link).toContain("destination=40.7484%2C-73.9857");
  });
});

// ---------------------------------------------------------------------------
// Waze
// ---------------------------------------------------------------------------

describe("generateWazeLink", () => {
  it("generates waze.com URL", () => {
    const link = generateWazeLink(baseOptions);
    expect(link).toMatch(/^https:\/\/waze\.com\/ul\?/);
  });

  it("sets ll=lat,lon (not lon,lat)", () => {
    const link = generateWazeLink(baseOptions);
    expect(link).toContain("ll=40.7484%2C-73.9857");
  });

  it("sets navigate=yes", () => {
    const link = generateWazeLink(baseOptions);
    expect(link).toContain("navigate=yes");
  });

  it("ignores mode (always driving)", () => {
    const walkLink = generateWazeLink({ ...baseOptions, mode: "walking" });
    const driveLink = generateWazeLink({ ...baseOptions, mode: "driving" });
    // Both produce same output since Waze ignores mode
    expect(walkLink).toBe(driveLink);
  });
});

// ---------------------------------------------------------------------------
// Platform dispatcher
// ---------------------------------------------------------------------------

describe("generateNavLink", () => {
  it("returns Apple Maps link for ios", () => {
    const link = generateNavLink(baseOptions, "ios");
    expect(link).toMatch(/^maps:\/\//);
  });

  it("returns Google Maps link for android", () => {
    const link = generateNavLink(baseOptions, "android");
    expect(link).toMatch(/^https:\/\/www\.google\.com/);
  });

  it("returns Google Maps link for web", () => {
    const link = generateNavLink(baseOptions, "web");
    expect(link).toMatch(/^https:\/\/www\.google\.com/);
  });
});

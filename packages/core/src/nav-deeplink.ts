import { z } from "zod";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export const NavPlatformSchema = z.enum(["ios", "android", "web"]);
export type NavPlatform = z.infer<typeof NavPlatformSchema>;

export const NavModeSchema = z.enum(["driving", "walking", "cycling"]);
export type NavMode = z.infer<typeof NavModeSchema>;

export const NavDeeplinkOptionsSchema = z.object({
  origin: z.tuple([z.number(), z.number()]).optional(), // [lon, lat]
  destination: z.tuple([z.number(), z.number()]),        // [lon, lat]
  mode: NavModeSchema,
  label: z.string().optional(),
});

export type NavDeeplinkOptions = z.infer<typeof NavDeeplinkOptionsSchema>;

// ---------------------------------------------------------------------------
// Apple Maps
// ---------------------------------------------------------------------------

const APPLE_DIR_FLAGS: Record<NavMode, string> = {
  driving: "d",
  walking: "w",
  cycling: "w", // Apple Maps has no cycling mode — fall back to walking
};

export function generateAppleMapsLink(options: NavDeeplinkOptions): string {
  const { origin, destination, mode, label } = options;
  const [dLon, dLat] = destination;

  const params = new URLSearchParams();
  params.set("daddr", `${dLat},${dLon}`);
  params.set("dirflg", APPLE_DIR_FLAGS[mode]);

  if (origin) {
    const [oLon, oLat] = origin;
    params.set("saddr", `${oLat},${oLon}`);
  }

  if (label) {
    params.set("daddr", `${dLat},${dLon}(${label})`);
  }

  return `maps://?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Google Maps
// ---------------------------------------------------------------------------

const GOOGLE_TRAVEL_MODES: Record<NavMode, string> = {
  driving: "driving",
  walking: "walking",
  cycling: "bicycling",
};

export function generateGoogleMapsLink(options: NavDeeplinkOptions): string {
  const { origin, destination, mode } = options;
  const [dLon, dLat] = destination;

  const params = new URLSearchParams();
  params.set("api", "1");
  params.set("destination", `${dLat},${dLon}`);
  params.set("travelmode", GOOGLE_TRAVEL_MODES[mode]);

  if (origin) {
    const [oLon, oLat] = origin;
    params.set("origin", `${oLat},${oLon}`);
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Waze
// ---------------------------------------------------------------------------

export function generateWazeLink(options: NavDeeplinkOptions): string {
  const { destination } = options;
  const [dLon, dLat] = destination;

  const params = new URLSearchParams();
  params.set("ll", `${dLat},${dLon}`);
  params.set("navigate", "yes");

  return `https://waze.com/ul?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Platform dispatcher
// ---------------------------------------------------------------------------

export function generateNavLink(
  options: NavDeeplinkOptions,
  platform: NavPlatform,
): string {
  switch (platform) {
    case "ios":
      return generateAppleMapsLink(options);
    case "android":
    case "web":
      return generateGoogleMapsLink(options);
  }
}

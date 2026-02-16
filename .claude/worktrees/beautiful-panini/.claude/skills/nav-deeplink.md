# Skill: nav-deeplink

## Purpose

Generate deep links to open native navigation apps (Apple Maps, Google Maps, Waze) for turn-by-turn directions to a destination.

## When to Use

Use this skill whenever:
- Implementing the "Navigate" button on a place detail view
- Building navigation launch logic in the mobile app
- Adding navigation links in the web app

## Supported Providers

### Apple Maps

```
https://maps.apple.com/?daddr={lat},{lon}&dirflg={mode}
```

Mode flags:
- `d` = driving
- `w` = walking

### Google Maps

```
https://www.google.com/maps/dir/?api=1&destination={lat},{lon}&travelmode={mode}
```

Mode values:
- `driving`
- `walking`
- `bicycling`

### Waze

```
https://waze.com/ul?ll={lat},{lon}&navigate=yes
```

Waze only supports driving — no mode parameter needed.

## Implementation Pattern

```ts
type TravelMode = "driving" | "walking" | "cycling";

interface NavDeeplinkInput {
  lat: number;
  lon: number;
  mode: TravelMode;
  label?: string; // optional place name
}

type NavProvider = "apple" | "google" | "waze";

function buildNavDeeplink(input: NavDeeplinkInput, provider: NavProvider): string {
  const { lat, lon, mode, label } = input;

  switch (provider) {
    case "apple": {
      const flag = mode === "walking" ? "w" : "d";
      const url = `https://maps.apple.com/?daddr=${lat},${lon}&dirflg=${flag}`;
      return label ? `${url}&q=${encodeURIComponent(label)}` : url;
    }
    case "google": {
      const gMode = mode === "cycling" ? "bicycling" : mode;
      return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=${gMode}`;
    }
    case "waze":
      return `https://waze.com/ul?ll=${lat},${lon}&navigate=yes`;
  }
}
```

## Platform Detection (Mobile)

In React Native, detect the platform to choose the default provider:

```ts
import { Platform, Linking } from "react-native";

function getDefaultNavProvider(): NavProvider {
  return Platform.OS === "ios" ? "apple" : "google";
}

async function openNavigation(input: NavDeeplinkInput, provider?: NavProvider): Promise<void> {
  const target = provider ?? getDefaultNavProvider();
  const url = buildNavDeeplink(input, target);
  const supported = await Linking.canOpenURL(url);
  if (supported) {
    await Linking.openURL(url);
  } else {
    // Fallback to Google Maps (works as web URL on all platforms)
    await Linking.openURL(buildNavDeeplink(input, "google"));
  }
}
```

## Rules

- **Always pass `lat, lon` as numbers** — never swap the order. Deep link URLs use `{lat},{lon}` (note: this is lat-first, unlike GeoJSON which is lon-first).
- **Waze only supports driving** — if mode is walking/cycling, fall back to Google Maps.
- **Always URL-encode the label** if included in the URL.
- **Check `Linking.canOpenURL`** before attempting to open on mobile — the app may not be installed.
- **Provide a fallback** — Google Maps web URL works universally.
- **Never hardcode coordinates into UI** — always pass from the Place domain model.
- Input types should reference `Place` from `packages/core/src/types.ts` where possible.

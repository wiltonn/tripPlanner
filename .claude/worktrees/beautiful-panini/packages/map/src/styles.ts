export const MAP_STYLES = {
  streets: "mapbox://styles/mapbox/streets-v12",
  outdoors: "mapbox://styles/mapbox/outdoors-v12",
  light: "mapbox://styles/mapbox/light-v11",
  dark: "mapbox://styles/mapbox/dark-v11",
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
} as const;

export type MapStyleKey = keyof typeof MAP_STYLES;

export const DEFAULT_MAP_STYLE = MAP_STYLES.streets;

export const DEFAULT_CENTER: [number, number] = [-74.006, 40.7128]; // NYC
export const DEFAULT_ZOOM = 12;

export const ROUTE_LINE_COLOR = "#3b82f6";
export const ROUTE_LINE_WIDTH = 4;
export const PLACE_MARKER_COLOR = "#ef4444";

/** Day-indexed route colors — matches web MapLayers */
export const DAY_COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"] as const;

export function dayColor(dayIndex: number): string {
  return DAY_COLORS[dayIndex % DAY_COLORS.length];
}

export const PLACE_MARKER_COLOR = "#ef4444";
export const ROUTE_OUTLINE_COLOR = "#1e3a5f";
export const SELECTED_GLOW_COLOR = "#fbbf24";
export const HOVER_GLOW_COLOR = "#ffffff";

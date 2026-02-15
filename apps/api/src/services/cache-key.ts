import type { DirectionsRequest } from "@trip-planner/core";

export function buildDirectionsCacheKey(req: DirectionsRequest): string {
  const coords = req.coordinates
    .map(([lon, lat]) => `${lon.toFixed(5)},${lat.toFixed(5)}`)
    .join(";");

  const avoidFlags: string[] = [];
  if (req.avoid) {
    if (req.avoid.ferries) avoidFlags.push("ferries");
    if (req.avoid.highways) avoidFlags.push("highways");
    if (req.avoid.tolls) avoidFlags.push("tolls");
  }

  let key = `profile:${req.profile}|coords:${coords}|alt:${req.alternatives}`;
  if (avoidFlags.length > 0) {
    key += `|avoid:${avoidFlags.join(",")}`;
  }
  return key;
}

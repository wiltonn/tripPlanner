import type { MapboxDirectionsResponse } from "@trip-planner/map";

// Re-export a fixture compatible with the richer MapboxDirectionsResponse
// type from packages/map/src/normalize.ts (includes name, maneuver, summary, weight, etc.)
export function makeMockMapboxResponse(): MapboxDirectionsResponse {
  return {
    code: "Ok",
    waypoints: [
      { location: [-122.4194, 37.7749], name: "Origin St" },
      { location: [-122.3994, 37.7949], name: "Destination Ave" },
    ],
    routes: [
      {
        geometry: {
          type: "LineString",
          coordinates: [
            [-122.4194, 37.7749],
            [-122.4094, 37.7849],
            [-122.3994, 37.7949],
          ],
        },
        distance: 5000,
        duration: 600,
        weight: 650,
        weight_name: "routability",
        legs: [
          {
            distance: 5000,
            duration: 600,
            summary: "Main St, Broadway",
            steps: [
              {
                geometry: {
                  type: "LineString",
                  coordinates: [
                    [-122.4194, 37.7749],
                    [-122.4094, 37.7849],
                  ],
                },
                distance: 2500,
                duration: 300,
                name: "Main St",
                maneuver: { type: "depart", instruction: "Head north" },
              },
              {
                geometry: {
                  type: "LineString",
                  coordinates: [
                    [-122.4094, 37.7849],
                    [-122.3994, 37.7949],
                  ],
                },
                distance: 2500,
                duration: 300,
                name: "Broadway",
                maneuver: { type: "turn", instruction: "Turn right" },
              },
            ],
          },
        ],
      },
    ],
  };
}

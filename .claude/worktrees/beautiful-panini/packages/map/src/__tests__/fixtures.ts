import type { MapboxDirectionsResponse } from "../normalize";

export function makeMockMapboxResponse(
  overrides: Partial<MapboxDirectionsResponse> = {}
): MapboxDirectionsResponse {
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
    ...overrides,
  };
}

export function makeTwoAlternativeResponse(): MapboxDirectionsResponse {
  const base = makeMockMapboxResponse();
  base.routes.push({
    geometry: {
      type: "LineString",
      coordinates: [
        [-122.4194, 37.7749],
        [-122.3894, 37.8049],
      ],
    },
    distance: 6000,
    duration: 720,
    weight: 780,
    weight_name: "routability",
    legs: [
      {
        distance: 6000,
        duration: 720,
        summary: "Highway 101",
        steps: [
          {
            geometry: {
              type: "LineString",
              coordinates: [
                [-122.4194, 37.7749],
                [-122.3894, 37.8049],
              ],
            },
            distance: 6000,
            duration: 720,
            name: "Highway 101",
            maneuver: { type: "depart", instruction: "Head north on Highway 101" },
          },
        ],
      },
    ],
  });
  return base;
}

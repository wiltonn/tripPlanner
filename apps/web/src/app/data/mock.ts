import {
  normalizeDirections,
  createPoint,
  createFeature,
  createFeatureCollection,
  type MapboxDirectionsResponse,
  type NormalizedDirections,
  type GeoJSONFeatureCollection,
} from "@trip-planner/map";

// ---------------------------------------------------------------------------
// Mock Places — 2-day NYC trip
// ---------------------------------------------------------------------------

const DAY_1_PLACES = [
  { id: "p1", name: "Central Park", category: "park", lng: -73.9654, lat: 40.7829 },
  { id: "p2", name: "The Met Museum", category: "museum", lng: -73.9632, lat: 40.7794 },
  { id: "p3", name: "Times Square", category: "landmark", lng: -73.9855, lat: 40.758 },
];

const DAY_2_PLACES = [
  { id: "p4", name: "Brooklyn Bridge", category: "landmark", lng: -73.9969, lat: 40.7061 },
  { id: "p5", name: "DUMBO", category: "neighborhood", lng: -73.9884, lat: 40.7033 },
  { id: "p6", name: "Prospect Park", category: "park", lng: -73.9712, lat: 40.6602 },
];

function buildPlacesFC(
  places: typeof DAY_1_PLACES,
  dayIndex: number
): GeoJSONFeatureCollection {
  return createFeatureCollection(
    places.map((p) =>
      createFeature(createPoint(p.lng, p.lat), {
        id: p.id,
        name: p.name,
        category: p.category,
        dayIndex,
      })
    )
  );
}

export const placesFC: GeoJSONFeatureCollection = createFeatureCollection([
  ...buildPlacesFC(DAY_1_PLACES, 0).features,
  ...buildPlacesFC(DAY_2_PLACES, 1).features,
]);

// ---------------------------------------------------------------------------
// Mock Directions Responses
// ---------------------------------------------------------------------------

type LegInput = {
  steps: Array<{ coordinates: [number, number][]; distance: number; duration: number; name: string }>;
  distance: number;
  duration: number;
};

function buildRoute(legs: LegInput[]) {
  const allCoords = legs.flatMap((l) => l.steps.flatMap((s) => s.coordinates));
  return {
    geometry: { type: "LineString" as const, coordinates: allCoords },
    legs: legs.map((l) => ({
      steps: l.steps.map((s) => ({
        geometry: { type: "LineString" as const, coordinates: s.coordinates },
        distance: s.distance,
        duration: s.duration,
        name: s.name,
        maneuver: { type: "turn" },
      })),
      distance: l.distance,
      duration: l.duration,
      summary: "",
    })),
    distance: legs.reduce((a, l) => a + l.distance, 0),
    duration: legs.reduce((a, l) => a + l.duration, 0),
    weight: 0,
    weight_name: "routability",
  };
}

function mockDirectionsResponse(
  ...routeLegs: LegInput[][]
): MapboxDirectionsResponse {
  return {
    routes: routeLegs.map((legs) => buildRoute(legs)),
    waypoints: [],
    code: "Ok",
  };
}

// Day 1: Central Park → Met → Times Square
const day1Response = mockDirectionsResponse(
  // Route 0 — fastest
  [
    {
      steps: [
        {
          coordinates: [[-73.9654, 40.7829], [-73.9648, 40.7815], [-73.9632, 40.7794]],
          distance: 420, duration: 320, name: "5th Ave",
        },
        {
          coordinates: [[-73.9632, 40.7794], [-73.9635, 40.7790]],
          distance: 50, duration: 40, name: "82nd St",
        },
      ],
      distance: 470, duration: 360,
    },
    {
      steps: [
        {
          coordinates: [[-73.9632, 40.7794], [-73.9710, 40.7720], [-73.9780, 40.7650]],
          distance: 1800, duration: 900, name: "Broadway",
        },
        {
          coordinates: [[-73.9780, 40.7650], [-73.9820, 40.7610], [-73.9855, 40.758]],
          distance: 950, duration: 480, name: "7th Ave",
        },
      ],
      distance: 2750, duration: 1380,
    },
  ],
  // Route 1 — scenic alternative (longer via Park Ave)
  [
    {
      steps: [
        {
          coordinates: [[-73.9654, 40.7829], [-73.9620, 40.7810], [-73.9600, 40.7794]],
          distance: 520, duration: 400, name: "Park Ave",
        },
        {
          coordinates: [[-73.9600, 40.7794], [-73.9615, 40.7792]],
          distance: 60, duration: 45, name: "83rd St",
        },
      ],
      distance: 580, duration: 445,
    },
    {
      steps: [
        {
          coordinates: [[-73.9615, 40.7792], [-73.9680, 40.7740], [-73.9750, 40.7680]],
          distance: 2000, duration: 1050, name: "Madison Ave",
        },
        {
          coordinates: [[-73.9750, 40.7680], [-73.9810, 40.7630], [-73.9855, 40.758]],
          distance: 1100, duration: 560, name: "6th Ave",
        },
      ],
      distance: 3100, duration: 1610,
    },
  ]
);

// Day 2: Brooklyn Bridge → DUMBO → Prospect Park
const day2Response = mockDirectionsResponse(
  // Route 0 — fastest
  [
    {
      steps: [
        {
          coordinates: [[-73.9969, 40.7061], [-73.9940, 40.7050], [-73.9884, 40.7033]],
          distance: 800, duration: 600, name: "Washington St",
        },
      ],
      distance: 800, duration: 600,
    },
    {
      steps: [
        {
          coordinates: [[-73.9884, 40.7033], [-73.9850, 40.6950], [-73.9800, 40.6850]],
          distance: 2200, duration: 1100, name: "Flatbush Ave",
        },
        {
          coordinates: [[-73.9800, 40.6850], [-73.9760, 40.6750], [-73.9712, 40.6602]],
          distance: 3000, duration: 1500, name: "Ocean Ave",
        },
      ],
      distance: 5200, duration: 2600,
    },
  ],
  // Route 1 — avoid highways (longer via Atlantic Ave)
  [
    {
      steps: [
        {
          coordinates: [[-73.9969, 40.7061], [-73.9950, 40.7045], [-73.9900, 40.7035]],
          distance: 900, duration: 700, name: "Front St",
        },
      ],
      distance: 900, duration: 700,
    },
    {
      steps: [
        {
          coordinates: [[-73.9900, 40.7035], [-73.9870, 40.6960], [-73.9830, 40.6870]],
          distance: 2500, duration: 1300, name: "Atlantic Ave",
        },
        {
          coordinates: [[-73.9830, 40.6870], [-73.9780, 40.6730], [-73.9712, 40.6602]],
          distance: 3400, duration: 1700, name: "Prospect Park West",
        },
      ],
      distance: 5900, duration: 3000,
    },
  ]
);

// ---------------------------------------------------------------------------
// Normalized per-day data
// ---------------------------------------------------------------------------

export const day1Normalized: NormalizedDirections = normalizeDirections(day1Response, 0, "day0");
export const day2Normalized: NormalizedDirections = normalizeDirections(day2Response, 1, "day1");

export const dayData: NormalizedDirections[] = [day1Normalized, day2Normalized];

export const DAY_COUNT = 2;

import { describe, it, expect, vi } from "vitest";

// We test MapSources and MapLayers by capturing the calls they make to the
// Mapbox GL Map object. We use minimal mocks — no DOM or mapboxgl globals needed.

function createMockMap() {
  const sources: Array<{ id: string; config: Record<string, unknown> }> = [];
  const layers: Array<{ spec: Record<string, unknown> }> = [];

  return {
    addSource: vi.fn((id: string, config: Record<string, unknown>) => {
      sources.push({ id, config });
    }),
    addLayer: vi.fn((spec: Record<string, unknown>) => {
      layers.push({ spec });
    }),
    setPaintProperty: vi.fn(),
    setFilter: vi.fn(),
    sources,
    layers,
  };
}

// We import the functions dynamically to avoid requiring mapbox-gl types at load time.
// The functions accept a Map-like object, so our mock satisfies the interface.

describe("mapbox-layer-compose: source naming", () => {
  it("places source is named 'places' with cluster: true", async () => {
    const { addPlacesSource } = await import(
      "../../../../apps/web/src/components/MapSources"
    );
    const map = createMockMap();
    const fc = { type: "FeatureCollection", features: [] };

    addPlacesSource(map as unknown as Parameters<typeof addPlacesSource>[0], fc as never);

    expect(map.addSource).toHaveBeenCalledTimes(1);
    expect(map.sources[0].id).toBe("places");
    expect(map.sources[0].config.cluster).toBe(true);
  });

  it("route day sources follow 'route-day-{index}' pattern with promoteId: 'id'", async () => {
    const { addRouteDaySources } = await import(
      "../../../../apps/web/src/components/MapSources"
    );
    const map = createMockMap();
    const day0 = { type: "FeatureCollection", features: [] };
    const day1 = { type: "FeatureCollection", features: [] };

    addRouteDaySources(
      map as unknown as Parameters<typeof addRouteDaySources>[0],
      [day0, day1] as never[]
    );

    expect(map.addSource).toHaveBeenCalledTimes(2);
    expect(map.sources[0].id).toBe("route-day-0");
    expect(map.sources[1].id).toBe("route-day-1");
    expect(map.sources[0].config.promoteId).toBe("id");
    expect(map.sources[1].config.promoteId).toBe("id");
  });
});

describe("mapbox-layer-compose: layer structure", () => {
  it("creates 4 layers per day (other, outline, base, active)", async () => {
    const { addRouteLayers } = await import(
      "../../../../apps/web/src/components/MapLayers"
    );
    const map = createMockMap();

    addRouteLayers(
      map as unknown as Parameters<typeof addRouteLayers>[0],
      2,
      0
    );

    // 2 days * 4 layers each = 8 layers
    expect(map.addLayer).toHaveBeenCalledTimes(8);

    // Verify naming pattern
    const layerIds = map.layers.map((l) => (l.spec as { id: string }).id);
    expect(layerIds).toContain("route-day-0-other");
    expect(layerIds).toContain("route-day-0-outline");
    expect(layerIds).toContain("route-day-0-base");
    expect(layerIds).toContain("route-day-0-active");
    expect(layerIds).toContain("route-day-1-other");
    expect(layerIds).toContain("route-day-1-outline");
    expect(layerIds).toContain("route-day-1-base");
    expect(layerIds).toContain("route-day-1-active");
  });

  it("base and active layers use feature-state for hover", async () => {
    const { addRouteLayers } = await import(
      "../../../../apps/web/src/components/MapLayers"
    );
    const map = createMockMap();

    addRouteLayers(
      map as unknown as Parameters<typeof addRouteLayers>[0],
      1,
      0
    );

    const basePaint = (
      map.layers.find(
        (l) => (l.spec as { id: string }).id === "route-day-0-base"
      )?.spec as { paint: Record<string, unknown> }
    ).paint;

    const activePaint = (
      map.layers.find(
        (l) => (l.spec as { id: string }).id === "route-day-0-active"
      )?.spec as { paint: Record<string, unknown> }
    ).paint;

    // Both layers should reference feature-state in their paint expressions
    const baseWidth = JSON.stringify(basePaint["line-width"]);
    const activeOpacity = JSON.stringify(activePaint["line-opacity"]);
    expect(baseWidth).toContain("feature-state");
    expect(activeOpacity).toContain("feature-state");
  });

  it("other layer filters non-selected alternatives", async () => {
    const { addRouteLayers } = await import(
      "../../../../apps/web/src/components/MapLayers"
    );
    const map = createMockMap();

    addRouteLayers(
      map as unknown as Parameters<typeof addRouteLayers>[0],
      1,
      0,
      { 0: 0 }
    );

    const otherLayer = map.layers.find(
      (l) => (l.spec as { id: string }).id === "route-day-0-other"
    )?.spec as { filter: unknown[] };

    // Should filter for altId != selected
    const filterStr = JSON.stringify(otherLayer.filter);
    expect(filterStr).toContain("!=");
    expect(filterStr).toContain("altId");
  });

  it("base layer line-width expression references 'selected' feature-state", async () => {
    const { addRouteLayers } = await import(
      "../../../../apps/web/src/components/MapLayers"
    );
    const map = createMockMap();

    addRouteLayers(
      map as unknown as Parameters<typeof addRouteLayers>[0],
      1,
      0
    );

    const basePaint = (
      map.layers.find(
        (l) => (l.spec as { id: string }).id === "route-day-0-base"
      )?.spec as { paint: Record<string, unknown> }
    ).paint;

    const baseWidth = JSON.stringify(basePaint["line-width"]);
    expect(baseWidth).toContain("selected");
    expect(baseWidth).toContain("feature-state");
  });

  it("updateSelectedAlt updates filters on all 4 layer types", async () => {
    const { updateSelectedAlt } = await import(
      "../../../../apps/web/src/components/MapLayers"
    );
    const map = createMockMap();

    updateSelectedAlt(
      map as unknown as Parameters<typeof updateSelectedAlt>[0],
      2,
      { 0: 1, 1: 0 }
    );

    // 4 layers per day * 2 days = 8 setFilter calls
    expect(map.setFilter).toHaveBeenCalledTimes(8);
  });
});

import * as SQLite from "expo-sqlite";

// ---------------------------------------------------------------------------
// Database Initialization
// ---------------------------------------------------------------------------

let db: SQLite.SQLiteDatabase | null = null;

export async function initDatabase(): Promise<void> {
  db = await SQLite.openDatabaseAsync("trip-planner.db");

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS day_directions (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      day_index INTEGER NOT NULL,
      lines TEXT NOT NULL,
      segments TEXT NOT NULL,
      bbox TEXT NOT NULL,
      summary TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trip_places (
      trip_id TEXT PRIMARY KEY,
      geojson TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS offline_packs (
      name TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      day_index INTEGER NOT NULL,
      bounds TEXT NOT NULL,
      min_zoom INTEGER NOT NULL,
      max_zoom INTEGER NOT NULL,
      estimated_tiles INTEGER NOT NULL,
      estimated_size_mb REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      progress REAL NOT NULL DEFAULT 0,
      completed_size_bytes INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);
}

function getDb(): SQLite.SQLiteDatabase {
  if (!db) throw new Error("Database not initialized. Call initDatabase() first.");
  return db;
}

// ---------------------------------------------------------------------------
// Trip CRUD
// ---------------------------------------------------------------------------

export async function saveTrip(id: string, data: object): Promise<void> {
  const database = getDb();
  await database.runAsync(
    `INSERT OR REPLACE INTO trips (id, data, updated_at) VALUES (?, ?, ?)`,
    id,
    JSON.stringify(data),
    Date.now(),
  );
}

export async function loadTrip(id: string): Promise<object | null> {
  const database = getDb();
  const row = await database.getFirstAsync<{ data: string }>(
    `SELECT data FROM trips WHERE id = ?`,
    id,
  );
  return row ? JSON.parse(row.data) : null;
}

export async function deleteTrip(id: string): Promise<void> {
  const database = getDb();
  await database.runAsync(`DELETE FROM trips WHERE id = ?`, id);
  await database.runAsync(`DELETE FROM day_directions WHERE trip_id = ?`, id);
  await database.runAsync(`DELETE FROM trip_places WHERE trip_id = ?`, id);
  await database.runAsync(`DELETE FROM offline_packs WHERE trip_id = ?`, id);
}

// ---------------------------------------------------------------------------
// Day Directions (GeoJSON per day)
// ---------------------------------------------------------------------------

interface DayDirectionsRow {
  lines: string;
  segments: string;
  bbox: string;
  summary: string;
}

export interface StoredDayDirections {
  lines: object;
  segments: object;
  bbox: number[];
  summary: object[];
}

export async function saveDayDirections(
  tripId: string,
  dayIndex: number,
  data: StoredDayDirections,
): Promise<void> {
  const database = getDb();
  const id = `${tripId}:${dayIndex}`;
  await database.runAsync(
    `INSERT OR REPLACE INTO day_directions (id, trip_id, day_index, lines, segments, bbox, summary, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    tripId,
    dayIndex,
    JSON.stringify(data.lines),
    JSON.stringify(data.segments),
    JSON.stringify(data.bbox),
    JSON.stringify(data.summary),
    Date.now(),
  );
}

export async function loadDayDirections(
  tripId: string,
  dayIndex: number,
): Promise<StoredDayDirections | null> {
  const database = getDb();
  const id = `${tripId}:${dayIndex}`;
  const row = await database.getFirstAsync<DayDirectionsRow>(
    `SELECT lines, segments, bbox, summary FROM day_directions WHERE id = ?`,
    id,
  );
  if (!row) return null;
  return {
    lines: JSON.parse(row.lines),
    segments: JSON.parse(row.segments),
    bbox: JSON.parse(row.bbox),
    summary: JSON.parse(row.summary),
  };
}

export async function loadAllDayDirections(
  tripId: string,
): Promise<Map<number, StoredDayDirections>> {
  const database = getDb();
  const rows = await database.getAllAsync<DayDirectionsRow & { day_index: number }>(
    `SELECT day_index, lines, segments, bbox, summary FROM day_directions WHERE trip_id = ? ORDER BY day_index`,
    tripId,
  );
  const result = new Map<number, StoredDayDirections>();
  for (const row of rows) {
    result.set(row.day_index, {
      lines: JSON.parse(row.lines),
      segments: JSON.parse(row.segments),
      bbox: JSON.parse(row.bbox),
      summary: JSON.parse(row.summary),
    });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Places (FeatureCollection)
// ---------------------------------------------------------------------------

export async function savePlaces(tripId: string, geojson: object): Promise<void> {
  const database = getDb();
  await database.runAsync(
    `INSERT OR REPLACE INTO trip_places (trip_id, geojson, updated_at) VALUES (?, ?, ?)`,
    tripId,
    JSON.stringify(geojson),
    Date.now(),
  );
}

export async function loadPlaces(tripId: string): Promise<object | null> {
  const database = getDb();
  const row = await database.getFirstAsync<{ geojson: string }>(
    `SELECT geojson FROM trip_places WHERE trip_id = ?`,
    tripId,
  );
  return row ? JSON.parse(row.geojson) : null;
}

// ---------------------------------------------------------------------------
// Offline Pack Metadata
// ---------------------------------------------------------------------------

export interface PackMeta {
  name: string;
  tripId: string;
  dayIndex: number;
  bounds: string;
  minZoom: number;
  maxZoom: number;
  estimatedTiles: number;
  estimatedSizeMB: number;
  status: "pending" | "downloading" | "complete" | "error";
  progress: number;
  completedSizeBytes: number;
  createdAt: number;
}

export async function savePackMeta(meta: PackMeta): Promise<void> {
  const database = getDb();
  await database.runAsync(
    `INSERT OR REPLACE INTO offline_packs
     (name, trip_id, day_index, bounds, min_zoom, max_zoom, estimated_tiles, estimated_size_mb, status, progress, completed_size_bytes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    meta.name,
    meta.tripId,
    meta.dayIndex,
    meta.bounds,
    meta.minZoom,
    meta.maxZoom,
    meta.estimatedTiles,
    meta.estimatedSizeMB,
    meta.status,
    meta.progress,
    meta.completedSizeBytes,
    meta.createdAt,
  );
}

export async function loadPackMeta(name: string): Promise<PackMeta | null> {
  const database = getDb();
  const row = await database.getFirstAsync<{
    name: string;
    trip_id: string;
    day_index: number;
    bounds: string;
    min_zoom: number;
    max_zoom: number;
    estimated_tiles: number;
    estimated_size_mb: number;
    status: string;
    progress: number;
    completed_size_bytes: number;
    created_at: number;
  }>(`SELECT * FROM offline_packs WHERE name = ?`, name);

  if (!row) return null;
  return {
    name: row.name,
    tripId: row.trip_id,
    dayIndex: row.day_index,
    bounds: row.bounds,
    minZoom: row.min_zoom,
    maxZoom: row.max_zoom,
    estimatedTiles: row.estimated_tiles,
    estimatedSizeMB: row.estimated_size_mb,
    status: row.status as PackMeta["status"],
    progress: row.progress,
    completedSizeBytes: row.completed_size_bytes,
    createdAt: row.created_at,
  };
}

export async function loadTripPacks(tripId: string): Promise<PackMeta[]> {
  const database = getDb();
  const rows = await database.getAllAsync<{
    name: string;
    trip_id: string;
    day_index: number;
    bounds: string;
    min_zoom: number;
    max_zoom: number;
    estimated_tiles: number;
    estimated_size_mb: number;
    status: string;
    progress: number;
    completed_size_bytes: number;
    created_at: number;
  }>(`SELECT * FROM offline_packs WHERE trip_id = ? ORDER BY day_index`, tripId);

  return rows.map((row) => ({
    name: row.name,
    tripId: row.trip_id,
    dayIndex: row.day_index,
    bounds: row.bounds,
    minZoom: row.min_zoom,
    maxZoom: row.max_zoom,
    estimatedTiles: row.estimated_tiles,
    estimatedSizeMB: row.estimated_size_mb,
    status: row.status as PackMeta["status"],
    progress: row.progress,
    completedSizeBytes: row.completed_size_bytes,
    createdAt: row.created_at,
  }));
}

export async function updatePackStatus(
  name: string,
  status: PackMeta["status"],
  progress: number = 0,
  completedSizeBytes: number = 0,
): Promise<void> {
  const database = getDb();
  await database.runAsync(
    `UPDATE offline_packs SET status = ?, progress = ?, completed_size_bytes = ? WHERE name = ?`,
    status,
    progress,
    completedSizeBytes,
    name,
  );
}

export async function deleteTripPackMeta(tripId: string): Promise<void> {
  const database = getDb();
  await database.runAsync(`DELETE FROM offline_packs WHERE trip_id = ?`, tripId);
}

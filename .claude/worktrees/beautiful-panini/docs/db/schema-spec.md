# Database Schema Specification

## Overview

Multi-tenant Supabase PostgreSQL schema with Row-Level Security (RLS).
All data is scoped to organizations; users access data through org membership.

## Enum Types

| Enum | Values |
|------|--------|
| `org_role` | `owner`, `admin`, `member` |
| `provenance` | `user-confirmed`, `user-entered`, `ai-proposed`, `system-derived` |
| `time_block` | `morning`, `afternoon`, `evening`, `flexible` |
| `activity_priority` | `must-do`, `nice-to-have`, `if-time` |

## Tables

### Tenant Core

#### `organizations`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| name | text | NOT NULL |
| created_at | timestamptz | NOT NULL, default now() |
| updated_at | timestamptz | NOT NULL, auto-updated |

#### `organization_members`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| organization_id | uuid | FK -> organizations, CASCADE |
| user_id | uuid | FK -> auth.users, CASCADE |
| role | org_role | NOT NULL, default 'member' |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

**Unique**: (organization_id, user_id)

### Domain Tables

All domain tables include `organization_id uuid NOT NULL FK -> organizations ON DELETE CASCADE`.

#### `trips`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| organization_id | uuid | FK |
| name | text | NOT NULL |
| description | text | nullable |
| start_date | date | NOT NULL |
| end_date | date | NOT NULL |

#### `day_plans`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| trip_id | uuid | FK -> trips, CASCADE |
| date | date | NOT NULL |
| day_number | int | > 0 |
| notes | text | nullable |

#### `places`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| day_plan_id | uuid | FK -> day_plans, CASCADE |
| name | text | NOT NULL |
| lat | double precision | -90 to 90 |
| lng | double precision | -180 to 180 |
| address | text | nullable |
| category | text | nullable |
| sort_order | int | >= 0 |

#### `routes`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| day_plan_id | uuid | FK -> day_plans, CASCADE |
| origin_place_id | uuid | FK -> places |
| dest_place_id | uuid | FK -> places |
| selected_alternative_id | uuid | FK -> route_alternatives, UNIQUE |

#### `route_alternatives`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| route_id | uuid | FK -> routes, CASCADE |
| label | text | nullable |
| geometry | jsonb | NOT NULL |
| distance_meters | double precision | >= 0 |
| duration_seconds | double precision | >= 0 |
| provider | text | NOT NULL |

### PlanContext Tables

#### JSONB Tracked\<T\> Convention
Tracked columns store provenance-wrapped values:
```json
{
  "value": <actual_value>,
  "provenance": "user-entered",
  "updatedAt": "2024-01-15T10:30:00Z",
  "note": "optional context"
}
```

#### `trip_skeletons` (1:1 with trips)
name, start_date, end_date, arrival_airport, departure_airport, party_size, party_description — all JSONB Tracked, nullable.

#### `bases` (lodging)
name, location, nights, booked — JSONB Tracked NOT NULL. check_in, check_out, cost_per_night — JSONB Tracked nullable.

#### `activities`
name, location, priority — JSONB Tracked NOT NULL. day_index, time_block, duration, cost — JSONB Tracked nullable.

#### `drive_legs`
from_id, to_id — text NOT NULL (polymorphic refs). distance, duration, depart_by — JSONB Tracked nullable. route_geojson — jsonb nullable.

#### `day_schedules` (UNIQUE: trip_id, day_index)
day_index — int. base_id — FK -> bases (SET NULL). morning, afternoon, evening — jsonb arrays of activity IDs.

#### `budget_categories` (UNIQUE: trip_id, category)
category — text. estimated, actual — JSONB Tracked nullable.

#### `finalizations` (1:1 with trips)
emergency_contact — JSONB Tracked nullable. packing_list, offline_notes, confirmations — jsonb arrays.

## RLS Policy Matrix

### Organizations
| Operation | Access |
|-----------|--------|
| SELECT | org members |
| INSERT | any authenticated user |
| UPDATE | owner, admin |
| DELETE | owner only |

### Organization Members
| Operation | Access |
|-----------|--------|
| SELECT | org members |
| INSERT/UPDATE/DELETE | owner, admin |

### All Domain + PlanContext Tables
| Operation | Access |
|-----------|--------|
| SELECT | org members |
| INSERT | org members (WITH CHECK on org_id) |
| UPDATE | org members |
| DELETE | org members |

## RLS Helper Functions

- `is_org_member(org_id uuid) -> boolean`: Checks if `auth.uid()` is a member of the org. STABLE, SECURITY DEFINER.
- `get_org_role(org_id uuid) -> org_role`: Returns the user's role in the org. STABLE, SECURITY DEFINER.

## Index Strategy

### Membership (critical for RLS performance)
- `idx_org_members_user` — (user_id)
- `idx_org_members_org_user` — (organization_id, user_id)

### Tenant-Scoped Composites
Every domain/PlanContext table has: `idx_{table}_org` or `idx_{table}_org_{parent}` on (organization_id) or (organization_id, parent_fk).

## Cascade Delete Chain

```
organizations
  └─ organization_members (CASCADE)
  └─ trips (CASCADE)
      ├─ day_plans (CASCADE)
      │   ├─ places (CASCADE)
      │   └─ routes (CASCADE)
      │       └─ route_alternatives (CASCADE)
      ├─ trip_skeletons (CASCADE)
      ├─ bases (CASCADE)
      ├─ activities (CASCADE)
      ├─ drive_legs (CASCADE)
      ├─ day_schedules (CASCADE, base_id SET NULL)
      ├─ budget_categories (CASCADE)
      └─ finalizations (CASCADE)
```

## Triggers

- `update_updated_at()` — applied to all tables, updates `updated_at` on row modification.
- `auto_add_org_owner()` — after INSERT on organizations, auto-inserts creator as owner in organization_members.

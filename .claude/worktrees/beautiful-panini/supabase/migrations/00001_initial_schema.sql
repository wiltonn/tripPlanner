-- ==========================================================================
-- 00001_initial_schema.sql
-- Multi-tenant schema with RLS for trip planner
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1a. Enum Types
-- --------------------------------------------------------------------------

CREATE TYPE org_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE provenance AS ENUM ('user-confirmed', 'user-entered', 'ai-proposed', 'system-derived');
CREATE TYPE time_block AS ENUM ('morning', 'afternoon', 'evening', 'flexible');
CREATE TYPE activity_priority AS ENUM ('must-do', 'nice-to-have', 'if-time');

-- --------------------------------------------------------------------------
-- 1h. Reusable updated_at trigger function
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------------------------
-- 1b. Core Tenant Tables
-- --------------------------------------------------------------------------

CREATE TABLE organizations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE organization_members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            org_role NOT NULL DEFAULT 'member',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (organization_id, user_id)
);

CREATE TRIGGER trg_organization_members_updated_at
  BEFORE UPDATE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- --------------------------------------------------------------------------
-- 1c. Domain Tables (migrated from Prisma, now with organization_id)
-- --------------------------------------------------------------------------

CREATE TABLE trips (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  start_date      date NOT NULL,
  end_date        date NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE day_plans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  trip_id         uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  date            date NOT NULL,
  day_number      int NOT NULL CHECK (day_number > 0),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_day_plans_updated_at
  BEFORE UPDATE ON day_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE places (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  day_plan_id     uuid NOT NULL REFERENCES day_plans(id) ON DELETE CASCADE,
  name            text NOT NULL,
  lat             double precision NOT NULL CHECK (lat >= -90 AND lat <= 90),
  lng             double precision NOT NULL CHECK (lng >= -180 AND lng <= 180),
  address         text,
  category        text,
  sort_order      int NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_places_updated_at
  BEFORE UPDATE ON places
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE routes (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  day_plan_id             uuid NOT NULL REFERENCES day_plans(id) ON DELETE CASCADE,
  origin_place_id         uuid NOT NULL REFERENCES places(id),
  dest_place_id           uuid NOT NULL REFERENCES places(id),
  selected_alternative_id uuid UNIQUE,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_routes_updated_at
  BEFORE UPDATE ON routes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE route_alternatives (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  route_id         uuid NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  label            text,
  geometry         jsonb NOT NULL,
  distance_meters  double precision NOT NULL CHECK (distance_meters >= 0),
  duration_seconds double precision NOT NULL CHECK (duration_seconds >= 0),
  provider         text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_route_alternatives_updated_at
  BEFORE UPDATE ON route_alternatives
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add FK from routes.selected_alternative_id -> route_alternatives now that both tables exist
ALTER TABLE routes
  ADD CONSTRAINT fk_routes_selected_alternative
  FOREIGN KEY (selected_alternative_id) REFERENCES route_alternatives(id);

-- --------------------------------------------------------------------------
-- 1d. PlanContext Tables
-- --------------------------------------------------------------------------

-- JSONB Tracked<T> convention:
-- { "value": <actual>, "provenance": "user-entered", "updatedAt": "ISO8601", "note": "optional" }

CREATE TABLE trip_skeletons (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  trip_id             uuid NOT NULL UNIQUE REFERENCES trips(id) ON DELETE CASCADE,
  name                jsonb,  -- Tracked<string>
  start_date          jsonb,  -- Tracked<string>
  end_date            jsonb,  -- Tracked<string>
  arrival_airport     jsonb,  -- Tracked<string>
  departure_airport   jsonb,  -- Tracked<string>
  party_size          jsonb,  -- Tracked<number>
  party_description   jsonb,  -- Tracked<string>
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_trip_skeletons_updated_at
  BEFORE UPDATE ON trip_skeletons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE bases (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  trip_id         uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name            jsonb NOT NULL,  -- Tracked<string>
  location        jsonb NOT NULL,  -- Tracked<[lon, lat]>
  nights          jsonb NOT NULL,  -- Tracked<number>
  check_in        jsonb,           -- Tracked<string> | null
  check_out       jsonb,           -- Tracked<string> | null
  booked          jsonb NOT NULL,  -- Tracked<boolean>
  cost_per_night  jsonb,           -- Tracked<number> | null
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_bases_updated_at
  BEFORE UPDATE ON bases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE activities (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  trip_id         uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name            jsonb NOT NULL,  -- Tracked<string>
  location        jsonb NOT NULL,  -- Tracked<[lon, lat]>
  day_index       jsonb,           -- Tracked<number> | null
  time_block      jsonb,           -- Tracked<time_block> | null
  priority        jsonb NOT NULL,  -- Tracked<activity_priority>
  duration        jsonb,           -- Tracked<number> | null
  cost            jsonb,           -- Tracked<number> | null
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_activities_updated_at
  BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE drive_legs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  trip_id         uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  from_id         text NOT NULL,   -- polymorphic ref (base or activity ID)
  to_id           text NOT NULL,   -- polymorphic ref (base or activity ID)
  distance        jsonb,           -- Tracked<number> | null
  duration        jsonb,           -- Tracked<number> | null
  depart_by       jsonb,           -- Tracked<string> | null
  route_geojson   jsonb,           -- GeoJSON FeatureCollection | null
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_drive_legs_updated_at
  BEFORE UPDATE ON drive_legs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE day_schedules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  trip_id         uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  day_index       int NOT NULL CHECK (day_index >= 0),
  base_id         uuid REFERENCES bases(id) ON DELETE SET NULL,
  morning         jsonb NOT NULL DEFAULT '[]'::jsonb,   -- string[] (activity IDs)
  afternoon       jsonb NOT NULL DEFAULT '[]'::jsonb,   -- string[] (activity IDs)
  evening         jsonb NOT NULL DEFAULT '[]'::jsonb,   -- string[] (activity IDs)
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (trip_id, day_index)
);

CREATE TRIGGER trg_day_schedules_updated_at
  BEFORE UPDATE ON day_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE budget_categories (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  trip_id         uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  category        text NOT NULL,
  estimated       jsonb,  -- Tracked<number> | null
  actual          jsonb,  -- Tracked<number> | null
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (trip_id, category)
);

CREATE TRIGGER trg_budget_categories_updated_at
  BEFORE UPDATE ON budget_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE finalizations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  trip_id           uuid NOT NULL UNIQUE REFERENCES trips(id) ON DELETE CASCADE,
  emergency_contact jsonb,                              -- Tracked<string> | null
  packing_list      jsonb NOT NULL DEFAULT '[]'::jsonb, -- string[]
  offline_notes     jsonb NOT NULL DEFAULT '[]'::jsonb, -- string[]
  confirmations     jsonb NOT NULL DEFAULT '[]'::jsonb, -- string[]
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_finalizations_updated_at
  BEFORE UPDATE ON finalizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- --------------------------------------------------------------------------
-- 1f. RLS Helper Functions
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION is_org_member(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION get_org_role(org_id uuid)
RETURNS org_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM organization_members
  WHERE organization_id = org_id
    AND user_id = auth.uid();
$$;

-- --------------------------------------------------------------------------
-- 1g. Auto-Owner Trigger
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION auto_add_org_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (NEW.id, auth.uid(), 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_auto_add_org_owner
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION auto_add_org_owner();

-- ==========================================================================
-- Step 2: Enable RLS + Create Policies
-- ==========================================================================

-- --------------------------------------------------------------------------
-- Organizations
-- --------------------------------------------------------------------------

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_select" ON organizations
  FOR SELECT USING (is_org_member(id));

CREATE POLICY "org_insert" ON organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "org_update" ON organizations
  FOR UPDATE USING (get_org_role(id) IN ('owner', 'admin'));

CREATE POLICY "org_delete" ON organizations
  FOR DELETE USING (get_org_role(id) = 'owner');

-- --------------------------------------------------------------------------
-- Organization Members
-- --------------------------------------------------------------------------

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_select" ON organization_members
  FOR SELECT USING (is_org_member(organization_id));

CREATE POLICY "org_members_insert" ON organization_members
  FOR INSERT WITH CHECK (get_org_role(organization_id) IN ('owner', 'admin'));

CREATE POLICY "org_members_update" ON organization_members
  FOR UPDATE USING (get_org_role(organization_id) IN ('owner', 'admin'));

CREATE POLICY "org_members_delete" ON organization_members
  FOR DELETE USING (get_org_role(organization_id) IN ('owner', 'admin'));

-- --------------------------------------------------------------------------
-- Domain + PlanContext Tables: org member access
-- Applies to: trips, day_plans, places, routes, route_alternatives,
--             trip_skeletons, bases, activities, drive_legs,
--             day_schedules, budget_categories, finalizations
-- --------------------------------------------------------------------------

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'trips', 'day_plans', 'places', 'routes', 'route_alternatives',
    'trip_skeletons', 'bases', 'activities', 'drive_legs',
    'day_schedules', 'budget_categories', 'finalizations'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);

    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT USING (is_org_member(organization_id))',
      tbl || '_select', tbl
    );

    EXECUTE format(
      'CREATE POLICY %I ON %I FOR INSERT WITH CHECK (is_org_member(organization_id))',
      tbl || '_insert', tbl
    );

    EXECUTE format(
      'CREATE POLICY %I ON %I FOR UPDATE USING (is_org_member(organization_id))',
      tbl || '_update', tbl
    );

    EXECUTE format(
      'CREATE POLICY %I ON %I FOR DELETE USING (is_org_member(organization_id))',
      tbl || '_delete', tbl
    );
  END LOOP;
END $$;

-- ==========================================================================
-- Step 3: Indexes
-- ==========================================================================

-- Membership indexes (critical for RLS performance)
CREATE INDEX idx_org_members_user ON organization_members (user_id);
CREATE INDEX idx_org_members_org_user ON organization_members (organization_id, user_id);

-- Tenant-scoped composite indexes
CREATE INDEX idx_trips_org ON trips (organization_id);
CREATE INDEX idx_day_plans_org_trip ON day_plans (organization_id, trip_id);
CREATE INDEX idx_places_org_day_plan ON places (organization_id, day_plan_id);
CREATE INDEX idx_routes_org_day_plan ON routes (organization_id, day_plan_id);
CREATE INDEX idx_route_alts_org_route ON route_alternatives (organization_id, route_id);
CREATE INDEX idx_trip_skeletons_org_trip ON trip_skeletons (organization_id, trip_id);
CREATE INDEX idx_bases_org_trip ON bases (organization_id, trip_id);
CREATE INDEX idx_activities_org_trip ON activities (organization_id, trip_id);
CREATE INDEX idx_drive_legs_org_trip ON drive_legs (organization_id, trip_id);
CREATE INDEX idx_day_schedules_org_trip ON day_schedules (organization_id, trip_id);
CREATE INDEX idx_budget_categories_org_trip ON budget_categories (organization_id, trip_id);
CREATE INDEX idx_finalizations_org_trip ON finalizations (organization_id, trip_id);

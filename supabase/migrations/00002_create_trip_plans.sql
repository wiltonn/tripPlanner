-- --------------------------------------------------------------------------
-- 2. Trip Plans — personal (user_id scoped, not org-scoped)
-- --------------------------------------------------------------------------

CREATE TABLE trip_plans (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  destination text NOT NULL,
  nights      integer NOT NULL,
  travelers   text NOT NULL,
  airport     text NOT NULL,
  trip_style  text NOT NULL,
  budget      text NOT NULL,
  status      text NOT NULL DEFAULT 'draft',
  bases       jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_trip_plans_user_id ON trip_plans(user_id);

CREATE TRIGGER trg_trip_plans_updated_at
  BEFORE UPDATE ON trip_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- --------------------------------------------------------------------------
-- RLS
-- --------------------------------------------------------------------------

ALTER TABLE trip_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY trip_plans_select ON trip_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY trip_plans_insert ON trip_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY trip_plans_update ON trip_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY trip_plans_delete ON trip_plans
  FOR DELETE USING (auth.uid() = user_id);

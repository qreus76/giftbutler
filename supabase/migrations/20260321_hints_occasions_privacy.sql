-- 2026-03-21: Occasion-based lists + per-list privacy controls
--
-- Occasions are now list containers. Each has its own visibility setting.
-- Hints can belong to an occasion list (or stay in the general "Hints" list).
-- The "Hints" list visibility is controlled per-profile via hints_visibility.

-- Each occasion gets a visibility setting (default public — preserves existing behavior)
ALTER TABLE occasions
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'connections', 'private'));

-- Hints can now belong to a specific occasion list (null = general "Hints" list)
ALTER TABLE hints
  ADD COLUMN IF NOT EXISTS occasion_id uuid
    REFERENCES occasions(id) ON DELETE SET NULL;

-- Existing users: hints stay public (preserves current behavior)
-- New users will get connections-only by default (column default changed below)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS hints_visibility text DEFAULT 'public'
    CHECK (hints_visibility IN ('public', 'connections', 'private'));

-- New users get connections-only by default going forward
ALTER TABLE profiles
  ALTER COLUMN hints_visibility SET DEFAULT 'connections';

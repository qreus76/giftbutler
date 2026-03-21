-- Track username changes for redirect support and rate limiting

-- Add change timestamp to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS username_changed_at timestamptz;

-- History table: one row per username change
CREATE TABLE IF NOT EXISTS username_history (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null,
  old_username  text not null,
  changed_at    timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS username_history_old_username_idx ON username_history (old_username);
CREATE INDEX IF NOT EXISTS username_history_user_id_idx      ON username_history (user_id);

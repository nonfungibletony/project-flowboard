-- Boards table migration: add archived column
ALTER TABLE boards ADD COLUMN IF NOT EXISTS archived integer NOT NULL DEFAULT 0;

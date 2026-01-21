-- Add notify_advance_days to assets table
-- This allows per-asset customization of reminder schedule (e.g. [30, 7, 1])
-- If null, it falls back to the user's global profile setting or system default.
alter table assets add column if not exists notify_advance_days integer[];

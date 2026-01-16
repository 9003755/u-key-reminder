-- Add notification_enabled column to assets table
alter table assets add column if not exists notification_enabled boolean default true;

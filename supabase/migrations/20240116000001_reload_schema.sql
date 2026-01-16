-- Ensure all columns exist (double check)
alter table assets add column if not exists websites text[] default array[]::text[];
alter table assets add column if not exists notification_enabled boolean default true;
alter table assets add column if not exists images text[] default array[]::text[];

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';

alter table assets add column if not exists websites text[] default array[]::text[];

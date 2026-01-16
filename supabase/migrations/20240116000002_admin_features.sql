-- 1. Add is_admin to profiles
alter table profiles add column if not exists is_admin boolean default false;

-- 2. Create notification_logs table
create table if not exists notification_logs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  type text not null, -- 'email' or 'wechat'
  recipient text not null,
  asset_name text,
  status text not null, -- 'success' or 'failed'
  details jsonb
);

-- 3. Create login_logs table
create table if not exists login_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  login_at timestamp with time zone default timezone('utc'::text, now()) not null,
  ip_address text, -- Note: auth.users doesn't easily give IP in trigger, might need client side or just track time
  user_agent text
);

-- 4. Enable RLS
alter table notification_logs enable row level security;
alter table login_logs enable row level security;

-- 5. RLS Policies for Admin
-- Only admins can view all notification logs
create policy "Admins can view all notification logs"
  on notification_logs for select
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

-- Only admins can view all login logs
create policy "Admins can view all login logs"
  on login_logs for select
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

-- Only admins can view all profiles (to see user list)
create policy "Admins can view all profiles"
  on profiles for select
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

-- 6. Trigger to track logins
-- We track changes to last_sign_in_at in auth.users
create or replace function public.handle_auth_user_login()
returns trigger as $$
begin
  -- If last_sign_in_at changed, log it
  if old.last_sign_in_at is distinct from new.last_sign_in_at then
    insert into public.login_logs (user_id, login_at)
    values (new.id, new.last_sign_in_at);
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Drop if exists to avoid error on repeated runs
drop trigger if exists on_auth_user_login on auth.users;
create trigger on_auth_user_login
  after update on auth.users
  for each row execute procedure public.handle_auth_user_login();

-- 7. Grant access to service_role (for Edge Functions)
grant all on notification_logs to service_role;

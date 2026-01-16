-- Function to check if the current user is an admin
-- Security Definer means it runs with the privileges of the creator (postgres/superuser), bypassing RLS
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (
    select 1
    from profiles
    where id = auth.uid()
    and is_admin = true
  );
end;
$$;

-- Grant execute to everyone (authenticated)
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to service_role;

-- Update RLS policies to use this function (safer, avoids potential recursion if policy logic changes)
-- Drop old policy
drop policy if exists "Admins can view all profiles" on profiles;

-- Create new policy using the function
create policy "Admins can view all profiles"
  on profiles for select
  using (public.is_admin());

-- Also allow admins to view all logs
drop policy if exists "Admins can view all notification logs" on notification_logs;
create policy "Admins can view all notification logs"
  on notification_logs for select
  using (public.is_admin());

drop policy if exists "Admins can view all login logs" on login_logs;
create policy "Admins can view all login logs"
  on login_logs for select
  using (public.is_admin());

-- Function to get all users (id, email, created_at, last_sign_in_at)
-- Only accessible by admins via is_admin() check
create or replace function public.get_all_users()
returns table (
  id uuid,
  email text,
  created_at timestamp with time zone,
  last_sign_in_at timestamp with time zone
)
language plpgsql
security definer
as $$
begin
  -- Double check admin status
  if not public.is_admin() then
    raise exception 'Access Denied';
  end if;

  return query
  select 
    au.id, 
    au.email::text, 
    au.created_at, 
    au.last_sign_in_at
  from auth.users au
  order by au.created_at desc;
end;
$$;

grant execute on function public.get_all_users() to authenticated;
grant execute on function public.get_all_users() to service_role;

-- Ensure profile exists for all users (backfill if missing)
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- Force update specific user to admin (and everyone else for now as per previous logic)
update profiles set is_admin = true;

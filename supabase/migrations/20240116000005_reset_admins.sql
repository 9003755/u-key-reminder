-- 1. Create a dedicated admin user in auth.users
-- Note: We can't insert directly into auth.users easily due to password hashing.
-- Instead, we will use a Supabase Edge Function or just update the logic to check for a specific hardcoded email.
-- Or better, we create a migration to set ONLY the 'admin' user as admin.

-- First, reset everyone to NOT be admin
update profiles set is_admin = false;

-- Create a function to handle admin creation safely if possible, but standard SQL migration can't hash passwords like Supabase Auth.
-- So we will use a workaround:
-- We will assume you will register a NEW user with email 'admin@u-key.com' (or similar) manually or via script.
-- BUT, since you asked me to set it up:

-- PLAN:
-- 1. I cannot create a user with password '123456' directly via SQL because I don't have the hashing algorithm.
-- 2. I will write a script to use Supabase Admin API to create this user.
-- 3. Then I will set that user as admin.

-- For now, let's prepare the database to accept ONLY this specific user as admin once created.

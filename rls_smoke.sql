-- Manual RLS smoke test template for Supabase SQL editor / psql.
-- Replace UUIDs with two real auth.users IDs after creating User A and User B.
-- This is intentionally NOT part of the migration.

-- 1) User A should see their own profile/workspace rows.
-- set local role authenticated;
-- set local "request.jwt.claims" = '{"sub":"USER_A_UUID","role":"authenticated"}';
-- select * from public.profiles;
-- select * from public.workspaces;

-- 2) User B should NOT see User A's personal workspace/accounts unless explicitly added.
-- reset role;
-- set local role authenticated;
-- set local "request.jwt.claims" = '{"sub":"USER_B_UUID","role":"authenticated"}';
-- select * from public.workspaces where id = 'USER_A_WORKSPACE_UUID'; -- expect 0 rows
-- select * from public.accounts where workspace_id = 'USER_A_WORKSPACE_UUID'; -- expect 0 rows

-- 3) For stronger automated verification, run the equivalent assertions in a staging project
-- using two authenticated Supabase clients. See docs/SETUP_SUPABASE.md.

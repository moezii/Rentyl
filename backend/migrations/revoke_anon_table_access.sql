-- Migration: no direct table access for the public `anon` role
--
-- SUPERSEDES add_public_cars_policy.sql (policy cars_anon_select_available)
-- and the bookings_anon_insert policy from create_bookings_table.sql.
--
-- Why: the anon key is public by design. `cars_anon_select_available` let
-- anyone holding it query Supabase directly and read every column of every
-- available car (VIN, licence plate, internal IDs, company_id, ...), bypassing
-- the backend's field filtering; `bookings_anon_insert` let anyone insert
-- arbitrary booking rows (WITH CHECK (true)) without paying.
--
-- The backend now reads and writes with the service-role key (bypasses RLS)
-- and enforces tenant isolation itself (company_id filters on every
-- company-scoped query); public pages get their data only through the API
-- (e.g. GET /cars/public/available returns a whitelist of car fields). The
-- frontend does not use supabase-js. The anon key is only used for Supabase
-- Auth (sign-in, sign-up, password reset), which does not need table grants.
--
-- Requires SUPABASE_SERVICE_ROLE_KEY in the backend environment.

-- 1. Drop the permissive anon policies
DROP POLICY IF EXISTS cars_anon_select_available ON public.cars;
DROP POLICY IF EXISTS bookings_anon_insert ON public.bookings;

-- 2. Remove anon privileges on everything in the public schema (tables,
--    views - which run with their owner's rights and would bypass RLS - and
--    sequences), now and for objects created later.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;

-- 3. The availability RPC is called by the backend (service role) only.
--    Its signature is not in this repository, so revoke by name.
DO $$
DECLARE
    fn regprocedure;
BEGIN
    FOR fn IN
        SELECT p.oid::regprocedure
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'check_car_availability_secure'
    LOOP
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, PUBLIC', fn);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
    END LOOP;
END $$;

-- Check afterwards (should return no rows):
-- SELECT table_name, privilege_type FROM information_schema.role_table_grants
-- WHERE grantee = 'anon' AND table_schema = 'public';
-- SELECT policyname, tablename FROM pg_policies WHERE 'anon' = ANY (roles);

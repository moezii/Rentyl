-- SUPERSEDED by revoke_anon_table_access.sql, which drops this policy.
-- It exposed every column of available cars (VIN, plate, internal IDs) to
-- anyone with the public anon key. Kept unchanged below for history.

-- Add RLS policy to allow anonymous users to view available cars
-- This enables the public booking page to show all available cars from all companies

-- Create policy for anonymous (public) users to SELECT available cars
CREATE POLICY cars_anon_select_available ON public.cars
  FOR SELECT
  TO anon
  USING (status = 'available');

-- Add comment for documentation
COMMENT ON POLICY cars_anon_select_available ON public.cars IS 'Allows anonymous users to view available cars for the public booking page';

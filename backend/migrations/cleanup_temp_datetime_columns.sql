-- Cleanup: Remove temporary datetime columns from failed migration attempt
-- Date: 2025-12-08

-- These columns were created in the first migration attempt but are no longer needed
-- since we successfully altered the original columns to TIMESTAMP WITH TIME ZONE

ALTER TABLE public.rentalrecords 
DROP COLUMN IF EXISTS rental_start_datetime;

ALTER TABLE public.rentalrecords 
DROP COLUMN IF EXISTS rental_end_datetime;

-- Verification: Check that only the correct columns remain
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'rentalrecords' 
--   AND column_name LIKE '%date%';

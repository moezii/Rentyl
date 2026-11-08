-- Migration: Add client_id, rental_record_id, and rental dates to bookings table
-- Remove notes field
-- Date: 2025-11-15

-- Add new columns for client and rental record references (encrypted IDs)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS rental_record_id TEXT;

-- Add rental date columns
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS rental_start_date DATE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS rental_end_date DATE;

-- Drop notes column (if exists)
ALTER TABLE public.bookings DROP COLUMN IF EXISTS notes;

-- Add comments for new columns
COMMENT ON COLUMN public.bookings.client_id IS 'Reference to the client (encrypted ID)';
COMMENT ON COLUMN public.bookings.rental_record_id IS 'Reference to the rental record (encrypted ID)';
COMMENT ON COLUMN public.bookings.rental_start_date IS 'Start date of the rental period';
COMMENT ON COLUMN public.bookings.rental_end_date IS 'End date of the rental period';

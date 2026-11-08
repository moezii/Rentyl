-- Fix for "invalid input syntax for type integer" error during rental creation
-- This error occurs because rental_start_date and rental_end_date are now TIMESTAMPS.
-- Subtracting them yields an INTERVAL (e.g., "3 days"), which cannot be directly cast to INTEGER.
-- This migration replaces the broken trigger logic with correct Interval extraction logic.

-- 1. Attempt to clean up likely old trigger names
DROP TRIGGER IF EXISTS calculate_rental_days_trigger ON public.rentalrecords;
DROP TRIGGER IF EXISTS update_rental_days_trigger ON public.rentalrecords;
DROP TRIGGER IF EXISTS set_total_days_trigger ON public.rentalrecords;
DROP TRIGGER IF EXISTS calc_days_trigger ON public.rentalrecords;

-- 2. Create or Replace the function to correctly calculate days from timestamps
CREATE OR REPLACE FUNCTION calculate_rental_days()
RETURNS TRIGGER AS $$
BEGIN
    -- Only calculate if dates are present
    IF NEW.rental_start_date IS NOT NULL AND NEW.rental_end_date IS NOT NULL THEN
        -- Cast TIMESTAMP to DATE before subtraction to get integer days difference
        -- We add 1 because rentals include both start and end dates (inclusive logic)
        -- This matches the Python backend logic: (end_date - start_date).days + 1
        NEW.total_days := (NEW.rental_end_date::DATE - NEW.rental_start_date::DATE) + 1;
        
        -- Also ensure final_price is calculated if not provided (fallback)
        IF NEW.final_price IS NULL AND NEW.daily_rate IS NOT NULL THEN
            NEW.final_price := NEW.total_days * NEW.daily_rate + COALESCE(NEW.additional_charges, 0);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create the new trigger
CREATE TRIGGER calculate_rental_days_trigger
    BEFORE INSERT OR UPDATE ON public.rentalrecords
    FOR EACH ROW
    EXECUTE FUNCTION calculate_rental_days();

-- 4. Verification Code (Commented out)
-- UPDATE rentalrecords SET rental_end_date = rental_end_date WHERE rental_id = 'some-id';

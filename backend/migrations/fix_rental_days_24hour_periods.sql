-- Fix rental days calculation to use 24-hour periods instead of calendar days
-- This migration updates the database trigger to match the new business logic:
-- 1 day = 24 hours (e.g., 9 AM on day 1 to 9 AM on day 2 = 1 day)

-- Drop existing trigger
DROP TRIGGER IF EXISTS calculate_rental_days_trigger ON public.rentalrecords;

-- Create or Replace the function to correctly calculate days as 24-hour periods
CREATE OR REPLACE FUNCTION calculate_rental_days()
RETURNS TRIGGER AS $$
BEGIN
    -- Only calculate if dates are present
    IF NEW.rental_start_date IS NOT NULL AND NEW.rental_end_date IS NOT NULL THEN
        -- Cast TIMESTAMP to DATE before subtraction to get integer days difference
        -- NO +1: We use 24-hour periods (start 9 AM day 1, end 9 AM day 2 = 1 day)
        NEW.total_days := (NEW.rental_end_date::DATE - NEW.rental_start_date::DATE);
        
        -- Also ensure final_price is calculated if not provided (fallback)
        IF NEW.final_price IS NULL AND NEW.daily_rate IS NOT NULL THEN
            NEW.final_price := NEW.total_days * NEW.daily_rate + COALESCE(NEW.additional_charges, 0);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER calculate_rental_days_trigger
    BEFORE INSERT OR UPDATE ON public.rentalrecords
    FOR EACH ROW
    EXECUTE FUNCTION calculate_rental_days();

-- Update existing rentals to recalculate their total_days
-- This will fix any rentals that were created with the old +1 logic
UPDATE public.rentalrecords
SET total_days = (rental_end_date::DATE - rental_start_date::DATE)
WHERE rental_start_date IS NOT NULL AND rental_end_date IS NOT NULL;

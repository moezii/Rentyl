-- Comprehensive fix for ALL rental days calculations in database triggers
-- This updates BOTH trigger functions to use 24-hour periods instead of calendar days

-- Fix the calculate_rental_fields function (used by set_rental_fields trigger)
CREATE OR REPLACE FUNCTION public.calculate_rental_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  today DATE := CURRENT_DATE;
BEGIN
  -- total_days: Cast TIMESTAMP to DATE before subtraction to get integer
  -- NO +1: We use 24-hour periods (start 9 AM day 1, end 9 AM day 2 = 1 day)
  NEW.total_days := (NEW.rental_end_date::DATE - NEW.rental_start_date::DATE);

  -- final_price
  NEW.final_price := (
    COALESCE(NEW.daily_rate, 0) * COALESCE(NEW.total_days, 0)
  ) + COALESCE(NEW.additional_charges, 0);

  -- payment_status
  IF COALESCE(NEW.amount_paid, 0) >= COALESCE(NEW.final_price, 0) THEN
    NEW.payment_status := 'paid';
  ELSIF NEW.rental_end_date < today THEN
    NEW.payment_status := 'overdue';
  ELSIF COALESCE(NEW.amount_paid, 0) = 0 THEN
    NEW.payment_status := 'unpaid';
  ELSIF COALESCE(NEW.amount_paid, 0) < COALESCE(NEW.final_price, 0) THEN
    NEW.payment_status := 'partially_paid';
  END IF;

  RETURN NEW;
END;
$function$;

-- Also fix the calculate_rental_days function (if it exists)
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

-- Update ALL existing rentals to recalculate their total_days and final_price
UPDATE public.rentalrecords
SET 
    total_days = (rental_end_date::DATE - rental_start_date::DATE),
    final_price = ((rental_end_date::DATE - rental_start_date::DATE) * daily_rate) + COALESCE(additional_charges, 0)
WHERE rental_start_date IS NOT NULL AND rental_end_date IS NOT NULL;

-- Fix the calculate_rental_fields function to handle TIMESTAMP subtraction correctly
-- This function is called by the set_rental_fields trigger

CREATE OR REPLACE FUNCTION public.calculate_rental_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  today DATE := CURRENT_DATE;
BEGIN
  -- total_days: Cast TIMESTAMP to DATE before subtraction to get integer
  -- Add 1 for inclusive date range (both start and end dates count)
  NEW.total_days := (NEW.rental_end_date::DATE - NEW.rental_start_date::DATE) + 1;

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

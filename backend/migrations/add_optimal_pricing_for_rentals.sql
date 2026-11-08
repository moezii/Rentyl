-- Migration: Add optimal rental pricing calculation
-- This migration creates a function to calculate the cheapest rental price
-- using monthly, weekly, and daily rates, and updates the trigger to use it.

-- ============================================================================
-- FUNCTION: calculate_optimal_rental_price
-- ============================================================================
-- Calculates the optimal (cheapest) rental price by using the best combination
-- of monthly, weekly, and daily rates.
--
-- Parameters:
--   p_total_days: Total rental duration in days
--   p_daily_rate: Daily rental rate (required)
--   p_weekly_rate: Weekly rental rate (optional, can be NULL)
--   p_monthly_rate: Monthly rental rate (optional, can be NULL)
--
-- Returns: NUMERIC - The optimal total cost
--
-- Logic:
--   1. Use monthly rate for every 30 days (if available and beneficial)
--   2. Use weekly rate for every 7 remaining days (if available and cheaper than daily)
--   3. Use daily rate for all remaining days
--
-- Example:
--   35 days with daily=25, weekly=150, monthly=500
--   Result: 1 month (500) + 5 days (125) = 625
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_optimal_rental_price(
    p_total_days INTEGER,
    p_daily_rate NUMERIC,
    p_weekly_rate NUMERIC,
    p_monthly_rate NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
    v_cost NUMERIC := 0;
    v_remaining_days INTEGER := p_total_days;
    v_months INTEGER := 0;
    v_weeks INTEGER := 0;
BEGIN
    -- Validate inputs
    IF p_total_days <= 0 THEN
        RAISE EXCEPTION 'Total days must be greater than 0';
    END IF;
    
    IF p_daily_rate IS NULL OR p_daily_rate <= 0 THEN
        RAISE EXCEPTION 'Daily rate must be greater than 0';
    END IF;
    
    -- Step 1: Use monthly rate if available and beneficial (30 days = 1 month)
    IF p_monthly_rate IS NOT NULL AND p_monthly_rate > 0 AND v_remaining_days >= 30 THEN
        v_months := FLOOR(v_remaining_days / 30);
        v_cost := v_cost + (v_months * p_monthly_rate);
        v_remaining_days := v_remaining_days - (v_months * 30);
    END IF;
    
    -- Step 2: Use weekly rate if available and cheaper than daily (7 days = 1 week)
    IF p_weekly_rate IS NOT NULL AND p_weekly_rate > 0 AND v_remaining_days >= 7 THEN
        -- Only use weekly rate if it's actually cheaper than 7 days of daily rate
        IF p_weekly_rate < (p_daily_rate * 7) THEN
            v_weeks := FLOOR(v_remaining_days / 7);
            v_cost := v_cost + (v_weeks * p_weekly_rate);
            v_remaining_days := v_remaining_days - (v_weeks * 7);
        END IF;
    END IF;
    
    -- Step 3: Use daily rate for all remaining days
    IF v_remaining_days > 0 THEN
        v_cost := v_cost + (v_remaining_days * p_daily_rate);
    END IF;
    
    RETURN v_cost;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- TRIGGER FUNCTION: update_rental_final_price_on_insert_or_update
-- ============================================================================
-- Automatically calculates and sets the final_price for rentals using optimal pricing.
-- This trigger fires BEFORE INSERT OR UPDATE on the rentalrecords table.
--
-- What it does:
--   1. Fetches the car's daily_rate, weekly_rate, and monthly_rate
--   2. Calls calculate_optimal_rental_price to get the base cost
--   3. Adds any additional_charges to get the final_price
--   4. Sets NEW.final_price before the record is saved
--
-- This ensures:
--   - Price is always calculated server-side (security)
--   - Optimal pricing is always used (best price for customer)
--   - Consistency across all rental creation methods
-- ============================================================================

CREATE OR REPLACE FUNCTION update_rental_final_price_on_insert_or_update()
RETURNS TRIGGER AS $$
DECLARE
    v_daily_rate NUMERIC;
    v_weekly_rate NUMERIC;
    v_monthly_rate NUMERIC;
    v_base_cost NUMERIC;
BEGIN
    -- Fetch car rates from cars table
    SELECT daily_rate, weekly_rate, monthly_rate
    INTO v_daily_rate, v_weekly_rate, v_monthly_rate
    FROM cars
    WHERE car_id = NEW.car_id;
    
    -- If car not found or daily_rate is NULL, raise an error
    IF v_daily_rate IS NULL THEN
        RAISE EXCEPTION 'Car with ID % not found or has no daily rate', NEW.car_id;
    END IF;
    
    -- Calculate optimal base cost using the pricing function
    v_base_cost := calculate_optimal_rental_price(
        NEW.total_days,
        COALESCE(v_daily_rate, 0),
        v_weekly_rate,  -- Can be NULL
        v_monthly_rate  -- Can be NULL
    );
    
    -- Set final price = base cost + additional charges
    NEW.final_price := v_base_cost + COALESCE(NEW.additional_charges, 0);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: trigger_update_rental_final_price
-- ============================================================================
-- Attaches the trigger function to the rentalrecords table
-- Fires BEFORE INSERT OR UPDATE to calculate final_price automatically
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_rental_final_price ON rentalrecords;

CREATE TRIGGER trigger_update_rental_final_price
    BEFORE INSERT OR UPDATE ON rentalrecords
    FOR EACH ROW
    EXECUTE FUNCTION update_rental_final_price_on_insert_or_update();

-- ============================================================================
-- TESTING QUERIES (Run these to verify the function works correctly)
-- ============================================================================

-- Test 1: 35-day rental (should use 1 month + 5 days)
-- Expected: 500 + (5 * 25) = 625
-- SELECT calculate_optimal_rental_price(35, 25, 150, 500);

-- Test 2: 14-day rental (should use 2 weeks)
-- Expected: 2 * 150 = 300
-- SELECT calculate_optimal_rental_price(14, 25, 150, 500);

-- Test 3: 5-day rental (should use daily rate only)
-- Expected: 5 * 25 = 125
-- SELECT calculate_optimal_rental_price(5, 25, 150, 500);

-- Test 4: 30-day rental exactly (should use 1 month)
-- Expected: 500
-- SELECT calculate_optimal_rental_price(30, 25, 150, 500);

-- Test 5: 7-day rental exactly (should use 1 week)
-- Expected: 150
-- SELECT calculate_optimal_rental_price(7, 25, 150, 500);

-- Test 6: Car with no weekly/monthly rates (fallback to daily)
-- Expected: 35 * 30 = 1050
-- SELECT calculate_optimal_rental_price(35, 30, NULL, NULL);

-- Test 7: Weekly rate more expensive than daily (should use daily)
-- Expected: 14 * 25 = 350 (not 2 * 200 = 400)
-- SELECT calculate_optimal_rental_price(14, 25, 200, 500);

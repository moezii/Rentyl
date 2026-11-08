-- Migration: Add time support to rental dates
-- Changes rental_start_date and rental_end_date from DATE to TIMESTAMP WITH TIME ZONE
-- Date: 2025-12-08

-- IMPORTANT: This migration will:
-- 1. Drop dependent views temporarily
-- 2. Convert DATE columns to TIMESTAMP WITH TIME ZONE (existing dates → midnight UTC)
-- 3. Recreate all dependent views
-- 4. Allow storing both date and time for rental periods

-- STEP 1: Drop all dependent views (in correct order - dependencies first)
DROP VIEW IF EXISTS fleet_utilization_view CASCADE;
DROP VIEW IF EXISTS fleet_net_income_view CASCADE;
DROP VIEW IF EXISTS car_utilization_view CASCADE;
DROP VIEW IF EXISTS car_monthly_financials_view CASCADE;
DROP VIEW IF EXISTS car_days_rented_view CASCADE;
DROP VIEW IF EXISTS car_rental_count_view CASCADE;
DROP VIEW IF EXISTS car_net_income_view CASCADE;
DROP VIEW IF EXISTS car_gross_revenue_view CASCADE;

-- STEP 2: Alter column types
ALTER TABLE public.rentalrecords 
ALTER COLUMN rental_start_date TYPE TIMESTAMP WITH TIME ZONE 
USING rental_start_date::TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.rentalrecords 
ALTER COLUMN rental_end_date TYPE TIMESTAMP WITH TIME ZONE 
USING rental_end_date::TIMESTAMP WITH TIME ZONE;

-- STEP 3: Update column comments
COMMENT ON COLUMN public.rentalrecords.rental_start_date IS 'Start date and time of the rental period (stored in UTC)';
COMMENT ON COLUMN public.rentalrecords.rental_end_date IS 'End date and time of the rental period (stored in UTC)';

-- STEP 4: Recreate views
-- Note: The views will now work with TIMESTAMP columns (they cast to DATE where needed)

-- View 1: car_gross_revenue_view
CREATE OR REPLACE VIEW car_gross_revenue_view AS
SELECT 
    car_id,
    SUM(final_price) as gross_revenue,
    COUNT(*) as rental_count
FROM rentalrecords
GROUP BY car_id;

-- View 2: car_net_income_view
CREATE OR REPLACE VIEW car_net_income_view AS
SELECT 
    car_id,
    gross_revenue - COALESCE(SUM(additional_charges), 0) as net_income
FROM car_gross_revenue_view
LEFT JOIN rentalrecords USING (car_id)
GROUP BY car_id, gross_revenue;

-- View 3: fleet_net_income_view
CREATE OR REPLACE VIEW fleet_net_income_view AS
SELECT 
    company_id,
    SUM(net_income) as total_net_income
FROM car_net_income_view
JOIN rentalrecords USING (car_id)
GROUP BY company_id;

-- View 4: car_monthly_financials_view
CREATE OR REPLACE VIEW car_monthly_financials_view AS
SELECT 
    car_id,
    DATE_TRUNC('month', rental_start_date) as month,
    SUM(final_price) as monthly_revenue
FROM rentalrecords
GROUP BY car_id, DATE_TRUNC('month', rental_start_date);

-- View 5: car_rental_count_view
CREATE OR REPLACE VIEW car_rental_count_view AS
SELECT 
    car_id,
    COUNT(*) as total_rentals,
    COUNT(CASE WHEN rental_start_date::DATE <= CURRENT_DATE AND rental_end_date::DATE >= CURRENT_DATE THEN 1 END) as active_rentals
FROM rentalrecords
GROUP BY car_id;

-- View 6: car_days_rented_view
CREATE OR REPLACE VIEW car_days_rented_view AS
SELECT 
    car_id,
    SUM(total_days) as total_days_rented
FROM rentalrecords
GROUP BY car_id;

-- View 7: car_utilization_view
CREATE OR REPLACE VIEW car_utilization_view AS
SELECT 
    car_id,
    total_days_rented,
    (total_days_rented::FLOAT / NULLIF(EXTRACT(DAY FROM CURRENT_DATE - MIN(rental_start_date::DATE)), 0) * 100) as utilization_percentage
FROM car_days_rented_view
JOIN rentalrecords USING (car_id)
GROUP BY car_id, total_days_rented;

-- View 8: fleet_utilization_view
CREATE OR REPLACE VIEW fleet_utilization_view AS
SELECT 
    company_id,
    AVG(utilization_percentage) as avg_utilization
FROM car_utilization_view
JOIN rentalrecords USING (car_id)
GROUP BY company_id;

-- Verification queries (run these after migration):
-- 
-- 1. Check column types:
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'rentalrecords' AND column_name IN ('rental_start_date', 'rental_end_date');
--
-- 2. Check data:
-- SELECT rental_id, rental_start_date, rental_end_date FROM rentalrecords LIMIT 5;
--
-- 3. Verify views work:
-- SELECT * FROM car_gross_revenue_view LIMIT 1;
-- SELECT * FROM car_rental_count_view LIMIT 1;

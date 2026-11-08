-- Migration: Fix monthly_car_utilization view to show cars from creation date onward
-- Date: 2025-12-08
-- Purpose: Fix the car_months CTE to include all cars from their creation month through current/latest rental month

-- Drop dependent views first
DROP VIEW IF EXISTS monthly_car_analytics CASCADE;
DROP VIEW IF EXISTS monthly_fleet_utilization CASCADE;

-- Recreate monthly_car_utilization with fixed logic
CREATE OR REPLACE VIEW monthly_car_utilization AS
WITH car_month_ranges AS (
    -- For each car, determine the range of months to show
    SELECT 
        c.car_id,
        c.company_id,
        c.make,
        c.model,
        c.license_plate,
        DATE_TRUNC('month', c.created_at) AS start_month,
        -- End month is either the latest rental month or current month, whichever is later
        GREATEST(
            DATE_TRUNC('month', CURRENT_DATE),
            COALESCE(
                (SELECT MAX(DATE_TRUNC('month', rr.rental_end_date))
                 FROM rentalrecords rr 
                 WHERE rr.car_id = c.car_id),
                DATE_TRUNC('month', c.created_at)
            )
        ) AS end_month
    FROM cars c
),
car_months AS (
    -- Generate all months in the range for each car
    SELECT DISTINCT
        cmr.car_id,
        cmr.company_id,
        cmr.make,
        cmr.model,
        cmr.license_plate,
        generate_series(
            cmr.start_month,
            cmr.end_month,
            '1 month'::interval
        )::timestamp with time zone AS month
    FROM car_month_ranges cmr
),
rental_days_per_month AS (
    SELECT 
        rr.car_id,
        rr.company_id,
        DATE_TRUNC('month', d.day) AS month,
        COUNT(DISTINCT d.day) AS days_rented
    FROM rentalrecords rr
    CROSS JOIN LATERAL (
        -- Generate all days between rental start and end for each rental
        SELECT generate_series(
            DATE_TRUNC('day', rr.rental_start_date),
            DATE_TRUNC('day', COALESCE(rr.rental_end_date, rr.rental_start_date)),
            '1 day'::interval
        )::date AS day
    ) d
    WHERE rr.rental_start_date IS NOT NULL
    GROUP BY rr.car_id, rr.company_id, DATE_TRUNC('month', d.day)
)
SELECT 
    cm.car_id,
    cm.company_id,
    cm.make,
    cm.model,
    cm.license_plate,
    cm.month,
    EXTRACT(YEAR FROM cm.month) AS year,
    EXTRACT(MONTH FROM cm.month) AS month_number,
    EXTRACT(DAY FROM (DATE_TRUNC('month', cm.month) + INTERVAL '1 month' - INTERVAL '1 day')) AS days_in_month,
    COALESCE(rdm.days_rented, 0) AS days_rented,
    ROUND(
        (COALESCE(rdm.days_rented, 0)::numeric / 
        EXTRACT(DAY FROM (DATE_TRUNC('month', cm.month) + INTERVAL '1 month' - INTERVAL '1 day'))::numeric) * 100,
        2
    ) AS utilization_rate_percent
FROM car_months cm
LEFT JOIN rental_days_per_month rdm 
    ON cm.car_id = rdm.car_id 
    AND cm.company_id = rdm.company_id 
    AND cm.month = rdm.month
ORDER BY cm.company_id, cm.car_id, cm.month DESC;

-- Recreate monthly_fleet_utilization
CREATE OR REPLACE VIEW monthly_fleet_utilization AS
SELECT 
    company_id,
    month,
    EXTRACT(YEAR FROM month) AS year,
    EXTRACT(MONTH FROM month) AS month_number,
    days_in_month,
    COUNT(DISTINCT car_id) AS total_cars,
    SUM(days_rented) AS total_days_rented,
    SUM(days_in_month) AS total_possible_days,
    ROUND(
        (SUM(days_rented)::numeric / SUM(days_in_month)::numeric) * 100,
        2
    ) AS fleet_utilization_rate_percent,
    ROUND(AVG(utilization_rate_percent), 2) AS avg_car_utilization_percent
FROM monthly_car_utilization
GROUP BY company_id, month, days_in_month
ORDER BY company_id, month DESC;

-- Recreate monthly_car_analytics
CREATE OR REPLACE VIEW monthly_car_analytics AS
SELECT 
    f.car_id,
    f.company_id,
    f.make,
    f.model,
    f.license_plate,
    f.month,
    f.year,
    f.month_number,
    f.income,
    f.amount_paid,
    f.rental_count,
    f.maintenance_costs,
    f.maintenance_count,
    f.net_income,
    u.days_in_month,
    u.days_rented,
    u.utilization_rate_percent
FROM monthly_car_financials f
LEFT JOIN monthly_car_utilization u 
    ON f.car_id = u.car_id 
    AND f.company_id = u.company_id 
    AND f.month = u.month
ORDER BY f.company_id, f.car_id, f.month DESC;

-- Recreate monthly_fleet_analytics
CREATE OR REPLACE VIEW monthly_fleet_analytics AS
SELECT 
    f.company_id,
    f.month,
    f.year,
    f.month_number,
    f.total_income,
    f.total_paid,
    f.total_rentals,
    f.total_maintenance_costs,
    f.total_maintenance_count,
    f.net_income,
    f.active_cars,
    u.total_cars,
    u.total_days_rented,
    u.total_possible_days,
    u.fleet_utilization_rate_percent,
    u.avg_car_utilization_percent
FROM monthly_fleet_financials f
LEFT JOIN monthly_fleet_utilization u 
    ON f.company_id = u.company_id 
    AND f.month = u.month
ORDER BY f.company_id, f.month DESC;

-- Verification queries:
-- 1. Check car with rental from Dec 2025 - Feb 2026:
-- SELECT * FROM monthly_car_utilization WHERE car_id = 70 ORDER BY month;

-- 2. Check car with no rentals (should show months from creation to current):
-- SELECT * FROM monthly_car_utilization WHERE car_id = [test_car_id] ORDER BY month;

-- 3. Verify no spurious entries before car creation:
-- SELECT c.car_id, c.created_at, u.month 
-- FROM cars c 
-- LEFT JOIN monthly_car_utilization u ON c.car_id = u.car_id 
-- WHERE DATE_TRUNC('month', u.month) < DATE_TRUNC('month', c.created_at);
-- (Should return 0 rows)

-- Migration: Add comprehensive monthly analytics views
-- Date: 2025-12-08
-- Purpose: Replace old views with new comprehensive monthly analytics views

-- Drop old views if they exist
DROP VIEW IF EXISTS car_monthly_financials_view CASCADE;
DROP VIEW IF EXISTS car_utilization_view CASCADE;
DROP VIEW IF EXISTS fleet_net_income_view CASCADE;
DROP VIEW IF EXISTS fleet_utilization_view CASCADE;
DROP VIEW IF EXISTS fleet_maintenance_costs_view CASCADE;
DROP VIEW IF EXISTS current_month_fleet_utilization_view CASCADE;

-- ============================================
-- 1. MONTHLY FINANCIALS PER CAR
-- ============================================
CREATE OR REPLACE VIEW monthly_car_financials AS
WITH monthly_rental_income AS (
    SELECT 
        rr.car_id,
        rr.company_id,
        DATE_TRUNC('month', rr.rental_start_date) AS month,
        SUM(rr.final_price) AS total_income,
        SUM(rr.amount_paid) AS total_paid,
        COUNT(*) AS rental_count
    FROM rentalrecords rr
    WHERE rr.rental_start_date IS NOT NULL
    GROUP BY rr.car_id, rr.company_id, DATE_TRUNC('month', rr.rental_start_date)
),
monthly_maintenance_costs AS (
    SELECT 
        m.car_id,
        m.company_id,
        DATE_TRUNC('month', m.maintenance_date) AS month,
        SUM(m.maintenance_cost) AS total_maintenance_cost,
        COUNT(*) AS maintenance_count
    FROM maintenance m
    WHERE m.maintenance_date IS NOT NULL
    GROUP BY m.car_id, m.company_id, DATE_TRUNC('month', m.maintenance_date)
),
all_months AS (
    SELECT DISTINCT car_id, company_id, month FROM monthly_rental_income
    UNION
    SELECT DISTINCT car_id, company_id, month FROM monthly_maintenance_costs
)
SELECT 
    am.car_id,
    am.company_id,
    c.make,
    c.model,
    c.license_plate,
    am.month,
    EXTRACT(YEAR FROM am.month) AS year,
    EXTRACT(MONTH FROM am.month) AS month_number,
    COALESCE(mri.total_income, 0) AS income,
    COALESCE(mri.total_paid, 0) AS amount_paid,
    COALESCE(mri.rental_count, 0) AS rental_count,
    COALESCE(mmc.total_maintenance_cost, 0) AS maintenance_costs,
    COALESCE(mmc.maintenance_count, 0) AS maintenance_count,
    COALESCE(mri.total_income, 0) - COALESCE(mmc.total_maintenance_cost, 0) AS net_income
FROM all_months am
LEFT JOIN monthly_rental_income mri 
    ON am.car_id = mri.car_id 
    AND am.company_id = mri.company_id 
    AND am.month = mri.month
LEFT JOIN monthly_maintenance_costs mmc 
    ON am.car_id = mmc.car_id 
    AND am.company_id = mmc.company_id 
    AND am.month = mmc.month
LEFT JOIN cars c ON am.car_id = c.car_id
ORDER BY am.company_id, am.car_id, am.month DESC;


-- ============================================
-- 2. MONTHLY FINANCIALS PER FLEET (COMPANY)
-- ============================================
CREATE OR REPLACE VIEW monthly_fleet_financials AS
SELECT 
    company_id,
    month,
    EXTRACT(YEAR FROM month) AS year,
    EXTRACT(MONTH FROM month) AS month_number,
    SUM(income) AS total_income,
    SUM(amount_paid) AS total_paid,
    SUM(rental_count) AS total_rentals,
    SUM(maintenance_costs) AS total_maintenance_costs,
    SUM(maintenance_count) AS total_maintenance_count,
    SUM(net_income) AS net_income,
    COUNT(DISTINCT car_id) AS active_cars
FROM monthly_car_financials
GROUP BY company_id, month
ORDER BY company_id, month DESC;


-- ============================================
-- 3. MONTHLY UTILIZATION RATE PER CAR
-- ============================================
CREATE OR REPLACE VIEW monthly_car_utilization AS
WITH date_series AS (
    -- Generate all months that have rental activity
    SELECT DISTINCT 
        DATE_TRUNC('month', rental_start_date) AS month
    FROM rentalrecords
    WHERE rental_start_date IS NOT NULL
),
car_months AS (
    -- Cross join cars with all months to get every car-month combination
    SELECT DISTINCT 
        c.car_id,
        c.company_id,
        c.make,
        c.model,
        c.license_plate,
        ds.month
    FROM cars c
    CROSS JOIN date_series ds
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


-- ============================================
-- 4. MONTHLY UTILIZATION RATE PER FLEET
-- ============================================
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


-- ============================================
-- 5. COMBINED ANALYTICS VIEWS
-- ============================================
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
--
-- 1. Check monthly_car_analytics:
-- SELECT * FROM monthly_car_analytics WHERE car_id = 1 ORDER BY month DESC LIMIT 3;
--
-- 2. Check monthly_fleet_analytics:
-- SELECT * FROM monthly_fleet_analytics WHERE company_id = 1 ORDER BY month DESC LIMIT 3;
--
-- 3. Verify all views exist:
-- SELECT table_name FROM information_schema.views WHERE table_schema = 'public' AND table_name LIKE 'monthly%';

-- ============================================
-- UTILIZATION VERIFICATION AND TEST QUERIES
-- ============================================
-- Purpose: Verify that fleet and car utilization are calculated correctly
-- especially for rentals spanning multiple months

-- ============================================
-- 1. TEST DATA: Create a sample multi-month rental
-- ============================================
-- Uncomment to insert test data:

-- INSERT INTO rentalrecords (
--     car_id, 
--     client_id, 
--     company_id,
--     rental_start_date, 
--     rental_end_date,
--     daily_rate,
--     payment_status,
--     amount_paid,
--     mileage_before
-- ) VALUES (
--     1,  -- Replace with actual car_id
--     1,  -- Replace with actual client_id
--     1,  -- Replace with actual company_id
--     '2025-01-15 10:00:00+00',  -- Starts in January
--     '2025-03-20 10:00:00+00',  -- Ends in March (spans 3 months)
--     100.0,
--     'unpaid',
--     0,
--     50000
-- );


-- ============================================
-- 2. VERIFY: Check how a rental is split across months
-- ============================================
-- This shows how a single rental's days are distributed across months
SELECT 
    rr.rental_id,
    rr.car_id,
    rr.rental_start_date,
    rr.rental_end_date,
    rr.total_days AS total_rental_days,
    DATE_TRUNC('month', d.day) AS month,
    COUNT(DISTINCT d.day) AS days_in_this_month
FROM rentalrecords rr
CROSS JOIN LATERAL (
    SELECT generate_series(
        DATE_TRUNC('day', rr.rental_start_date),
        DATE_TRUNC('day', COALESCE(rr.rental_end_date, rr.rental_start_date)),
        '1 day'::interval
    )::date AS day
) d
WHERE rr.rental_start_date IS NOT NULL
GROUP BY rr.rental_id, rr.car_id, rr.rental_start_date, rr.rental_end_date, rr.total_days, DATE_TRUNC('month', d.day)
ORDER BY rr.rental_id, month;

-- ============================================
-- 3. VERIFY: Monthly utilization should never exceed 100%
-- ============================================
-- Check for any car-month combinations with >100% utilization
SELECT 
    car_id,
    company_id,
    make,
    model,
    license_plate,
    month,
    days_in_month,
    days_rented,
    utilization_rate_percent,
    CASE 
        WHEN utilization_rate_percent > 100 THEN '⚠️ OVER 100%'
        WHEN utilization_rate_percent = 100 THEN '✅ FULLY UTILIZED'
        ELSE '✓ Normal'
    END AS status
FROM monthly_car_utilization
WHERE utilization_rate_percent > 100
ORDER BY utilization_rate_percent DESC, month DESC;

-- If this returns any rows, there's a problem!

-- ============================================
-- 4. VERIFY: Total days should match across months
-- ============================================
-- For a rental spanning multiple months, sum of days across months should equal total_days
WITH rental_month_breakdown AS (
    SELECT 
        rr.rental_id,
        rr.car_id,
        rr.total_days AS total_rental_days,
        DATE_TRUNC('month', d.day) AS month,
        COUNT(DISTINCT d.day) AS days_in_month
    FROM rentalrecords rr
    CROSS JOIN LATERAL (
        SELECT generate_series(
            DATE_TRUNC('day', rr.rental_start_date),
            DATE_TRUNC('day', COALESCE(rr.rental_end_date, rr.rental_start_date)),
            '1 day'::interval
        )::date AS day
    ) d
    WHERE rr.rental_start_date IS NOT NULL
    GROUP BY rr.rental_id, rr.car_id, rr.total_days, DATE_TRUNC('month', d.day)
),
rental_totals AS (
    SELECT 
        rental_id,
        car_id,
        total_rental_days,
        SUM(days_in_month) AS sum_of_monthly_days,
        COUNT(*) AS months_spanned
    FROM rental_month_breakdown
    GROUP BY rental_id, car_id, total_rental_days
)
SELECT 
    rental_id,
    car_id,
    total_rental_days,
    sum_of_monthly_days,
    months_spanned,
    CASE 
        WHEN total_rental_days = sum_of_monthly_days THEN '✅ Correct'
        ELSE '❌ MISMATCH'
    END AS validation_status
FROM rental_totals
WHERE total_rental_days != sum_of_monthly_days;

-- If this returns any rows, the day allocation is incorrect!

-- ============================================
-- 5. DETAILED EXAMPLE: Show a specific car's utilization
-- ============================================
-- Replace car_id = 1 with your actual car ID
SELECT 
    car_id,
    make,
    model,
    license_plate,
    month,
    year,
    month_number,
    days_in_month,
    days_rented,
    utilization_rate_percent,
    ROUND((days_in_month - days_rented)::numeric, 0) AS days_available
FROM monthly_car_utilization
WHERE car_id = 1  -- Replace with actual car_id
ORDER BY month DESC
LIMIT 12;  -- Last 12 months

-- ============================================
-- 6. FLEET OVERVIEW: Check overall fleet utilization
-- ============================================
SELECT 
    company_id,
    month,
    year,
    month_number,
    total_cars,
    total_days_rented,
    total_possible_days,
    fleet_utilization_rate_percent,
    avg_car_utilization_percent,
    CASE 
        WHEN fleet_utilization_rate_percent > 100 THEN '⚠️ ERROR: Over 100%'
        WHEN fleet_utilization_rate_percent >= 80 THEN '🔥 High utilization'
        WHEN fleet_utilization_rate_percent >= 50 THEN '✓ Good utilization'
        ELSE '⚠️ Low utilization'
    END AS fleet_status
FROM monthly_fleet_utilization
ORDER BY company_id, month DESC
LIMIT 12;

-- ============================================
-- 7. IDENTIFY OVERLAPPING RENTALS (Should not happen!)
-- ============================================
-- Check if the same car has overlapping rental periods
SELECT 
    r1.rental_id AS rental_1_id,
    r2.rental_id AS rental_2_id,
    r1.car_id,
    r1.rental_start_date AS r1_start,
    r1.rental_end_date AS r1_end,
    r2.rental_start_date AS r2_start,
    r2.rental_end_date AS r2_end,
    '⚠️ OVERLAPPING RENTALS!' AS warning
FROM rentalrecords r1
JOIN rentalrecords r2 
    ON r1.car_id = r2.car_id 
    AND r1.rental_id < r2.rental_id
WHERE 
    r1.rental_start_date IS NOT NULL 
    AND r1.rental_end_date IS NOT NULL
    AND r2.rental_start_date IS NOT NULL 
    AND r2.rental_end_date IS NOT NULL
    AND (
        -- r2 starts during r1
        (r2.rental_start_date >= r1.rental_start_date AND r2.rental_start_date <= r1.rental_end_date)
        OR
        -- r2 ends during r1
        (r2.rental_end_date >= r1.rental_start_date AND r2.rental_end_date <= r1.rental_end_date)
        OR
        -- r2 completely contains r1
        (r2.rental_start_date <= r1.rental_start_date AND r2.rental_end_date >= r1.rental_end_date)
    );

-- If this returns any rows, you have overlapping rentals which will cause >100% utilization!

-- ============================================
-- 8. CURRENT MONTH UTILIZATION SNAPSHOT
-- ============================================
SELECT 
    car_id,
    make,
    model,
    license_plate,
    days_in_month,
    days_rented,
    utilization_rate_percent,
    ROUND((days_in_month - days_rented)::numeric, 0) AS days_still_available,
    CASE 
        WHEN utilization_rate_percent >= 100 THEN '🔴 Fully booked'
        WHEN utilization_rate_percent >= 80 THEN '🟡 Almost full'
        WHEN utilization_rate_percent >= 50 THEN '🟢 Good availability'
        ELSE '⚪ Low utilization'
    END AS availability_status
FROM monthly_car_utilization
WHERE month = DATE_TRUNC('month', CURRENT_DATE)
ORDER BY utilization_rate_percent DESC;

-- ============================================
-- 9. YEAR-TO-DATE UTILIZATION
-- ============================================
SELECT 
    car_id,
    make,
    model,
    license_plate,
    COUNT(*) AS months_tracked,
    SUM(days_rented) AS total_days_rented_ytd,
    SUM(days_in_month) AS total_days_available_ytd,
    ROUND(
        (SUM(days_rented)::numeric / SUM(days_in_month)::numeric) * 100,
        2
    ) AS ytd_utilization_percent,
    ROUND(AVG(utilization_rate_percent), 2) AS avg_monthly_utilization
FROM monthly_car_utilization
WHERE EXTRACT(YEAR FROM month) = EXTRACT(YEAR FROM CURRENT_DATE)
GROUP BY car_id, make, model, license_plate
ORDER BY ytd_utilization_percent DESC;

-- ============================================
-- 10. FIND CARS WITH CONSISTENTLY HIGH/LOW UTILIZATION
-- ============================================
-- Cars with average utilization > 80% (last 6 months)
SELECT 
    car_id,
    make,
    model,
    license_plate,
    COUNT(*) AS months_analyzed,
    ROUND(AVG(utilization_rate_percent), 2) AS avg_utilization,
    MIN(utilization_rate_percent) AS min_utilization,
    MAX(utilization_rate_percent) AS max_utilization,
    '🔥 High demand' AS status
FROM monthly_car_utilization
WHERE month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '6 months')
GROUP BY car_id, make, model, license_plate
HAVING AVG(utilization_rate_percent) > 80
ORDER BY avg_utilization DESC;

-- Cars with average utilization < 30% (last 6 months)
SELECT 
    car_id,
    make,
    model,
    license_plate,
    COUNT(*) AS months_analyzed,
    ROUND(AVG(utilization_rate_percent), 2) AS avg_utilization,
    MIN(utilization_rate_percent) AS min_utilization,
    MAX(utilization_rate_percent) AS max_utilization,
    '⚠️ Low demand' AS status
FROM monthly_car_utilization
WHERE month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '6 months')
GROUP BY car_id, make, model, license_plate
HAVING AVG(utilization_rate_percent) < 30
ORDER BY avg_utilization ASC;

-- ============================================
-- SUMMARY OF WHAT TO CHECK:
-- ============================================
-- ✅ Query 2: Verify rentals are split correctly across months
-- ✅ Query 3: Ensure no car has >100% utilization in any month
-- ✅ Query 4: Verify total days match across month splits
-- ✅ Query 5: Review specific car utilization over time
-- ✅ Query 6: Check overall fleet health
-- ✅ Query 7: Detect overlapping rentals (data integrity issue)
-- ✅ Query 8: Current month snapshot
-- ✅ Query 9: Year-to-date performance
-- ✅ Query 10: Identify high/low performers

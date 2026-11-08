-- Verification queries to debug fleet utilization issue

-- 1. Check monthly_car_utilization for December 2025
SELECT 
    car_id, 
    make, 
    model, 
    month, 
    days_in_month, 
    days_rented, 
    utilization_rate_percent
FROM monthly_car_utilization
WHERE company_id = 12345 
  AND DATE_TRUNC('month', month) = '2025-12-01'::timestamp with time zone
ORDER BY car_id;

-- 2. Check monthly_fleet_utilization for December 2025
SELECT *
FROM monthly_fleet_utilization
WHERE company_id = 12345
  AND DATE_TRUNC('month', month) = '2025-12-01'::timestamp with time zone;

-- 3. Check if there are any cars with rentals in December 2025
SELECT 
    rr.car_id,
    c.make,
    c.model,
    rr.rental_start_date,
    rr.rental_end_date,
    rr.total_days
FROM rentalrecords rr
LEFT JOIN cars c ON rr.car_id = c.car_id
WHERE rr.company_id = 12345
  AND (
    DATE_TRUNC('month', rr.rental_start_date) = '2025-12-01'::timestamp with time zone
    OR DATE_TRUNC('month', rr.rental_end_date) = '2025-12-01'::timestamp with time zone
    OR (rr.rental_start_date <= '2025-12-31'::date AND rr.rental_end_date >= '2025-12-01'::date)
  )
ORDER BY rr.rental_start_date;

-- 4. Check monthly_fleet_analytics
SELECT *
FROM monthly_fleet_analytics
WHERE company_id = 12345
  AND DATE_TRUNC('month', month) = '2025-12-01'::timestamp with time zone;

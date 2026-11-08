-- Fix final_price for existing rental records
-- Recalculate based on correct days calculation (including both start and end day)

UPDATE rentalrecords
SET
    total_days = (rental_end_date - rental_start_date) + 1,
    final_price = ((rental_end_date - rental_start_date) + 1) * COALESCE(daily_rate, 0) + COALESCE(additional_charges, 0)
WHERE
    rental_start_date IS NOT NULL
    AND rental_end_date IS NOT NULL;

-- Show what was updated
SELECT
    rental_id,
    rental_start_date,
    rental_end_date,
    total_days,
    daily_rate,
    additional_charges,
    final_price,
    amount_paid
FROM rentalrecords
ORDER BY created_at DESC
LIMIT 10;

-- Fix booking status to be computed from rental dates
-- PostgreSQL doesn't allow GENERATED columns with non-IMMUTABLE functions (like CURRENT_DATE)
-- So we use a VIEW instead for auto-computed status

-- Step 1: Drop and recreate the function (fix IMMUTABLE -> STABLE)
DROP FUNCTION IF EXISTS get_booking_status(DATE, DATE);

CREATE OR REPLACE FUNCTION get_booking_status(
    start_date DATE,
    end_date DATE
) RETURNS TEXT AS $$
BEGIN
    IF start_date IS NULL OR end_date IS NULL THEN
        RETURN 'pending';
    END IF;

    IF CURRENT_DATE < start_date THEN
        RETURN 'future';
    ELSIF CURRENT_DATE >= start_date AND CURRENT_DATE <= end_date THEN
        RETURN 'present';
    ELSE
        RETURN 'complete';
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;  -- STABLE because it uses CURRENT_DATE

-- Step 2: Keep booking_status as a regular column for manual overrides
-- But always compute it in your queries using the function

-- Step 3: Create a VIEW that always shows computed status
CREATE OR REPLACE VIEW bookings_with_status AS
SELECT
    *,
    get_booking_status(rental_start_date, rental_end_date) as computed_booking_status
FROM bookings;

-- Usage:
-- SELECT * FROM bookings_with_status;
-- The computed_booking_status will always reflect the current date vs rental dates

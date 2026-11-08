-- Migration to update booking_status to be date-based (future/present/past)
-- instead of manual status (confirmed/pending/cancelled/completed)

-- Step 1: Update the CHECK constraint to allow new values
ALTER TABLE public.bookings
DROP CONSTRAINT IF EXISTS bookings_booking_status_check;

ALTER TABLE public.bookings
ADD CONSTRAINT bookings_booking_status_check
CHECK (booking_status IN ('future', 'present', 'past', 'cancelled'));

-- Step 2: Create function to compute booking status based on dates
CREATE OR REPLACE FUNCTION compute_booking_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If cancelled, keep it cancelled
    IF NEW.booking_status = 'cancelled' THEN
        RETURN NEW;
    END IF;

    -- Compute status based on rental dates
    IF NEW.rental_start_date IS NULL OR NEW.rental_end_date IS NULL THEN
        NEW.booking_status := 'future';
    ELSIF CURRENT_DATE < NEW.rental_start_date THEN
        NEW.booking_status := 'future';
    ELSIF CURRENT_DATE >= NEW.rental_start_date AND CURRENT_DATE <= NEW.rental_end_date THEN
        NEW.booking_status := 'present';
    ELSE
        NEW.booking_status := 'past';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger to auto-compute status on INSERT and UPDATE
DROP TRIGGER IF EXISTS set_booking_status_trigger ON public.bookings;

CREATE TRIGGER set_booking_status_trigger
    BEFORE INSERT OR UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION compute_booking_status();

-- Step 4: Update all existing bookings to use the new status values
UPDATE public.bookings
SET booking_status = CASE
    WHEN booking_status = 'cancelled' THEN 'cancelled'
    WHEN rental_start_date IS NULL OR rental_end_date IS NULL THEN 'future'
    WHEN CURRENT_DATE < rental_start_date THEN 'future'
    WHEN CURRENT_DATE >= rental_start_date AND CURRENT_DATE <= rental_end_date THEN 'present'
    ELSE 'past'
END;

-- Step 5: Update the comment
COMMENT ON COLUMN public.bookings.booking_status IS 'Auto-computed status based on rental dates: future (before start), present (during rental), past (after end), or cancelled';

-- Migration: double-booking protection on rentalrecords
--
-- RECONSTRUCTED, NOT EXPORTED. The production database already relies on an
-- exclusion constraint named `no_overlapping_rentals` (booking_service.py
-- catches violations of it and reports DOUBLE_BOOKING_PREVENTED), but its
-- definition was never committed. This file recreates it from how the code
-- writes rentals:
--   * rental_start_date / rental_end_date are TIMESTAMP WITH TIME ZONE
--     (see add_time_to_rental_dates.sql);
--   * a rental occupies [rental_start_date, rental_end_date): a car returned at
--     10:00 can be picked up again at 10:00;
--   * cancelled rentals (contract_status or payment_status = 'cancelled',
--     see rental_service.py) don't block the car.
--
-- Compare with your live schema before applying it to an existing project:
--   supabase db dump --schema-only | grep -A5 no_overlapping_rentals
-- If the live constraint differs, keep the live definition.
--
-- Applying it fails if overlapping, non-cancelled rentals already exist; find
-- them with the query at the bottom first.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.rentalrecords
    DROP CONSTRAINT IF EXISTS no_overlapping_rentals;

ALTER TABLE public.rentalrecords
    ADD CONSTRAINT no_overlapping_rentals
    EXCLUDE USING gist (
        car_id WITH =,
        tstzrange(rental_start_date, rental_end_date, '[)') WITH &&
    )
    WHERE (
        COALESCE(contract_status, '') <> 'cancelled'
        AND COALESCE(payment_status, '') <> 'cancelled'
    );

-- Overlapping active rentals that would block the constraint:
-- SELECT a.rental_id, b.rental_id, a.car_id
-- FROM public.rentalrecords a
-- JOIN public.rentalrecords b
--   ON a.car_id = b.car_id AND a.rental_id < b.rental_id
--  AND tstzrange(a.rental_start_date, a.rental_end_date, '[)')
--      && tstzrange(b.rental_start_date, b.rental_end_date, '[)')
-- WHERE COALESCE(a.contract_status, '') <> 'cancelled' AND COALESCE(a.payment_status, '') <> 'cancelled'
--   AND COALESCE(b.contract_status, '') <> 'cancelled' AND COALESCE(b.payment_status, '') <> 'cancelled';

# Database triggers and views

Rentyl keeps rental arithmetic and reporting in PostgreSQL. This file lists the
triggers, constraints and views the backend depends on. The SQL is in
`backend/migrations/`; those files change an existing schema and do not
create it. Export the base schema with `supabase db dump --schema-only`.

## Rentals

Trigger functions with the same timing fire in alphabetical order of trigger
name. On `rentalrecords`, all of these run `BEFORE INSERT OR UPDATE`:

| Trigger | Function | Effect |
| --- | --- | --- |
| `calculate_rental_days_trigger` | `calculate_rental_days()` | sets `total_days`; sets `final_price` from `daily_rate` when it is null |
| `set_rental_fields` | `calculate_rental_fields()` | sets `total_days`, `final_price` from `daily_rate`, and `payment_status` |
| `trigger_update_rental_final_price` | `update_rental_final_price_on_insert_or_update()` | sets `final_price` from the car's rates |

`total_days` counts 24-hour periods by calendar date:
`rental_end_date::DATE - rental_start_date::DATE`, so Jan 1 to Jan 3 is two
days (`fix_rental_days_24hour_periods.sql`, `fix_all_rental_days_triggers.sql`).

The last trigger looks up `daily_rate`, `weekly_rate` and `monthly_rate` on
the car and calls `calculate_optimal_rental_price(days, daily, weekly, monthly)`:
whole 30-day blocks at the monthly rate, then whole weeks at the weekly rate
when that is cheaper than seven days, then the remaining days at the daily
rate. `additional_charges` is added on top (`add_optimal_pricing_for_rentals.sql`).
It raises an error when the car has no daily rate or `total_days` is not
positive.

`calculate_rental_fields()` sets `payment_status` to `paid` when
`amount_paid >= final_price`, otherwise `overdue` after the end date, `unpaid`
when nothing was paid and `partially_paid` in between. It runs before the
optimal-price trigger, so it compares against the daily-rate price.

The live schema also has `ensure_id_matches_rental_id` (`BEFORE INSERT`,
`sync_id_with_rental_id()`), which copies `rental_id` into `id`. It is not
in the migrations.

`rental_start_date` and `rental_end_date` are `TIMESTAMP WITH TIME ZONE`
(`add_time_to_rental_dates.sql`). The exclusion constraint
`no_overlapping_rentals` rejects two rentals of the same car whose
`[start, end)` ranges overlap, ignoring rentals whose `contract_status` or
`payment_status` is `cancelled`. `add_no_overlapping_rentals_constraint.sql`
is a reconstruction of it; compare it with the live definition before
applying it. The booking service turns a violation into a double-booking error.

## Bookings

`set_booking_status_trigger` (`compute_booking_status()`, `BEFORE INSERT OR
UPDATE`) sets `booking_status` from the rental dates: `future`, `present` or
`past`. A `cancelled` booking keeps its status. The check constraint
`bookings_booking_status_check` allows only those four values
(`update_booking_status_to_date_based.sql`). `update_bookings_updated_at`
maintains `updated_at`.

The view `bookings_with_status` adds `computed_booking_status` from
`get_booking_status(start, end)`, which returns `pending` (no dates),
`future`, `present` or `complete` (`fix_booking_status_computed.sql`).

`check_car_availability_secure(p_car_id_enc, p_car_id_int, p_start, p_end)`
is the availability check used before payment. Its definition is not in the
repository; the backend calls it with the service role and reads rows with an
`available` flag.

## Analytics views

Defined in `add_monthly_analytics_views.sql`, with the utilization views
replaced by `fix_monthly_car_utilization_view.sql`. Months are taken from
`rental_start_date` for income.

| View | Contents |
| --- | --- |
| `monthly_car_financials` | per car and month: income (`final_price`), amount paid, rental count, maintenance cost and count, net income |
| `monthly_fleet_financials` | the same summed per company, plus the number of active cars |
| `monthly_car_utilization` | per car and month from the car's creation: days rented, days in month, utilization percent |
| `monthly_fleet_utilization` | per company and month: total and possible days, fleet utilization, average car utilization |
| `monthly_car_analytics` | car financials joined with car utilization |
| `monthly_fleet_analytics` | fleet financials joined with fleet utilization |

The backend reads `monthly_car_analytics` and `monthly_fleet_analytics`
(`backend/services/analytics_service.py`).

Utilization expands each rental into days with `generate_series`, groups them
by month and counts distinct days, so a rental from Jan 15 to Mar 20 adds 17
days to January, all of February and 20 days to March. A month above 100%
means overlapping rentals. To check:

    SELECT * FROM monthly_car_utilization WHERE utilization_rate_percent > 100;

`verify_utilization_calculations.sql`, `verify_triggers.sql` and
`verify_views.sql` contain more checks.

`add_time_to_rental_dates.sql` recreated some older views
(`car_gross_revenue_view`, `car_utilization_view`, `fleet_net_income_view`
and others). The backend does not use them.

## Changing triggers

`calculate_rental_days()` and `calculate_rental_fields()` both compute
`total_days`; change them together. To see what is installed:

    SELECT trigger_name, action_timing, event_manipulation
    FROM information_schema.triggers
    WHERE event_object_table = 'rentalrecords';

    SELECT pg_get_functiondef('calculate_rental_fields'::regproc);

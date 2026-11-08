-- Verification queries to check trigger status

-- 1. Check all triggers on rentalrecords table
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'rentalrecords'
ORDER BY trigger_name;

-- 2. Check the function definition
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'calculate_rental_days';

-- 3. Check the column type of total_days
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'rentalrecords' 
AND column_name IN ('total_days', 'rental_start_date', 'rental_end_date');

-- 4. Test the calculation manually
SELECT 
    '2026-03-17T12:42:00.000Z'::TIMESTAMP WITH TIME ZONE::DATE - 
    '2025-12-08T12:42:00.000Z'::TIMESTAMP WITH TIME ZONE::DATE + 1 
    AS calculated_days;

-- Check the calculate_rental_fields function definition
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'calculate_rental_fields';

-- Migration: Update existing car prices to match company currency
-- Description: This script helps convert existing car prices if they were stored in a different currency
-- Date: 2025-12-13
--
-- IMPORTANT: Before running this script, you need to:
-- 1. Run the add_company_region_and_currency.sql migration first
-- 2. Set the currency field for all companies in the companies table
-- 3. Determine what currency your existing car prices are currently in
-- 4. Update the conversion rates below based on your needs

-- ==============================================================================
-- STEP 1: Review current state
-- ==============================================================================

-- Check which companies don't have a currency set
SELECT company_id, company_name, currency
FROM public.companies
WHERE currency IS NULL;

-- Check all cars and their company's currency
SELECT
    c.car_id,
    c.make,
    c.model,
    c.daily_rate,
    c.company_id,
    comp.company_name,
    comp.currency
FROM public.cars c
LEFT JOIN public.companies comp ON c.company_id = comp.company_id
ORDER BY comp.company_id, c.car_id;

-- ==============================================================================
-- STEP 2: Set currency for companies (if not already set)
-- ==============================================================================

-- Example: Set all companies to OMR if that's your default
-- UPDATE public.companies SET currency = 'OMR' WHERE currency IS NULL;

-- Or set specific companies to specific currencies:
-- UPDATE public.companies SET currency = 'OMR' WHERE company_id = 1;
-- UPDATE public.companies SET currency = 'USD' WHERE company_id = 2;

-- ==============================================================================
-- STEP 3: Convert car prices if needed
-- ==============================================================================

-- SCENARIO A: If all your existing car prices are in USD and need to be converted to OMR
-- Conversion rate: 1 USD = 0.385 OMR (update this rate as needed)
--
-- UPDATE public.cars c
-- SET daily_rate = daily_rate * 0.385
-- FROM public.companies comp
-- WHERE c.company_id = comp.company_id
--   AND comp.currency = 'OMR'
--   AND c.daily_rate IS NOT NULL;

-- SCENARIO B: If all your existing car prices are in OMR and need to be converted to USD
-- Conversion rate: 1 OMR = 2.597 USD (update this rate as needed)
--
-- UPDATE public.cars c
-- SET daily_rate = daily_rate * 2.597
-- FROM public.companies comp
-- WHERE c.company_id = comp.company_id
--   AND comp.currency = 'USD'
--   AND c.daily_rate IS NOT NULL;

-- SCENARIO C: If your prices are already in the correct currency
-- No conversion needed! Just verify:
SELECT
    comp.company_name,
    comp.currency,
    COUNT(*) as car_count,
    AVG(c.daily_rate) as avg_daily_rate,
    MIN(c.daily_rate) as min_daily_rate,
    MAX(c.daily_rate) as max_daily_rate
FROM public.cars c
JOIN public.companies comp ON c.company_id = comp.company_id
WHERE c.daily_rate IS NOT NULL
GROUP BY comp.company_id, comp.company_name, comp.currency
ORDER BY comp.company_id;

-- ==============================================================================
-- STEP 4: Verification queries
-- ==============================================================================

-- Verify all cars have a currency through their company
SELECT
    c.car_id,
    CONCAT(c.make, ' ', c.model) as car_name,
    c.daily_rate,
    comp.currency,
    comp.company_name
FROM public.cars c
LEFT JOIN public.companies comp ON c.company_id = comp.company_id
WHERE c.daily_rate IS NOT NULL
ORDER BY comp.company_id, c.car_id;

-- Check for any cars without a company (should be none)
SELECT
    car_id,
    make,
    model,
    daily_rate
FROM public.cars
WHERE company_id IS NULL;

-- ==============================================================================
-- NOTES:
-- ==============================================================================
--
-- Current exchange rates (as of migration date):
-- 1 USD = 0.385 OMR
-- 1 OMR = 2.597 USD
-- 1 EUR = 0.420 OMR
-- 1 GBP = 0.488 OMR
-- 1 SAR = 0.103 OMR
-- 1 AED = 0.105 OMR
--
-- Update these rates based on your actual needs before running conversions!
-- ==============================================================================

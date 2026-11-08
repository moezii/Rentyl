-- Migration: Add region and currency fields to companies table
-- Description: Move region fields from users to companies and add currency support
-- Date: 2025-12-13

-- Step 1: Add region and currency columns to companies table
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS country VARCHAR(100),
ADD COLUMN IF NOT EXISTS province VARCHAR(100),
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS currency VARCHAR(10);

-- Step 2: Migrate existing region data from users to companies
-- This will set the company's region based on the first user's region data
UPDATE public.companies c
SET
    country = u.country,
    province = u.province,
    city = u.city
FROM (
    SELECT DISTINCT ON (company_id)
        company_id,
        country,
        province,
        city
    FROM public.users
    WHERE company_id IS NOT NULL
        AND (country IS NOT NULL OR province IS NOT NULL OR city IS NOT NULL)
    ORDER BY company_id, created_at ASC
) u
WHERE c.company_id = u.company_id
    AND c.country IS NULL;

-- Step 3: Verification queries (run these to check the migration)
-- Verify companies have region data:
SELECT company_id, company_name, country, province, city, currency FROM public.companies;

-- Check how many users still have region data:
SELECT COUNT(*) FROM public.users WHERE country IS NOT NULL OR province IS NOT NULL OR city IS NOT NULL;

-- Step 4: Remove region columns from users table
-- IMPORTANT: Only uncomment and run these AFTER you've verified Step 3 shows the data migrated correctly!
-- ALTER TABLE public.users DROP COLUMN IF EXISTS country;
-- ALTER TABLE public.users DROP COLUMN IF EXISTS province;
-- ALTER TABLE public.users DROP COLUMN IF EXISTS city;

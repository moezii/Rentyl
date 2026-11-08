-- Add detailed_location and phone_number columns to companies table
-- detailed_location: Google Maps share link (e.g., https://maps.app.goo.gl/<share-id>)
-- phone_number: Company contact phone number

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS detailed_location TEXT,
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);

-- Add comments to document the columns
COMMENT ON COLUMN companies.detailed_location IS 'Google Maps share link for company location';
COMMENT ON COLUMN companies.phone_number IS 'Company contact phone number';

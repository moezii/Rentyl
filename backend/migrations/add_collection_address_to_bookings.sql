-- Add collection_address column to bookings table
-- This column stores the vehicle pickup/collection location chosen by the customer

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS collection_address TEXT;

-- Add index for faster searches
CREATE INDEX IF NOT EXISTS idx_bookings_collection_address ON public.bookings(collection_address);

-- Add comment for documentation
COMMENT ON COLUMN public.bookings.collection_address IS 'Vehicle pickup/collection location chosen by the customer during booking';

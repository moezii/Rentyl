-- Create bookings table for payment-based bookings
-- This table stores booking records created automatically after successful payments

CREATE TABLE IF NOT EXISTS public.bookings (
    -- Primary key
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Company reference (for RLS)
    company_id INTEGER NOT NULL,

    -- Car reference (encrypted ID from frontend)
    car_id TEXT NOT NULL,

    -- Payment information
    payment_transaction_id TEXT NOT NULL UNIQUE,
    payment_reference TEXT NOT NULL,
    amount_paid DECIMAL(10, 2) NOT NULL CHECK (amount_paid > 0),
    currency_id INTEGER NOT NULL DEFAULT 512, -- 512 = OMR
    payment_status TEXT NOT NULL DEFAULT 'completed',
    payment_response_code TEXT NOT NULL,

    -- Customer information
    customer_email TEXT,
    customer_phone TEXT,
    customer_name TEXT,

    -- Client and Rental references (encrypted IDs)
    client_id TEXT,
    rental_record_id TEXT,

    -- Rental dates
    rental_start_date DATE,
    rental_end_date DATE,

    -- Booking status
    booking_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (booking_status IN ('pending', 'confirmed', 'cancelled', 'completed')),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),

    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_bookings_company_id ON public.bookings(company_id);
CREATE INDEX IF NOT EXISTS idx_bookings_car_id ON public.bookings(car_id);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_transaction_id ON public.bookings(payment_transaction_id);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_reference ON public.bookings(payment_reference);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_email ON public.bookings(customer_email);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_status ON public.bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings(created_at DESC);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- BOOKINGS - allow authenticated users to access their company's data
CREATE POLICY bookings_authenticated_access ON public.bookings
  FOR ALL
  TO authenticated
  USING (
    company_id = (
      SELECT users.company_id
      FROM users
      WHERE users.user_id = auth.uid()
      LIMIT 1
    )
  )
  WITH CHECK (
    company_id = (
      SELECT users.company_id
      FROM users
      WHERE users.user_id = auth.uid()
      LIMIT 1
    )
  );

-- SUPERSEDED: revoke_anon_table_access.sql drops bookings_anon_insert (the backend
-- inserts bookings with the service role after verifying the payment).
-- BOOKINGS - allow anonymous users to INSERT (for public booking page)
-- Note: The backend must set the correct company_id based on the car
CREATE POLICY bookings_anon_insert ON public.bookings
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE public.bookings IS 'Stores booking records created after successful payments through AMWAL Payment Gateway';
COMMENT ON COLUMN public.bookings.id IS 'Unique booking identifier (UUID)';
COMMENT ON COLUMN public.bookings.car_id IS 'Reference to the car (encrypted ID)';
COMMENT ON COLUMN public.bookings.payment_transaction_id IS 'AMWAL transaction ID';
COMMENT ON COLUMN public.bookings.payment_reference IS 'Merchant reference for the payment';
COMMENT ON COLUMN public.bookings.amount_paid IS 'Amount paid in OMR';
COMMENT ON COLUMN public.bookings.booking_status IS 'Current status of the booking (pending/confirmed/cancelled/completed)';

"""
Booking Routes

API endpoints for managing payment-based bookings.
"""

from fastapi import APIRouter, Query, Depends
from backend.utils.concurrency import offload
from backend.models.booking import BookingCreate, BookingUpdate, BookingValidate
from backend.controllers.booking_controller import booking_controller
from backend.dependencies import get_current_company_id
from backend.utils.rate_limit import booking_limiter

# Create router
router = APIRouter(prefix="/bookings", tags=["Bookings"])


@router.post(
    "/validate",
    summary="Validate Booking Before Payment",
    description="""
    Silently validates booking data before showing the payment gateway.
    This ensures the booking can be created successfully before collecting payment.
    """
)
@offload
async def validate_booking(booking_data: BookingValidate, _rl: None = Depends(booking_limiter)):
    """
    Validate booking without creating it

    **Required fields:**
    - car_id: The encrypted car ID
    - customer_email: Customer email
    - customer_phone: Customer phone
    - customer_name: Customer name
    - rental_start_date: Rental start date
    - rental_end_date: Rental end date

    **Returns:**
    - success: boolean
    - message: string
    - data: Validated booking details (price breakdown, availability confirmation)
    """
    return await booking_controller.validate_booking(booking_data)


@router.post(
    "/create",
    summary="Create New Booking After Payment",
    description="""
    Creates a new booking record after successful payment.
    This endpoint is called automatically from the frontend after payment confirmation.
    """
)
@offload
async def create_booking(booking_data: BookingCreate, _rl: None = Depends(booking_limiter)):
    """
    Create a new booking

    **Required fields:**
    - car_id: The encrypted car ID
    - payment_transaction_id: AMWAL transaction ID
    - payment_reference: Merchant reference
    - amount_paid: Amount paid in OMR
    - payment_response_code: AMWAL response code

    **Returns:**
    - success: boolean
    - message: string
    - data: Booking object
    """
    return await booking_controller.create_booking(booking_data)


@router.get(
    "/{booking_id}",
    summary="Get Booking by ID",
    description="Retrieve booking details by booking ID (UUID)"
)
@offload
async def get_booking(booking_id: str, company_id: int = Depends(get_current_company_id)):
    """Get booking by ID (only bookings of the caller's company)"""
    return await booking_controller.get_booking(booking_id, company_id)


@router.get(
    "/reference/{payment_reference}",
    summary="Get Booking by Payment Reference",
    description="Retrieve booking details by merchant payment reference"
)
@offload
async def get_booking_by_reference(payment_reference: str, company_id: int = Depends(get_current_company_id)):
    """Get booking by payment reference (only bookings of the caller's company)"""
    return await booking_controller.get_booking_by_reference(payment_reference, company_id)


@router.get(
    "/",
    summary="Get All Bookings",
    description="Retrieve all bookings with pagination"
)
@offload
async def get_all_bookings(
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    company_id: int = Depends(get_current_company_id),
):
    """Get the caller's company bookings with pagination"""
    return await booking_controller.get_all_bookings(company_id, limit, offset)


@router.put(
    "/{booking_id}",
    summary="Update Booking",
    description="Update booking details (status, customer info, etc.)"
)
@offload
async def update_booking(booking_id: str, update_data: BookingUpdate, company_id: int = Depends(get_current_company_id)):
    """Update booking details"""
    return await booking_controller.update_booking(booking_id, update_data, company_id)


@router.post(
    "/{booking_id}/cancel",
    summary="Cancel Booking",
    description="Cancel a booking (sets status to 'cancelled')"
)
@offload
async def cancel_booking(booking_id: str, company_id: int = Depends(get_current_company_id)):
    """Cancel booking"""
    return await booking_controller.cancel_booking(booking_id, company_id)


@router.post(
    "/{booking_id}/confirm",
    summary="Confirm Booking",
    description="Confirm a booking (sets status to 'confirmed')"
)
@offload
async def confirm_booking(booking_id: str, company_id: int = Depends(get_current_company_id)):
    """Confirm booking"""
    return await booking_controller.confirm_booking(booking_id, company_id)


@router.get(
    "/check-availability/{car_id}",
    summary="Check Car Availability",
    description="Check if a car is available for the specified date range"
)
@offload
async def check_availability(
    car_id: str,
    start_date: str = Query(..., description="Start date in YYYY-MM-DD format"),
    end_date: str = Query(..., description="End date in YYYY-MM-DD format")
):
    """Check if car is available for booking in the specified date range"""
    return await booking_controller.check_availability(car_id, start_date, end_date)


@router.get(
    "/calculate-price/{car_id}",
    summary="Calculate Booking Price",
    description="Calculate the total booking price including future booking fees (SERVER-SIDE CALCULATION)"
)
@offload
async def calculate_price(
    car_id: str,
    start_date: str = Query(..., description="Start date in YYYY-MM-DD format"),
    end_date: str = Query(..., description="End date in YYYY-MM-DD format")
):
    """Calculate total booking price on the server (security: never trust frontend calculations)"""
    return await booking_controller.calculate_price(car_id, start_date, end_date)

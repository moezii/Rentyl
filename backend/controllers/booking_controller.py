"""
Booking Controller

Handles HTTP requests for booking operations.
"""

from fastapi import HTTPException, status
from backend.utils.errors import server_error
from backend.models.booking import BookingCreate, BookingUpdate, BookingValidate
from backend.services.booking_service import booking_service
from typing import List


class BookingController:
    """Controller for booking endpoints"""

    @staticmethod
    async def validate_booking(booking_data: BookingValidate) -> dict:
        """
        Validate booking before payment (silent pre-check)

        Args:
            booking_data: Booking validation data

        Returns:
            Validation result with price breakdown and availability

        Raises:
            HTTPException: If validation fails
        """
        try:
            # Validate the booking without creating it
            result = await booking_service.validate_booking(booking_data)

            return {
                "success": True,
                "message": "Booking validation successful",
                "data": result
            }

        except HTTPException:
            raise
        except Exception as e:
            raise server_error(e, "Failed to validate booking")

    @staticmethod
    async def create_booking(booking_data: BookingCreate) -> dict:
        """
        Create a new booking after payment

        Args:
            booking_data: Booking creation data

        Returns:
            Created booking record

        Raises:
            HTTPException: If creation fails
        """
        try:
            # The service verifies the payment token and rejects transactions
            # that already produced a booking (409)
            booking = await booking_service.create_booking(booking_data)

            return {
                "success": True,
                "message": "Booking created successfully",
                "data": booking
            }

        except HTTPException:
            raise
        except Exception as e:
            raise server_error(e, "Failed to create booking")

    @staticmethod
    async def get_booking(booking_id: str, company_id: int) -> dict:
        """
        Get booking by ID

        Args:
            booking_id: Booking UUID

        Returns:
            Booking record

        Raises:
            HTTPException: If not found
        """
        booking = await booking_service.get_booking_by_id(booking_id, company_id)

        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found"
            )

        return {
            "success": True,
            "data": booking
        }

    @staticmethod
    async def get_booking_by_reference(payment_reference: str, company_id: int) -> dict:
        """
        Get booking by payment reference

        Args:
            payment_reference: Merchant payment reference

        Returns:
            Booking record

        Raises:
            HTTPException: If not found
        """
        booking = await booking_service.get_booking_by_reference(payment_reference, company_id)

        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found"
            )

        return {
            "success": True,
            "data": booking
        }

    @staticmethod
    async def update_booking(booking_id: str, update_data: BookingUpdate, company_id: int) -> dict:
        """
        Update booking

        Args:
            booking_id: Booking UUID
            update_data: Update data

        Returns:
            Updated booking record

        Raises:
            HTTPException: If update fails
        """
        try:
            booking = await booking_service.update_booking(booking_id, update_data, company_id)

            if not booking:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Booking not found"
                )

            return {
                "success": True,
                "message": "Booking updated successfully",
                "data": booking
            }

        except HTTPException:
            raise
        except Exception as e:
            raise server_error(e, "Failed to update booking")

    @staticmethod
    async def get_all_bookings(company_id: int, limit: int = 100, offset: int = 0) -> dict:
        """
        Get all bookings

        Args:
            limit: Max records
            offset: Skip records

        Returns:
            List of bookings
        """
        bookings = await booking_service.get_all_bookings(limit, offset, company_id)

        return {
            "success": True,
            "data": bookings,
            "count": len(bookings)
        }

    @staticmethod
    async def cancel_booking(booking_id: str, company_id: int) -> dict:
        """
        Cancel booking

        Args:
            booking_id: Booking UUID

        Returns:
            Updated booking

        Raises:
            HTTPException: If cancellation fails
        """
        try:
            booking = await booking_service.cancel_booking(booking_id, company_id)

            if not booking:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Booking not found"
                )

            return {
                "success": True,
                "message": "Booking cancelled successfully",
                "data": booking
            }

        except HTTPException:
            raise
        except Exception as e:
            raise server_error(e, "Failed to cancel booking")

    @staticmethod
    async def confirm_booking(booking_id: str, company_id: int) -> dict:
        """
        Confirm booking

        Args:
            booking_id: Booking UUID

        Returns:
            Updated booking

        Raises:
            HTTPException: If confirmation fails
        """
        try:
            booking = await booking_service.confirm_booking(booking_id, company_id)

            if not booking:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Booking not found"
                )

            return {
                "success": True,
                "message": "Booking confirmed successfully",
                "data": booking
            }

        except HTTPException:
            raise
        except Exception as e:
            raise server_error(e, "Failed to confirm booking")

    @staticmethod
    async def check_availability(car_id: str, start_date: str, end_date: str) -> dict:
        """
        Check if a car is available for booking in the specified date range

        Args:
            car_id: Encrypted car ID
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)

        Returns:
            Availability status with conflicting bookings if any

        Raises:
            HTTPException: If check fails
        """
        try:
            result = await booking_service.check_availability(car_id, start_date, end_date)

            return {
                "success": True,
                "data": result
            }

        except Exception as e:
            raise server_error(e, "Failed to check availability")

    @staticmethod
    async def calculate_price(car_id: str, start_date: str, end_date: str) -> dict:
        """
        Calculate booking price (SERVER-SIDE - security critical)

        Args:
            car_id: Encrypted car ID
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)

        Returns:
            Price breakdown including base cost, future fees, and total

        Raises:
            HTTPException: If calculation fails
        """
        try:
            result = await booking_service.calculate_booking_price(car_id, start_date, end_date)

            return {
                "success": True,
                "data": result
            }

        except Exception as e:
            raise server_error(e, "Failed to calculate price")


# Create controller instance
booking_controller = BookingController()

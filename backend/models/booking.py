"""
Booking Model for Payment-based Bookings

This model represents bookings created through the payment gateway.
Records are automatically created when a payment is successful.
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime


class BookingCreate(BaseModel):
    """Schema for creating a new booking after payment"""
    car_id: str = Field(..., description="Encrypted car ID")
    payment_token: Optional[str] = Field(
        None, max_length=4096,
        description="Server-signed token from /payment/confirm or /payment/return (required)"
    )
    # Kept for backward compatibility; the transaction, reference, status and
    # amount are taken from the verified payment token, not from these fields.
    payment_transaction_id: Optional[str] = Field(None, description="Ignored (taken from payment_token)")
    payment_reference: Optional[str] = Field(None, description="Ignored (taken from payment_token)")
    amount_paid: Optional[float] = Field(None, gt=0, description="Ignored (server price is used)")
    currency_id: int = Field(512, description="Currency ID (512 = OMR)")
    customer_email: Optional[str] = Field(None, max_length=254, description="Customer email")
    customer_phone: Optional[str] = Field(None, max_length=32, description="Customer phone")
    customer_name: Optional[str] = Field(None, max_length=200, description="Customer name")
    payment_status: Optional[str] = Field(None, description="Ignored (taken from payment_token)")
    payment_response_code: Optional[str] = Field(None, description="Ignored (taken from payment_token)")
    rental_start_date: str = Field(..., description="Rental start date (YYYY-MM-DD)")
    rental_end_date: str = Field(..., description="Rental end date (YYYY-MM-DD)")
    license_document_url: Optional[str] = Field(None, description="URL to uploaded license document")
    id_document_url: Optional[str] = Field(None, description="URL to uploaded ID document")
    collection_address: Optional[str] = Field(None, description="Vehicle pickup/collection location")
    pickup_time: Optional[str] = Field(None, description="Vehicle pickup time")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "car_id": "encrypted_car_123",
                "payment_transaction_id": "txn_789",
                "payment_reference": "RENTYL_ORDER_123",
                "amount_paid": 100.50,
                "currency_id": 512,
                "customer_email": "customer@example.com",
                "customer_phone": "+96812345678",
                "customer_name": "John Doe",
                "payment_status": "completed",
                "payment_response_code": "00",
                "rental_start_date": "2025-11-20",
                "rental_end_date": "2025-11-25",
                "license_document_url": "https://storage.example.com/license.pdf",
                "id_document_url": "https://storage.example.com/id.pdf"
            }
        },
    )


class BookingUpdate(BaseModel):
    """Schema for updating booking status"""
    booking_status: Optional[str] = Field(None, description="Update booking status")
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_name: Optional[str] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "booking_status": "confirmed",
                "customer_email": "updated@example.com"
            }
        },
    )


class BookingValidate(BaseModel):
    """Schema for validating booking before payment"""
    car_id: str = Field(..., description="Encrypted car ID")
    customer_email: Optional[str] = Field(None, description="Customer email")
    customer_phone: Optional[str] = Field(None, description="Customer phone")
    customer_name: Optional[str] = Field(None, description="Customer name")
    rental_start_date: str = Field(..., description="Rental start date (YYYY-MM-DD)")
    rental_end_date: str = Field(..., description="Rental end date (YYYY-MM-DD)")
    license_document_url: Optional[str] = Field(None, description="URL to uploaded license document")
    id_document_url: Optional[str] = Field(None, description="URL to uploaded ID document")
    collection_address: Optional[str] = Field(None, description="Vehicle pickup/collection location")
    pickup_time: Optional[str] = Field(None, description="Vehicle pickup time")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "car_id": "encrypted_car_123",
                "customer_email": "customer@example.com",
                "customer_phone": "+96812345678",
                "customer_name": "John Doe",
                "rental_start_date": "2025-11-20",
                "rental_end_date": "2025-11-25",
                "license_document_url": "https://storage.example.com/license.pdf",
                "id_document_url": "https://storage.example.com/id.pdf",
                "collection_address": "123 Main Street, Muscat"
            }
        },
    )

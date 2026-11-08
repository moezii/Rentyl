from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional, Dict, List, Any
from datetime import date, datetime, timezone

# Base rental model with common fields
class RentalBase(BaseModel):
    car_id: int
    client_id: int
    rental_start_date: datetime
    rental_end_date: datetime
    daily_rate: float
    amount_paid: Optional[float] = 0.0
    mileage_before: Optional[int] = 0
    mileage_after: Optional[int] = None
    additional_charges: Optional[float] = 0.0
    additional_charges_description: Optional[str] = ""
    payment_status: Optional[str] = "unpaid"

class RentalCreate(BaseModel):
    car_id: int
    client_id: int
    company_id: int
    rental_start_date: datetime
    rental_end_date: datetime
    daily_rate: Optional[float] = None
    final_price: Optional[float] = None
    payment_status: Optional[str] = "unpaid"
    amount_paid: Optional[float] = 0
    mileage_before: Optional[int] = 0
    additional_charges: Optional[float] = 0
    additional_charges_description: Optional[str] = ""
    notes: Optional[str] = None

class RentalUpdate(BaseModel):
    rental_start_date: Optional[datetime] = None
    rental_end_date: Optional[datetime] = None
    daily_rate: Optional[float] = None
    final_price: Optional[float] = None
    payment_status: Optional[str] = None
    amount_paid: Optional[float] = None
    mileage_before: Optional[int] = None
    mileage_after: Optional[int] = None
    additional_charges: Optional[float] = None
    additional_charges_description: Optional[str] = None
    notes: Optional[str] = None
    car_collected: Optional[bool] = None
    contract_status: Optional[str] = None

class RentalInDB(RentalBase):
    rental_id: Optional[int] = None  # Make rental_id optional with default value
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(
        from_attributes=True,
    )

# FIXED: Updated RentalOut model to handle both string and int rental_id
class RentalOut(BaseModel):
    rental_id: Optional[str] = None  # Keep as string for API compatibility
    car_id: int
    client_id: int
    company_id: int
    rental_start_date: datetime
    rental_end_date: datetime
    total_days: int
    daily_rate: float
    final_price: float
    payment_status: str
    amount_paid: float = 0
    mileage_before: int = 0
    mileage_after: Optional[int] = None
    additional_charges: float = 0
    additional_charges_description: str = ""
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    car_collected: Optional[bool] = False
    contract_status: Optional[str] = "active"

    # FIXED: Add validator to convert int rental_id to string
    @field_validator('rental_id', mode='before')
    @classmethod
    def convert_rental_id_to_string(cls, v):
        if v is not None:
            return str(v)
        return v

    # FIXED: Add validator to ensure datetimes are properly handled
    @field_validator('rental_start_date', 'rental_end_date', mode='before')
    @classmethod
    def parse_datetime(cls, v):
        if isinstance(v, str):
            # Handle ISO format datetime strings
            if 'T' in v:
                # Parse ISO datetime with timezone
                return datetime.fromisoformat(v.replace('Z', '+00:00'))
            else:
                # Parse date-only string as datetime at midnight UTC
                return datetime.fromisoformat(v).replace(tzinfo=timezone.utc)
        elif isinstance(v, date) and not isinstance(v, datetime):
            # Convert date to datetime at midnight UTC
            return datetime.combine(v, datetime.min.time()).replace(tzinfo=timezone.utc)
        return v

    model_config = ConfigDict(
        from_attributes=True,
    )


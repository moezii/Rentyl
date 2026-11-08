# backend/models/car.py - FIXED Oil Change Fields
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, date

class CarBase(BaseModel):
    make: str
    model: str
    year: int
    color: str
    license_plate: str
    type: str
    status: str = "available"
    current_mileage: int = 0
    daily_rate: Optional[float] = None
    weekly_rate: Optional[float] = None
    monthly_rate: Optional[float] = None
    company_id: Optional[int] = None
    
    # Additional fields from your schema
    registration_expiry_date: Optional[date] = None
    insurance_expiry_date: Optional[date] = None
    created_by: Optional[str] = None
    description: Optional[str] = None
    vin: Optional[str] = None
    
    # FIXED: Oil change tracking fields with proper defaults
    oil_change_tracking: bool = False
    oil_change_interval: int = 10000  # Default to 10,000 km
    last_oil_change_mileage: Optional[int] = None

class CarCreate(CarBase):
    pass

class CarInDB(CarBase):
    car_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    image_url: Optional[str] = None

    model_config = ConfigDict(
        from_attributes=True,
    )

class CarOut(CarInDB):
    _id: Optional[str] = None
    carId: Optional[str] = None
    plateNumber: Optional[str] = None
    imageUrl: Optional[str] = None

    model_config = ConfigDict(
        from_attributes=True,
    )

    def __init__(self, **data):
        super().__init__(**data)
        self._id = self.car_id
        self.carId = self.car_id
        self.plateNumber = self.license_plate
        self.imageUrl = self.image_url
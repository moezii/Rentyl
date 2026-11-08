# Updated maintenance model to match the new table schema

from pydantic import BaseModel, field_validator, ConfigDict
from typing import Optional
from datetime import date, datetime

class MaintenanceCreate(BaseModel):
    car_id: int
    maintenance_cost: float
    maintenance_date: str
    description: str
    created_by: Optional[str] = None  # Changed from UUID to string
    
    # Additional fields
    maintenance_type: Optional[str] = "regular"
    service_type: Optional[str] = "oil_change"
    status: Optional[str] = "pending"
    notes: Optional[str] = None
    current_mileage: Optional[int] = 0
    
    # Add validators to handle date conversion
    @field_validator('maintenance_date', mode='before')
    @classmethod
    def parse_maintenance_date(cls, value):
        if isinstance(value, (date, datetime)):
            return value.isoformat()
        return value

class MaintenanceUpdate(BaseModel):
    maintenance_cost: Optional[float] = None
    maintenance_date: Optional[str] = None
    description: Optional[str] = None
    edited_by: Optional[str] = None  # Changed from UUID to string
    maintenance_type: Optional[str] = None
    service_type: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    current_mileage: Optional[int] = None
    
    # Add validators to handle date conversion
    @field_validator('maintenance_date', mode='before')
    @classmethod
    def parse_maintenance_date(cls, value):
        if isinstance(value, (date, datetime)):
            return value.isoformat()
        return value

    model_config = ConfigDict(
        from_attributes=True,
    )
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class CompanyCreate(BaseModel):
    company_name: str
    status: Optional[str] = "active"

class Company(BaseModel):
    company_id: int
    company_name: str
    status: str
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )
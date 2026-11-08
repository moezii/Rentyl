# Updated backend/models/client.py
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import date, datetime

# Document model for client documents
class ClientDocument(BaseModel):
    document_id: Optional[int] = None
    client_id: int
    company_id: int
    name: str
    file_path: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    uploaded_at: Optional[datetime] = None
    url: Optional[str] = None

# Simplified client model without email, address, license fields
class ClientCreate(BaseModel):
    name: str
    phone_number: str
    company_id: int

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    phone_number: Optional[str] = None

# Complete client model with documents
class Client(BaseModel):
    client_id: int
    name: str
    phone_number: str
    company_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    documents: Optional[List[ClientDocument]] = None

    model_config = ConfigDict(
        from_attributes=True,
    )
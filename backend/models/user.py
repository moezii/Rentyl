from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    username: str
    first_name: str
    last_name: str
    role: str  # 'admin' or 'agent'
    created_by: Optional[str] = None  # Admin who created this user

class UserRead(BaseModel):  # <- changed from UserOut
    user_id: str
    username: str
    first_name: str
    last_name: str
    email: str
    role: str

    model_config = ConfigDict(
        from_attributes=True,
    )


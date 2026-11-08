from pydantic import BaseModel, EmailStr, field_validator

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    def validate_password_length(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    username: str
    first_name: str
    last_name: str
    role: str
    created_by: str

    @field_validator("password")
    def validate_password_length(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v

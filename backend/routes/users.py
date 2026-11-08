from fastapi import APIRouter, HTTPException, status, Depends
from backend.models.user import UserCreate, UserRead
from backend.services.user_service import create_user_service, get_users_service
from backend.dependencies import require_admin
from typing import List
from backend.controllers.user_controller import UserController


router = APIRouter(prefix="/users", tags=["Users"])

@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, admin: dict = Depends(require_admin)):
    # Admin only: the payload sets the new user's role
    return UserController.create_user(payload)

@router.get("/", response_model=List[UserRead])
def get_users(admin: dict = Depends(require_admin)):
    # Admin only: lists users across all companies
    return UserController.get_users()
 
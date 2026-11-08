from backend.services.user_service import create_user_service, get_users_service
from backend.models.user import UserCreate
from fastapi import HTTPException
from backend.utils.errors import server_error

class UserController:
    @staticmethod
    def create_user(payload: UserCreate):
        try:
            return create_user_service(payload)
        except Exception as e:
            raise server_error(e)

    @staticmethod
    def get_users():
        try:
            return get_users_service()
        except Exception as e:
            raise server_error(e) 
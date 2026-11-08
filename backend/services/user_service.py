# user_service.py
from backend.services.auth_service import register_user
from backend.supabase.client import supabase
from backend.models.user import UserCreate


def create_user_service(payload: UserCreate):
    # Delegate registration to auth service
    return register_user(payload.model_dump())


def get_users_service():
    # supabase-py v2 raises on errors; the response has no `.error` attribute
    result = supabase.table("users").select("*").execute()
    return result.data or []

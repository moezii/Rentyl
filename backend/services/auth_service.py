from fastapi import HTTPException, Request
from backend.supabase.client import supabase, new_auth_client
from backend.utils.client_ip import get_client_ip
from backend.services.jwt_service import jwt_service
from datetime import datetime, timezone
from typing import Dict, Any, Optional


def get_device_info(request: Request) -> Dict[str, Any]:
    """Extract device information from request with proper IP detection"""
    
    return {
        # Forwarding headers only count when sent by a trusted proxy
        "ip_address": get_client_ip(request),
        "user_agent": request.headers.get("user-agent", ""),
        "fingerprint": request.headers.get("x-device-fingerprint", "")
    }


def login_user(email: str, password: str, request: Request = None):
    """Login user - simplified without security restrictions"""
    
    # Attempt authentication with Supabase
    try:
        # Own client: signing in must not change the shared client's auth state
        response = new_auth_client().auth.sign_in_with_password({
            "email": email,
            "password": password
        })
    except Exception as auth_error:
        print(f"Supabase auth error: {auth_error}")
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not response.session:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_id = response.user.id
    
    # Get complete user profile with company_id
    user_profile = get_user_profile(user_id)
    if not user_profile:
        raise HTTPException(status_code=404, detail="User profile not found")
    
    # Check if user has company_id
    if not user_profile.get("company_id"):
        raise HTTPException(status_code=403, detail="User not associated with any company")
    
    # Prepare user data for token generation
    user_data = {
        "user_id": user_id,
        "email": user_profile["email"],
        "role": user_profile["role"],
        "company_id": user_profile["company_id"]
    }
    
    # Get device info for session tracking
    device_info = get_device_info(request) if request else {}
    
    # Generate our custom JWT tokens
    access_token = jwt_service.generate_access_token(user_data)
    refresh_token = jwt_service.generate_refresh_token(user_data, device_info)
    
    # Include company data in login response to reduce frontend requests
    company_data = None
    if user_profile.get("company"):
        company_data = user_profile["company"]
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": user_id,
            "email": user_profile["email"],
            "role": user_profile["role"],
            "company_id": user_profile["company_id"],
            "username": user_profile.get("username"),
            "first_name": user_profile.get("first_name"),
            "last_name": user_profile.get("last_name")
        },
        "company": company_data  # Include company data to avoid separate request
    }


def register_user(data: dict):
    """Register user with company_id support"""
    # Sign up via Supabase Auth
    # Own client: sign_up returns a session (if confirmation is off) that would
    # otherwise become the shared client's identity
    result = new_auth_client().auth.sign_up({
        "email": data["email"],
        "password": data["password"]
    })

    if not getattr(result, "user", None):
        raise HTTPException(status_code=400, detail="Registration failed")

    user_id = result.user.id

    # Insert additional profile fields into users table with company_id
    user_data = {
        "user_id": user_id,
        "username": data["username"],
        "first_name": data["first_name"],
        "last_name": data["last_name"],
        "email": data["email"],
        "role": data["role"],
        "company_id": data.get("company_id"),  # Include company_id
        "created_by": data.get("created_by"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    insert_resp = supabase.table("users").insert(user_data).execute()

    if not insert_resp.data:
        raise HTTPException(status_code=500, detail="Failed to insert user into database")

    return {"message": "User registered successfully", "user_id": user_id}


def get_profile_from_token(token: str):
    """Get user profile from JWT token"""
    # Verify the token using our JWT service
    payload = jwt_service.verify_access_token(token)
    
    # Get fresh user data from database
    user_data = get_user_profile(payload["user_id"])
    if not user_data:
        raise HTTPException(status_code=404, detail="User profile not found")
    
    return user_data


def get_user_profile(user_id: str) -> Optional[Dict[str, Any]]:
    """Get complete user profile with company information"""
    try:
        # Get user with company details
        result = supabase.table("users").select("""
            *,
            companies:company_id (
                company_id,
                company_name,
                currency,
                status,
                created_at
            )
        """).eq("user_id", user_id).single().execute()
        
        if result.data:
            user_data = result.data.copy()
            
            # Flatten company data if it exists
            if user_data.get("companies"):
                user_data["company"] = user_data.pop("companies")
            return user_data
        else:
            return None
            
    except Exception:
        return None


def refresh_access_token(refresh_token: str, request: Request = None):
    """Refresh access token using refresh token"""
    device_info = get_device_info(request) if request else {}
    
    try:
        tokens = jwt_service.refresh_access_token(refresh_token, device_info)
        return {
            "access_token": tokens["access_token"],
            "refresh_token": tokens["refresh_token"]
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Token refresh error: {e}")
        raise HTTPException(status_code=401, detail="Token refresh failed")


def logout_user(access_token: str, refresh_token: str = None):
    """Properly logout user and revoke tokens"""
    try:
        # Revoke access token
        jwt_service.revoke_token(access_token, "access")
        
        # Revoke refresh token if provided
        if refresh_token:
            jwt_service.revoke_token(refresh_token, "refresh")
        
        return {"message": "Logged out successfully"}
    except Exception as e:
        print(f"Logout error: {e}")
        # Even if logout fails, we should still return success
        # to prevent information leakage
        return {"message": "Logged out successfully"}


def logout_all_devices(user_id: str):
    """Logout user from all devices"""
    try:
        jwt_service.revoke_all_user_sessions(user_id)
        return {"message": "Logged out from all devices successfully"}
    except Exception as e:
        print(f"Logout all devices error: {e}")
        return {"message": "Logged out from all devices successfully"}


def get_user_role(user_id: str):
    """Get user role - kept for backward compatibility"""
    user_profile = get_user_profile(user_id)
    return user_profile.get("role") if user_profile else None


def verify_company_access(user_id: str, required_company_id: int) -> bool:
    """Verify user has access to the specified company"""
    user_profile = get_user_profile(user_id)
    if not user_profile:
        return False
    
    user_company_id = user_profile.get("company_id")
    user_role = user_profile.get("role")
    
    # Admins can access any company, others can only access their own
    if user_role == "admin":
        return True
    
    return user_company_id == required_company_id


def get_user_sessions(user_id: str):
    """Get all active sessions for a user"""
    try:
        result = supabase.table("user_sessions").select("""
            session_id,
            device_fingerprint,
            ip_address,
            user_agent,
            created_at,
            last_used_at,
            expires_at
        """).eq("user_id", user_id).execute()
        
        return result.data or []
    except Exception as e:
        print(f"Error getting user sessions: {e}")
        return []


def revoke_session(session_id: str, user_id: str):
    """Revoke a specific session"""
    try:
        # Verify session belongs to user
        session_result = supabase.table("user_sessions").select("user_id").eq("session_id", session_id).single().execute()
        
        if not session_result.data or session_result.data["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Session not found or access denied")
        
        # Delete the session
        supabase.table("user_sessions").delete().eq("session_id", session_id).execute()
        
        return {"message": "Session revoked successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error revoking session: {e}")
        raise HTTPException(status_code=500, detail="Failed to revoke session")

# backend/routes/auth.py
from fastapi import APIRouter, HTTPException, Header, Request, Response, Cookie, Depends
from backend.utils.errors import server_error
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from backend.models.auth import LoginRequest, RegisterRequest
from backend.dependencies import require_admin
from backend.utils.rate_limit import login_limiter
from backend.services.auth_service import (
    get_profile_from_token, login_user, register_user, 
    refresh_access_token, logout_user, logout_all_devices,
    get_user_sessions, revoke_session
)
import logging
import traceback
import os
from typing import Optional
from datetime import datetime

router = APIRouter()

# === Request Models ===

class RevokeSessionRequest(BaseModel):
    session_id: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    password: str
    access_token: str
    # The recovery link carries both tokens in its URL fragment. Older
    # frontends only sent access_token, which is still accepted.
    refresh_token: Optional[str] = None

# === Environment-aware Cookie Settings ===
def get_cookie_settings():
    """Get cookie settings based on environment"""
    is_production = IS_PRODUCTION
    
    base_settings = {
        "httponly": True,
        "path": "/",
    }
    
    if is_production:
        # Production settings for HTTPS
        base_settings.update({
            "secure": True,
            "samesite": "none",  # Required for cross-site cookies in production
            "domain": None,  # Let browser handle domain automatically
        })
    else:
        # Development settings for HTTP localhost
        base_settings.update({
            "secure": False,
            "samesite": "lax",  # More permissive for localhost
            "domain": None,  # Works for localhost
        })
    
    return base_settings

# Import token expiration settings from config
from backend.config import ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS, IS_PRODUCTION, FRONTEND_BASE_URL

logger = logging.getLogger(__name__)

# Generate cookie settings
COOKIE_SETTINGS = {
    **get_cookie_settings(),
    "max_age": REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60  # Use config value for refresh token
}

ACCESS_COOKIE_SETTINGS = {
    **get_cookie_settings(),
    "max_age": ACCESS_TOKEN_EXPIRE_MINUTES * 60  # Use config value for access token (60 minutes)
}

# === Auth API Endpoints ===

@router.post("/login")
def login(payload: LoginRequest, request: Request, response: Response, _rl: None = Depends(login_limiter)):
    """Login endpoint with HTTP-only cookies"""
    try:
        logger.debug("Login attempt")
        
        # Call the login service
        result = login_user(payload.email, payload.password, request)
        
        # Validate the result has required fields before considering it successful
        if not result or not result.get("access_token") or not result.get("refresh_token") or not result.get("user"):
            raise HTTPException(status_code=500, detail="Invalid login response")
        
        logger.info("Login successful")
        
        # Set HTTP-only cookies
        
        response.set_cookie(
            key="access_token",
            value=result["access_token"],
            **ACCESS_COOKIE_SETTINGS
        )
        
        response.set_cookie(
            key="refresh_token",
            value=result["refresh_token"],
            **COOKIE_SETTINGS
        )
        
        
        # Return user data with company info (no tokens in response body)
        return {
            "message": "Login successful",
            "user": result["user"],
            "company": result.get("company")  # Include company data to reduce frontend requests
        }
        
    except HTTPException as he:
        logger.info("Login failed: %s", he.detail)
        raise he
    except Exception as e:
        raise server_error(e, "Login failed")

@router.post("/register")
def register(payload: RegisterRequest, admin: dict = Depends(require_admin)):
    """Register a new user. Admin only: the payload sets the new user's role, so
    an unauthenticated caller must not be able to create accounts."""
    try:
        logger.debug("Registration attempt")
        
        result = register_user(payload.model_dump())
        logger.info("Registration successful")
        
        return result
        
    except HTTPException as he:
        logger.info("Registration failed: %s", he.detail)
        raise he
    except Exception as e:
        raise server_error(e, "Registration failed")

@router.get("/profile")
def get_profile(access_token: Optional[str] = Cookie(None)):
    """Get user profile endpoint using HTTP-only cookies"""
    try:
        print("Profile request received")
        
        if not access_token:
            raise HTTPException(status_code=401, detail="Access token not found")
        
        result = get_profile_from_token(access_token)
        logger.debug("Profile retrieved")
        
        return result
        
    except HTTPException as he:
        print(f"Profile request failed: {he.detail}")
        raise he
    except Exception as e:
        print(f"Profile error: {str(e)}")
        print(traceback.format_exc())
        raise server_error(e, "Profile retrieval failed")

@router.post("/refresh")
def refresh_token(request: Request, response: Response, refresh_token: Optional[str] = Cookie(None)):
    """Refresh access token endpoint using HTTP-only cookies"""
    try:
        print("Token refresh request received")
        logger.debug("Refresh request cookie names: %s", sorted(request.cookies.keys()))
        print(f"Refresh token parameter: {refresh_token is not None}")
        
        # Try to get refresh token from different sources
        token_to_use = refresh_token
        if not token_to_use:
            # Try to get from request cookies directly
            token_to_use = request.cookies.get("refresh_token")
            print(f"Fallback refresh token from cookies: {token_to_use is not None}")
        
        if not token_to_use:
            print("No refresh token found anywhere")
            raise HTTPException(status_code=401, detail="Refresh token not found")
        
        
        result = refresh_access_token(token_to_use, request)
        print("Token refreshed successfully")
        
        # Update cookies with new tokens
        response.set_cookie(
            key="access_token",
            value=result["access_token"],
            **ACCESS_COOKIE_SETTINGS
        )
        
        response.set_cookie(
            key="refresh_token",
            value=result["refresh_token"],
            **COOKIE_SETTINGS
        )
        
        return {"message": "Tokens refreshed successfully"}
        
    except HTTPException as he:
        print(f"Token refresh failed: {he.detail}")
        raise he
    except Exception as e:
        print(f"Token refresh error: {str(e)}")
        print(traceback.format_exc())
        raise server_error(e, "Token refresh failed")

@router.post("/logout")
def logout(response: Response, access_token: Optional[str] = Cookie(None), refresh_token: Optional[str] = Cookie(None)):
    """Logout endpoint"""
    try:
        print("Logout request received")
        
        # Revoke tokens if they exist
        if access_token or refresh_token:
            logout_user(access_token, refresh_token)
        
        # Clear cookies with proper settings for both environments
        cookie_settings = get_cookie_settings()
        
        # Clear access token cookie
        response.delete_cookie(
            key="access_token", 
            path="/",
            domain=cookie_settings.get("domain"),
            secure=cookie_settings.get("secure", False),
            samesite=cookie_settings.get("samesite", "lax")
        )
        
        # Clear refresh token cookie
        response.delete_cookie(
            key="refresh_token", 
            path="/",
            domain=cookie_settings.get("domain"),
            secure=cookie_settings.get("secure", False),
            samesite=cookie_settings.get("samesite", "lax")
        )
        
        print("User logged out successfully")
        return {"message": "Logged out successfully"}
        
    except HTTPException as he:
        print(f"Logout failed: {he.detail}")
        raise he
    except Exception as e:
        print(f"Logout error: {str(e)}")
        print(traceback.format_exc())
        raise server_error(e, "Logout failed")

@router.post("/logout-all")
def logout_all(response: Response, access_token: Optional[str] = Cookie(None)):
    """Logout from all devices"""
    try:
        print("Logout all devices request received")
        
        if not access_token:
            raise HTTPException(status_code=401, detail="Access token required")
        
        # Get user ID from token
        from backend.services.jwt_service import jwt_service
        payload = jwt_service.verify_access_token(access_token)
        user_id = payload["user_id"]
        
        # Logout from all devices
        logout_all_devices(user_id)
        
        # Clear cookies
        response.delete_cookie(key="access_token", path="/")
        response.delete_cookie(key="refresh_token", path="/")
        
        logger.info("User logged out from all devices")
        return {"message": "Logged out from all devices successfully"}
        
    except HTTPException as he:
        print(f"Logout all failed: {he.detail}")
        raise he
    except Exception as e:
        print(f"Logout all error: {str(e)}")
        print(traceback.format_exc())
        raise server_error(e, "Logout all failed")

@router.get("/sessions")
def get_sessions(access_token: Optional[str] = Cookie(None)):
    """Get all active sessions for the current user"""
    try:
        if not access_token:
            raise HTTPException(status_code=401, detail="Access token required")
        
        # Get user ID from token
        from backend.services.jwt_service import jwt_service
        payload = jwt_service.verify_access_token(access_token)
        user_id = payload["user_id"]
        
        sessions = get_user_sessions(user_id)
        return {"sessions": sessions}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Get sessions error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get sessions")

@router.post("/revoke-session")
def revoke_user_session(payload: RevokeSessionRequest, access_token: Optional[str] = Cookie(None)):
    """Revoke a specific session"""
    try:
        if not access_token:
            raise HTTPException(status_code=401, detail="Access token required")
        
        # Get user ID from token
        from backend.services.jwt_service import jwt_service
        token_payload = jwt_service.verify_access_token(access_token)
        user_id = token_payload["user_id"]
        
        result = revoke_session(payload.session_id, user_id)
        return result
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Revoke session error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to revoke session")

@router.get("/check")
def check_auth(access_token: Optional[str] = Cookie(None)):
    """Check if user is authenticated"""
    try:
        if not access_token:
            return {"authenticated": False}

        from backend.services.jwt_service import jwt_service
        payload = jwt_service.verify_access_token(access_token)

        return {
            "authenticated": True,
            "user_id": payload["user_id"],
            "role": payload["role"],
            "company_id": payload["company_id"]
        }

    except Exception:
        return {"authenticated": False}

@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest):
    """Request password reset email"""
    try:
        logger.info("Password reset requested")

        # Use Supabase's resetPasswordForEmail method
        from backend.supabase.client import supabase

        # Supabase will send reset email to the user with a link to the redirect URL
        supabase.auth.reset_password_for_email(
            payload.email,
            options={
                "redirect_to": f"{FRONTEND_BASE_URL}/resetpass"
            }
        )

        # Always return success to prevent email enumeration
        return {
            "message": "If an account exists with this email, a password reset link has been sent."
        }

    except Exception as e:
        print(f"Password reset error: {str(e)}")
        # Still return success to prevent email enumeration
        return {
            "message": "If an account exists with this email, a password reset link has been sent."
        }

@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest):
    """Reset password using token from email"""
    try:
        print("Password reset attempt")

        if not payload.access_token:
            raise HTTPException(status_code=401, detail="Reset token required")

        # A client of its own for this reset session (never the shared client)
        from backend.supabase.client import new_auth_client
        reset_client = new_auth_client()

        # Set the session from the recovery link. The access token used to be
        # passed as the refresh token too, which only works while it is still
        # valid and fails if supabase-py needs to refresh it.
        reset_client.auth.set_session(payload.access_token, payload.refresh_token or payload.access_token)

        # Update the user's password using the authenticated client
        response = reset_client.auth.update_user({
            "password": payload.password
        })

        if not response.user:
            raise HTTPException(status_code=400, detail="Failed to reset password")

        logger.info("Password reset successful")

        return {
            "message": "Password reset successfully"
        }

    except HTTPException as he:
        print(f"Password reset failed: {he.detail}")
        raise he
    except Exception as e:
        print(f"Password reset error: {str(e)}")
        raise HTTPException(status_code=500, detail="Password reset failed")


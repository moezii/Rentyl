# backend/dependencies.py
from fastapi import HTTPException, Request, Depends, Cookie
from backend.services.jwt_service import jwt_service
from backend.services.auth_service import get_user_profile
from typing import Optional, Union
import traceback
import logging

logger = logging.getLogger(__name__)

def get_access_token_from_request(request: Request) -> Optional[str]:
    """Extract access token from request cookies with robust handling"""
    try:
        # Method 1: Try to get from request.cookies directly
        if hasattr(request, 'cookies') and 'access_token' in request.cookies:
            token = request.cookies.get('access_token')
            if token and isinstance(token, str):
                return token
        
        # Method 2: Try to get from headers if cookie method fails
        if hasattr(request, 'headers'):
            cookie_header = request.headers.get('cookie', '')
            if 'access_token=' in cookie_header:
                # Parse access_token from cookie header manually
                for cookie_part in cookie_header.split(';'):
                    cookie_part = cookie_part.strip()
                    if cookie_part.startswith('access_token='):
                        return cookie_part.split('=', 1)[1]
        
        return None
    except Exception as e:
        print(f"[ERROR] Failed to extract access token from request: {e}")
        return None

def get_current_user_with_company(
    request: Request, 
    access_token: Optional[str] = Cookie(None)
) -> dict:
    """Get current user with company information for authenticated requests using HTTP-only cookies."""
    try:
        # Handle different ways the access_token might be provided
        token = None
        
        # If access_token is provided directly and is a string
        if access_token and isinstance(access_token, str):
            token = access_token
        else:
            # Extract token from request cookies using robust method
            token = get_access_token_from_request(request)
        
        # Check if access token exists
        if not token:
            raise HTTPException(status_code=401, detail="Access token not found")
        
        # Verify the access token using our JWT service
        try:
            payload = jwt_service.verify_access_token(token)
        except HTTPException:
            raise
        except Exception as e:
            print(f"Token verification error: {str(e)}")
            raise HTTPException(status_code=401, detail="Token verification failed")
        
        user_id = payload["user_id"]
        
        # Get fresh user profile with company info
        try:
            user_data = get_user_profile(user_id)
            if not user_data:
                logger.warning("User profile not found for authenticated token")
                raise HTTPException(status_code=404, detail="User profile not found")
        except HTTPException as he:
            raise he
        except Exception as e:
            print(f"User profile fetch error: {str(e)}")
            traceback.print_exc()
            raise HTTPException(status_code=500, detail="Failed to fetch user profile")
        
        # Check if user has company association
        if not user_data.get("company_id"):
            raise HTTPException(status_code=403, detail="User not associated with any company")
        
        return {
            "user_id": user_id,
            "company_id": user_data["company_id"],
            "role": user_data.get("role"),
            "email": user_data.get("email"),
            "username": user_data.get("username"),
            "first_name": user_data.get("first_name"),
            "last_name": user_data.get("last_name"),
            "company": user_data.get("company")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Authentication error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=401, detail="Authentication failed")

def get_current_user(request: Request, access_token: Optional[str] = Cookie(None)) -> str:
    """Legacy function - returns just user_id for backward compatibility."""
    user_context = get_current_user_with_company(request, access_token)
    return user_context["user_id"]

def get_current_company_id(request: Request, access_token: Optional[str] = Cookie(None)) -> int:
    """Extract company_id from user context."""
    try:
        user_context = get_current_user_with_company(request, access_token)
        return user_context["company_id"]
    except Exception as e:
        raise HTTPException(status_code=401, detail="Unable to determine company context")

def get_current_user_role(request: Request, access_token: Optional[str] = Cookie(None)) -> str:
    """Extract user role from user context."""
    try:
        user_context = get_current_user_with_company(request, access_token)
        return user_context["role"]
    except Exception as e:
        raise HTTPException(status_code=401, detail="Unable to determine user role")

def require_admin(request: Request, access_token: Optional[str] = Cookie(None)) -> dict:
    """Require admin role for access."""
    user_context = get_current_user_with_company(request, access_token)
    if user_context["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user_context


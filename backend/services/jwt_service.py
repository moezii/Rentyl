import jwt
import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from fastapi import HTTPException
from backend.supabase.client import supabase
import hashlib
import threading
import uuid
from backend.config import JWT_SECRET_KEY, JWT_ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS
import logging

logger = logging.getLogger(__name__)

class JWTService:
    def __init__(self):
        self.secret_key = JWT_SECRET_KEY
        self.algorithm = JWT_ALGORITHM
        self.access_token_expire = ACCESS_TOKEN_EXPIRE_MINUTES
        self.refresh_token_expire = REFRESH_TOKEN_EXPIRE_DAYS
        self.max_sessions_per_user = 5  # Limit concurrent sessions
        
        # Ensure we have a secure secret key in production
        if self.secret_key == "your-super-secret-jwt-key-change-in-production":
            print("[WARNING] Using default JWT secret key. Change JWT_SECRET_KEY in production!")
        
        # Create sessions table if it doesn't exist (handled by Supabase migration)
        self._ensure_sessions_table()
    
    def _ensure_sessions_table(self):
        """Ensure sessions table exists for session tracking"""
        # This would typically be handled by a database migration
        # For now, we'll assume the table exists
        pass
    
    def generate_access_token(self, user_data: Dict[str, Any]) -> str:
        """Generate a short-lived access token"""
        payload = {
            **user_data,
            "exp": datetime.now(timezone.utc) + timedelta(minutes=self.access_token_expire),
            "iat": datetime.now(timezone.utc),
            "type": "access",
            "jti": str(uuid.uuid4())  # JWT ID for tracking
        }
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    def generate_refresh_token(self, user_data: Dict[str, Any], device_info: Dict[str, Any] = None) -> str:
        """Generate a long-lived refresh token with session tracking"""
        now = datetime.now(timezone.utc)
        expire = now + timedelta(days=self.refresh_token_expire)
        
        session_id = str(uuid.uuid4())
        user_id = user_data["user_id"]
        
        # Clean up old sessions in the background (don't wait for it). This method
        # is called from sync code (often in a threadpool worker without an event
        # loop), so asyncio.ensure_future() would schedule the cleanup on a loop that
        # never runs; a daemon thread works in every context.
        try:
            threading.Thread(target=self._cleanup_user_sessions, args=(user_id,), daemon=True).start()
        except Exception as e:
            logger.warning("Failed to schedule session cleanup: %s", e)
        
        payload = {
            **user_data,
            "session_id": session_id,
            "type": "refresh",
            "exp": expire,
            "iat": now,
            "jti": str(uuid.uuid4())  # JWT ID for tracking
        }
        
        refresh_token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
        
        # Store session in database - reduced retries for performance
        session_stored = self._store_session_with_retry(
            session_id=session_id,
            user_id=user_id,
            refresh_token_hash=self._hash_token(refresh_token),
            device_info=device_info or {},
            expires_at=expire,
            max_retries=1  # Reduced from 3 to 1 for faster login
        )
        
        if not session_stored:
            print(f"[WARNING] Failed to store session {session_id} after retries - token still valid")
        
        return refresh_token
    
    def verify_access_token(self, token: str) -> Dict[str, Any]:
        """Verify and decode access token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            
            if payload.get("type") != "access":
                raise jwt.InvalidTokenError("Invalid token type")
            
            # Check if token is blacklisted
            jti = payload.get("jti")
            if jti and self._is_token_blacklisted(jti):
                raise jwt.InvalidTokenError("Token has been revoked")
            
            return payload
        except jwt.ExpiredSignatureError as e:
            print(f"[ERROR] Access token expired: {e}")
            raise jwt.ExpiredSignatureError("Access token has expired")
        except jwt.InvalidTokenError as e:
            print(f"[ERROR] Invalid access token: {e}")
            raise jwt.InvalidTokenError(f"Invalid access token: {str(e)}")
        except Exception as e:
            print(f"[ERROR] Unexpected error verifying access token: {e}")
            raise jwt.InvalidTokenError(f"Token verification failed: {str(e)}")
    
    def verify_refresh_token(self, token: str) -> Dict[str, Any]:
        """Verify and decode refresh token with improved error handling"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            
            if payload.get("type") != "refresh":
                raise jwt.InvalidTokenError("Invalid token type")
            
            session_id = payload.get("session_id")
            user_id = payload.get("user_id")
            
            # A refresh token is only valid while its session row exists: logout,
            # revoke-session and logout-all all delete the session, so a missing
            # session must not be accepted (it used to be, which made those
            # revocations ineffective for up to REFRESH_TOKEN_EXPIRE_DAYS).
            if not session_id:
                raise jwt.InvalidTokenError("Refresh token has no session")

            # Verify session exists and is valid
            session = self._get_session(session_id)
            if session:
                # Check if session belongs to the same user
                if session.get("user_id") != user_id:
                    raise jwt.InvalidTokenError("Session user mismatch")
                
                # Verify token hash matches stored hash
                if not self._verify_token_hash(token, session["refresh_token_hash"]):
                    raise jwt.InvalidTokenError("Invalid refresh token hash")
                
                # Update last_used_at timestamp
                self._update_session_last_used(session_id)
            else:
                raise jwt.InvalidTokenError("Session not found or revoked")
            
            return payload
            
        except jwt.ExpiredSignatureError:
            # Clean up expired session if possible
            try:
                if 'payload' in locals() and payload.get("session_id"):
                    self._delete_session(payload["session_id"])
            except Exception:
                pass  # Ignore cleanup errors
            raise jwt.ExpiredSignatureError("Refresh token has expired")
        except jwt.InvalidTokenError as e:
            raise jwt.InvalidTokenError(f"Invalid refresh token: {str(e)}")
    
    def refresh_access_token(self, refresh_token: str, device_info: Dict[str, Any] = None) -> Dict[str, str]:
        """Refresh access token and generate new refresh token - FIXED to prevent infinite loops"""
        try:
            # Verify refresh token first
            payload = self.verify_refresh_token(refresh_token)
            
            # Get fresh user data to ensure it's still valid
            user_data = {
                "user_id": payload["user_id"],
                "email": payload["email"], 
                "role": payload["role"],
                "company_id": payload.get("company_id")
            }
            
            # Generate new access token (always generate new one)
            new_access_token = self.generate_access_token(user_data)
            
            # For refresh token, we have two strategies:
            # 1. Reuse the same session if it's still valid (prevent session proliferation)  
            # 2. Generate new session only if current one is close to expiry
            
            old_session_id = payload.get("session_id")
            current_exp = payload.get("exp", 0)
            now = datetime.now(timezone.utc).timestamp()
            time_until_expiry = current_exp - now
            
            # If token expires within 1 day, generate new refresh token
            if time_until_expiry < (24 * 60 * 60):  # Less than 1 day
                new_refresh_token = self.generate_refresh_token(user_data, device_info)
                
                # Clean up old session ONLY after new one is successfully created
                if old_session_id:
                    try:
                        self._delete_session(old_session_id)
                    except Exception:
                        pass  # Ignore cleanup errors
            else:
                # Reuse existing refresh token if it's still good
                new_refresh_token = refresh_token
                
                # Just update the session's last_used_at
                if old_session_id:
                    self._update_session_last_used(old_session_id)
            
            return {
                "access_token": new_access_token,
                "refresh_token": new_refresh_token
            }
            
        except Exception as e:
            print(f"[ERROR] Token refresh failed: {e}")
            raise e

    def revoke_token(self, token: str, token_type: str = "access"):
        """Revoke a token (add to blacklist)"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm], options={"verify_exp": False})
            jti = payload.get("jti")
            
            if not jti:
                print(f"[WARNING] Cannot blacklist token without JTI")
                return  # Can't blacklist token without JTI
            
            # Try new schema first, fallback to old schema for compatibility
            try:
                # New schema with all columns
                blacklist_data = {
                    "jti": jti,
                    "token_type": token_type,
                    "user_id": payload.get("user_id"),
                    "revoked_at": datetime.now(timezone.utc).isoformat(),
                    "expires_at": datetime.fromtimestamp(payload.get("exp", 0), timezone.utc).isoformat() if payload.get("exp") else None
                }
                supabase.table("token_blacklist").insert(blacklist_data).execute()
                print(f"[INFO] Token {jti} blacklisted successfully (new schema)")
                
            except Exception as schema_error:
                print(f"[WARNING] New schema failed, trying old schema: {schema_error}")
                # Fallback to old schema (minimal columns)
                blacklist_data = {
                    "jti": jti,
                    "expires_at": datetime.fromtimestamp(payload.get("exp", 0), timezone.utc).isoformat() if payload.get("exp") else None,
                    "blacklisted_at": datetime.now(timezone.utc).isoformat()
                }
                supabase.table("token_blacklist").insert(blacklist_data).execute()
                print(f"[INFO] Token {jti} blacklisted successfully (fallback schema)")
            
            # If it's a refresh token, also delete the session
            if token_type == "refresh" and payload.get("session_id"):
                self._delete_session(payload["session_id"])
                
        except Exception as e:
            print(f"[ERROR] Failed to revoke token: {e}")

    def revoke_all_user_sessions(self, user_id: str):
        """Revoke all sessions for a user"""
        try:
            # Delete all user sessions
            result = supabase.table("user_sessions").delete().eq("user_id", user_id).execute()
            logger.info("Revoked all sessions for user")
        except Exception as e:
            print(f"[ERROR] Failed to revoke all user sessions: {e}")
    
    def _store_session_with_retry(self, session_id: str, user_id: str, refresh_token_hash: str, 
                                 device_info: Dict[str, Any], expires_at: datetime, max_retries: int = 3) -> bool:
        """Store session in database with retry logic"""
        for attempt in range(max_retries):
            try:
                session_data = {
                    "session_id": session_id,
                    "user_id": user_id,
                    "refresh_token_hash": refresh_token_hash,
                    "device_fingerprint": device_info.get("fingerprint", ""),
                    "ip_address": device_info.get("ip_address", ""),
                    "user_agent": device_info.get("user_agent", ""),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "expires_at": expires_at.isoformat(),
                    "last_used_at": datetime.now(timezone.utc).isoformat()
                }
                
                result = supabase.table("user_sessions").insert(session_data).execute()
                
                if result.data:
                    print(f"[INFO] Session {session_id} stored successfully on attempt {attempt + 1}")
                    return True
                else:
                    print(f"[WARNING] Session insert returned no data on attempt {attempt + 1}")
                    
            except Exception as e:
                print(f"[ERROR] Failed to store session {session_id} on attempt {attempt + 1}: {e}")
                if attempt == max_retries - 1:
                    print(f"[ERROR] Failed to store session after {max_retries} attempts")
                    return False
                    
        return False
    
    def _cleanup_user_sessions(self, user_id: str):
        """Clean up old sessions for user to prevent accumulation"""
        try:
            # Get all sessions for user, ordered by last_used_at desc
            result = supabase.table("user_sessions").select("session_id, last_used_at").eq("user_id", user_id).order("last_used_at", desc=True).execute()
            
            if result.data and len(result.data) >= self.max_sessions_per_user:
                # Keep only the most recent sessions
                sessions_to_keep = result.data[:self.max_sessions_per_user-1]  # -1 because we're adding a new one
                sessions_to_delete = result.data[self.max_sessions_per_user-1:]
                
                for session in sessions_to_delete:
                    self._delete_session(session["session_id"])
                    
                logger.info("Cleaned up %d old sessions", len(sessions_to_delete))
                
        except Exception as e:
            logger.warning("Failed to cleanup old sessions: %s", e)
    
    
    def _update_session_last_used(self, session_id: str):
        """Update session's last_used_at timestamp"""
        try:
            update_data = {
                "last_used_at": datetime.now(timezone.utc).isoformat()
            }
            supabase.table("user_sessions").update(update_data).eq("session_id", session_id).execute()
        except Exception as e:
            print(f"[WARNING] Failed to update last_used_at for session {session_id}: {e}")
    
    def _store_session(self, session_id: str, user_id: str, refresh_token_hash: str, 
                      device_info: Dict[str, Any], expires_at: datetime):
        """Store session in database with improved error handling - DEPRECATED, use _store_session_with_retry"""
        return self._store_session_with_retry(session_id, user_id, refresh_token_hash, device_info, expires_at)
    
    def _get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session from database with improved error handling"""
        try:
            result = supabase.table("user_sessions").select("*").eq("session_id", session_id).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]  # Return first match
            else:
                return None
                
        except Exception as e:
            print(f"[ERROR] Failed to get session {session_id}: {e}")
            return None
    
    def _delete_session(self, session_id: str):
        """Delete session from database with improved error handling"""
        try:
            result = supabase.table("user_sessions").delete().eq("session_id", session_id).execute()
            print(f"[INFO] Session {session_id} deleted successfully")
        except Exception as e:
            print(f"[ERROR] Failed to delete session {session_id}: {e}")
            # Don't raise - session cleanup failures shouldn't break auth flow
    
    def _hash_token(self, token: str) -> str:
        """Hash token for secure storage"""
        return hashlib.sha256(token.encode()).hexdigest()
    
    def _verify_token_hash(self, token: str, stored_hash: str) -> bool:
        """Verify token against stored hash"""
        return self._hash_token(token) == stored_hash
    
    def _is_token_blacklisted(self, jti: str) -> bool:
        """Check if token is blacklisted"""
        if not jti:
            return False
        try:
            result = supabase.table("token_blacklist").select("jti").eq("jti", jti).execute()
            
            # Check if any records were found
            if result.data and len(result.data) > 0:
                print(f"[INFO] Token {jti} found in blacklist")
                return True
            else:
                return False
        except Exception as e:
            logger.warning("Could not check token blacklist: %s", e)
            # Fail closed: if revocation can't be checked, treat the token as
            # revoked. A database outage then logs users out instead of letting
            # revoked tokens through.
            return True
    
    def cleanup_expired_tokens(self):
        """Clean up expired sessions and blacklisted tokens"""
        try:
            now = datetime.now(timezone.utc).isoformat()
            
            # Clean up expired sessions
            result1 = supabase.table("user_sessions").delete().lt("expires_at", now).execute()
            
            # Clean up expired blacklisted tokens
            result2 = supabase.table("token_blacklist").delete().lt("expires_at", now).execute()
            
            print(f"[INFO] Cleanup completed - removed expired sessions and blacklisted tokens")
        except Exception as e:
            print(f"Error cleaning up expired tokens: {e}")

# Create global JWT service instance
jwt_service = JWTService() 
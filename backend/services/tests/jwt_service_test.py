"""
Unit tests for JWT Service

Tests token generation, validation, session management, and security features.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta, timezone
import jwt as pyjwt
import hashlib
import uuid

from backend.services.jwt_service import JWTService
from backend.config import ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS


class TestJWTServiceInit:
    """Tests for JWTService initialization"""
    
    def test_init_sets_correct_defaults(self):
        """Test that JWTService initializes with correct default values"""
        service = JWTService()
        
        assert service.secret_key is not None
        assert service.algorithm == "HS256"
        assert service.access_token_expire == ACCESS_TOKEN_EXPIRE_MINUTES
        assert service.refresh_token_expire == REFRESH_TOKEN_EXPIRE_DAYS
        assert service.max_sessions_per_user == 5


class TestGenerateAccessToken:
    """Tests for access token generation"""
    
    def test_generate_access_token_success(self):
        """Test successful access token generation"""
        service = JWTService()
        user_data = {
            "user_id": "123",
            "email": "test@example.com",
            "role": "user",
            "company_id": 1
        }
        
        token = service.generate_access_token(user_data)
        
        assert token is not None
        assert isinstance(token, str)
        
        # Decode and verify payload
        payload = pyjwt.decode(token, service.secret_key, algorithms=[service.algorithm])
        assert payload["user_id"] == "123"
        assert payload["email"] == "test@example.com"
        assert payload["role"] == "user"
        assert payload["company_id"] == 1
        assert payload["type"] == "access"
        assert "exp" in payload
        assert "iat" in payload
        assert "jti" in payload
    
    def test_generate_access_token_expiry(self):
        """Test that access token has correct expiration time"""
        service = JWTService()
        user_data = {"user_id": "123", "email": "test@example.com"}
        
        before_time = datetime.now(timezone.utc)
        token = service.generate_access_token(user_data)
        after_time = datetime.now(timezone.utc)
        
        payload = pyjwt.decode(token, service.secret_key, algorithms=[service.algorithm])
        exp_time = datetime.fromtimestamp(payload["exp"], timezone.utc)
        
        # Should expire in ~ACCESS_TOKEN_EXPIRE_MINUTES
        expected = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        expected_min = before_time + expected - timedelta(seconds=10)
        expected_max = after_time + expected + timedelta(seconds=10)
        
        assert expected_min <= exp_time <= expected_max
    
    def test_generate_access_token_unique_jti(self):
        """Test that each token gets a unique JTI"""
        service = JWTService()
        user_data = {"user_id": "123", "email": "test@example.com"}
        
        token1 = service.generate_access_token(user_data)
        token2 = service.generate_access_token(user_data)
        
        payload1 = pyjwt.decode(token1, service.secret_key, algorithms=[service.algorithm])
        payload2 = pyjwt.decode(token2, service.secret_key, algorithms=[service.algorithm])
        
        assert payload1["jti"] != payload2["jti"]


class TestGenerateRefreshToken:
    """Tests for refresh token generation"""
    
    @patch('backend.services.jwt_service.supabase')
    def test_generate_refresh_token_success(self, mock_supabase):
        """Test successful refresh token generation"""
        # Mock database insert
        mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [{"session_id": "test"}]
        
        service = JWTService()
        user_data = {
            "user_id": "123",
            "email": "test@example.com",
            "role": "user"
        }
        device_info = {
            "fingerprint": "abc123",
            "ip_address": "192.168.1.1",
            "user_agent": "Mozilla/5.0"
        }
        
        token = service.generate_refresh_token(user_data, device_info)
        
        assert token is not None
        assert isinstance(token, str)
        
        # Decode and verify payload
        payload = pyjwt.decode(token, service.secret_key, algorithms=[service.algorithm])
        assert payload["user_id"] == "123"
        assert payload["type"] == "refresh"
        assert "session_id" in payload
        assert "exp" in payload
        assert "jti" in payload
    
    @patch('backend.services.jwt_service.supabase')
    def test_generate_refresh_token_stores_session(self, mock_supabase):
        """Test that refresh token generation stores session in database"""
        mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [{"session_id": "test"}]
        
        service = JWTService()
        user_data = {"user_id": "123", "email": "test@example.com"}
        device_info = {"fingerprint": "abc123"}
        
        token = service.generate_refresh_token(user_data, device_info)
        
        # Verify database insert was called
        mock_supabase.table.assert_called_with("user_sessions")
        mock_supabase.table.return_value.insert.assert_called_once()
    
    @patch('backend.services.jwt_service.supabase')
    def test_generate_refresh_token_expiry(self, mock_supabase):
        """Test that refresh token has correct expiration time (REFRESH_TOKEN_EXPIRE_DAYS)"""
        mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [{"session_id": "test"}]
        
        service = JWTService()
        user_data = {"user_id": "123", "email": "test@example.com"}
        
        before_time = datetime.now(timezone.utc)
        token = service.generate_refresh_token(user_data)
        after_time = datetime.now(timezone.utc)
        
        payload = pyjwt.decode(token, service.secret_key, algorithms=[service.algorithm])
        exp_time = datetime.fromtimestamp(payload["exp"], timezone.utc)
        
        # Should expire in ~REFRESH_TOKEN_EXPIRE_DAYS
        expected = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        expected_min = before_time + expected - timedelta(hours=1)
        expected_max = after_time + expected + timedelta(hours=1)
        
        assert expected_min <= exp_time <= expected_max


class TestVerifyAccessToken:
    """Tests for access token verification"""
    
    @patch('backend.services.jwt_service.supabase')
    def test_verify_access_token_success(self, mock_supabase):
        """Test successful access token verification"""
        # empty blacklist (the check fails closed if the database is unreachable)
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        service = JWTService()
        user_data = {"user_id": "123", "email": "test@example.com"}
        
        token = service.generate_access_token(user_data)
        payload = service.verify_access_token(token)
        
        assert payload is not None
        assert payload["user_id"] == "123"
        assert payload["email"] == "test@example.com"
        assert payload["type"] == "access"
    
    def test_verify_access_token_expired(self):
        """Test that expired access token raises ExpiredSignatureError"""
        service = JWTService()
        user_data = {"user_id": "123", "email": "test@example.com"}
        
        # Create token with past expiration
        payload = {
            **user_data,
            "exp": datetime.now(timezone.utc) - timedelta(minutes=10),
            "iat": datetime.now(timezone.utc) - timedelta(minutes=20),
            "type": "access",
            "jti": str(uuid.uuid4())
        }
        expired_token = pyjwt.encode(payload, service.secret_key, algorithm=service.algorithm)
        
        with pytest.raises(pyjwt.ExpiredSignatureError):
            service.verify_access_token(expired_token)
    
    def test_verify_access_token_invalid_type(self):
        """Test that refresh token fails access token verification"""
        service = JWTService()
        user_data = {"user_id": "123", "email": "test@example.com"}
        
        # Create token with wrong type
        payload = {
            **user_data,
            "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
            "iat": datetime.now(timezone.utc),
            "type": "refresh",  # Wrong type!
            "jti": str(uuid.uuid4())
        }
        wrong_type_token = pyjwt.encode(payload, service.secret_key, algorithm=service.algorithm)
        
        with pytest.raises(pyjwt.InvalidTokenError, match="Invalid token type"):
            service.verify_access_token(wrong_type_token)
    
    def test_verify_access_token_invalid_signature(self):
        """Test that token with invalid signature fails verification"""
        service = JWTService()
        
        # Create token with different secret
        payload = {
            "user_id": "123",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
            "type": "access",
            "jti": str(uuid.uuid4())
        }
        invalid_token = pyjwt.encode(payload, "wrong-secret-0123456789abcdef0123456789", algorithm="HS256")
        
        with pytest.raises(pyjwt.InvalidTokenError):
            service.verify_access_token(invalid_token)
    
    @patch('backend.services.jwt_service.supabase')
    def test_verify_access_token_blacklisted(self, mock_supabase):
        """Test that blacklisted token fails verification"""
        # Mock blacklist check to return True
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [{"jti": "test-jti"}]
        
        service = JWTService()
        user_data = {"user_id": "123", "email": "test@example.com"}
        
        token = service.generate_access_token(user_data)
        
        with pytest.raises(pyjwt.InvalidTokenError, match="Token has been revoked"):
            service.verify_access_token(token)


class TestVerifyRefreshToken:
    """Tests for refresh token verification"""
    
    @patch('backend.services.jwt_service.supabase')
    def test_verify_refresh_token_success(self, mock_supabase):
        """Test successful refresh token verification"""
        # Mock session lookup
        session_data = {
            "session_id": "test-session",
            "user_id": "123",
            "refresh_token_hash": None  # Will be set dynamically
        }
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [session_data]
        mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [session_data]
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = Mock()
        
        service = JWTService()
        user_data = {"user_id": "123", "email": "test@example.com"}
        
        token = service.generate_refresh_token(user_data)
        
        # Update mock with actual hash
        session_data["refresh_token_hash"] = service._hash_token(token)
        
        payload = service.verify_refresh_token(token)
        
        assert payload is not None
        assert payload["user_id"] == "123"
        assert payload["type"] == "refresh"
    
    @patch('backend.services.jwt_service.supabase')
    def test_verify_refresh_token_expired(self, mock_supabase):
        """Test that expired refresh token raises ExpiredSignatureError"""
        service = JWTService()
        
        # Create expired token
        payload = {
            "user_id": "123",
            "email": "test@example.com",
            "session_id": "test-session",
            "exp": datetime.now(timezone.utc) - timedelta(days=1),
            "iat": datetime.now(timezone.utc) - timedelta(days=4),
            "type": "refresh",
            "jti": str(uuid.uuid4())
        }
        expired_token = pyjwt.encode(payload, service.secret_key, algorithm=service.algorithm)
        
        with pytest.raises(pyjwt.ExpiredSignatureError):
            service.verify_refresh_token(expired_token)
    
    @patch('backend.services.jwt_service.supabase')
    def test_verify_refresh_token_session_user_mismatch(self, mock_supabase):
        """Test that token fails if session belongs to different user"""
        # Mock session with different user_id
        session_data = {
            "session_id": "test-session",
            "user_id": "999",  # Different user!
            "refresh_token_hash": "hash"
        }
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [session_data]
        mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [session_data]
        
        service = JWTService()
        user_data = {"user_id": "123", "email": "test@example.com"}
        
        token = service.generate_refresh_token(user_data)
        
        with pytest.raises(pyjwt.InvalidTokenError, match="Session user mismatch"):
            service.verify_refresh_token(token)


class TestRefreshAccessToken:
    """Tests for token refresh functionality"""
    
    @patch('backend.services.jwt_service.supabase')
    def test_refresh_access_token_success(self, mock_supabase):
        """Test successful access token refresh"""
        # Mock session operations
        session_data = {"session_id": "test", "user_id": "123", "refresh_token_hash": None}
        mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [session_data]
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [session_data]
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = Mock()
        
        service = JWTService()
        user_data = {"user_id": "123", "email": "test@example.com", "role": "user", "company_id": 1}
        
        refresh_token = service.generate_refresh_token(user_data)
        session_data["refresh_token_hash"] = service._hash_token(refresh_token)
        
        result = service.refresh_access_token(refresh_token)
        
        assert "access_token" in result
        assert "refresh_token" in result
        assert isinstance(result["access_token"], str)
        assert isinstance(result["refresh_token"], str)
    
    @patch('backend.services.jwt_service.supabase')
    def test_refresh_access_token_reuses_refresh_token_if_valid(self, mock_supabase):
        """Test that refresh token is reused if still valid (>1 day until expiry)"""
        session_data = {"session_id": "test", "user_id": "123", "refresh_token_hash": None}
        mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [session_data]
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [session_data]
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = Mock()
        
        service = JWTService()
        user_data = {"user_id": "123", "email": "test@example.com", "role": "user"}
        
        refresh_token = service.generate_refresh_token(user_data)
        session_data["refresh_token_hash"] = service._hash_token(refresh_token)
        
        result = service.refresh_access_token(refresh_token)
        
        # Should reuse the same refresh token
        assert result["refresh_token"] == refresh_token


class TestTokenRevocation:
    """Tests for token revocation and blacklisting"""
    
    @patch('backend.services.jwt_service.supabase')
    def test_revoke_token_success(self, mock_supabase):
        """Test successful token revocation"""
        mock_supabase.table.return_value.insert.return_value.execute.return_value = Mock()
        
        service = JWTService()
        user_data = {"user_id": "123", "email": "test@example.com"}
        
        token = service.generate_access_token(user_data)
        
        # Should not raise exception
        service.revoke_token(token, "access")
        
        # Verify blacklist insert was called
        mock_supabase.table.assert_called()
    
    @patch('backend.services.jwt_service.supabase')
    def test_revoke_all_user_sessions(self, mock_supabase):
        """Test revoking all sessions for a user"""
        mock_supabase.table.return_value.delete.return_value.eq.return_value.execute.return_value = Mock()
        
        service = JWTService()
        
        service.revoke_all_user_sessions("123")
        
        # Verify delete was called with correct user_id
        mock_supabase.table.assert_called_with("user_sessions")


class TestTokenHashing:
    """Tests for token hashing utilities"""
    
    def test_hash_token_consistent(self):
        """Test that hashing same token produces same hash"""
        service = JWTService()
        token = "test-token-123"
        
        hash1 = service._hash_token(token)
        hash2 = service._hash_token(token)
        
        assert hash1 == hash2
    
    def test_hash_token_different_for_different_tokens(self):
        """Test that different tokens produce different hashes"""
        service = JWTService()
        
        hash1 = service._hash_token("token1")
        hash2 = service._hash_token("token2")
        
        assert hash1 != hash2
    
    def test_verify_token_hash_success(self):
        """Test successful token hash verification"""
        service = JWTService()
        token = "test-token-123"
        
        stored_hash = service._hash_token(token)
        
        assert service._verify_token_hash(token, stored_hash) is True
    
    def test_verify_token_hash_failure(self):
        """Test failed token hash verification"""
        service = JWTService()
        
        stored_hash = service._hash_token("token1")
        
        assert service._verify_token_hash("token2", stored_hash) is False


class TestTokenBlacklist:
    """Tests for token blacklist functionality"""
    
    @patch('backend.services.jwt_service.supabase')
    def test_is_token_blacklisted_true(self, mock_supabase):
        """Test checking if token is blacklisted (returns True)"""
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [{"jti": "test-jti"}]
        
        service = JWTService()
        
        assert service._is_token_blacklisted("test-jti") is True
    
    @patch('backend.services.jwt_service.supabase')
    def test_is_token_blacklisted_false(self, mock_supabase):
        """Test checking if token is not blacklisted (returns False)"""
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        
        service = JWTService()
        
        assert service._is_token_blacklisted("test-jti") is False
    
    @patch('backend.services.jwt_service.supabase')
    def test_is_token_blacklisted_database_error(self, mock_supabase):
        """Database errors fail closed: the token is treated as revoked"""
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.side_effect = Exception("DB Error")
        
        service = JWTService()
        
        assert service._is_token_blacklisted("test-jti") is True


class TestCleanupExpiredTokens:
    """Tests for cleanup functionality"""
    
    @patch('backend.services.jwt_service.supabase')
    def test_cleanup_expired_tokens(self, mock_supabase):
        """Test cleanup of expired sessions and blacklisted tokens"""
        mock_supabase.table.return_value.delete.return_value.lt.return_value.execute.return_value = Mock()
        
        service = JWTService()
        
        # Should not raise exception
        service.cleanup_expired_tokens()
        
        # Verify both tables were cleaned
        assert mock_supabase.table.call_count >= 2

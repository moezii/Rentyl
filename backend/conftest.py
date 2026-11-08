"""
Shared pytest setup for the backend.

backend.config, backend.utils.aes_utils and backend.utils.payment_utils read
required settings at import time. Provide harmless dummy values so the unit
tests run without a .env file and never touch real services. Values that are
already set in the environment are left untouched.
"""
import os

_DUMMY_ENV = {
    "SUPABASE_URL": "https://example.supabase.co",
    "SUPABASE_KEY": "test-anon-key",
    "SUPABASE_SERVICE_ROLE_KEY": "test-service-role-key",
    "BUCKET_NAME": "test-bucket",
    "JWT_SECRET_KEY": "test-jwt-secret-0123456789abcdef0123456789",
    "CLIENT_ID_AES_KEY": "0123456789abcdef0123456789abcdef",
    "CLIENT_ID_AES_IV": "0123456789abcdef",
    "AMWAL_MERCHANT_ID": "123456",
    "AMWAL_TERMINAL_ID": "654321",
    "AMWAL_SECURE_HASH_KEY": "00" * 32,
    "ENVIRONMENT": "test",
}
for _key, _value in _DUMMY_ENV.items():
    os.environ.setdefault(_key, _value)



import socket

import pytest

_real_getaddrinfo = socket.getaddrinfo


def _no_network(host, *args, **kwargs):
    if host in ("localhost", "127.0.0.1", "::1", "testserver"):
        return _real_getaddrinfo(host, *args, **kwargs)
    raise RuntimeError(f"Tests must not use the network (tried to resolve {host!r})")


@pytest.fixture(autouse=True)
def block_network(monkeypatch):
    """Fail fast if a test reaches a real service instead of a fake."""
    monkeypatch.setattr(socket, "getaddrinfo", _no_network)


@pytest.fixture(autouse=True)
def reset_rate_limiters():
    from backend.utils.rate_limit import ALL_LIMITERS
    for limiter in ALL_LIMITERS:
        limiter.reset()
    yield

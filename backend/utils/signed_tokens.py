"""
Compact server-signed tokens (HMAC-SHA256 over a JSON payload).

Used by the payment flow:

* ``intent`` - issued by ``/payment/generate-hash`` for a booking payment; binds
  the merchant reference to the car, rental dates and the server-calculated
  amount that was signed for AMWAL.
* ``payment`` - issued once AMWAL's response hash has been verified
  (``/payment/confirm`` or ``/payment/return``); ``/bookings/create`` only
  creates a booking for a valid, unexpired payment token.

Tokens are stateless, so they work with any number of workers. Format:
``base64url(json) + "." + base64url(hmac)``.
"""
import base64
import hashlib
import hmac
import json
import time
from typing import Any, Dict, Optional

from backend.config import JWT_SECRET_KEY, PAYMENT_TOKEN_SECRET

INTENT_TTL_SECONDS = 60 * 60      # the customer has an hour to complete payment
PAYMENT_TTL_SECONDS = 30 * 60     # and 30 minutes from payment to booking creation


class InvalidToken(Exception):
    pass


def _secret() -> bytes:
    if PAYMENT_TOKEN_SECRET:
        return PAYMENT_TOKEN_SECRET.encode()
    # Derived, so the JWT signing key itself is never used for another purpose
    return hmac.new(JWT_SECRET_KEY.encode(), b"rentyl-payment-token-v1", hashlib.sha256).digest()


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _unb64(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def sign_token(kind: str, data: Dict[str, Any], ttl_seconds: int, now: Optional[float] = None) -> str:
    now = time.time() if now is None else now
    payload = {**data, "typ": kind, "exp": int(now + ttl_seconds)}
    body = _b64(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode())
    signature = _b64(hmac.new(_secret(), body.encode(), hashlib.sha256).digest())
    return f"{body}.{signature}"


def verify_token(token: str, kind: str, now: Optional[float] = None) -> Dict[str, Any]:
    """Return the payload of a valid token of type ``kind``; raise InvalidToken otherwise."""
    if not token or not isinstance(token, str) or token.count(".") != 1:
        raise InvalidToken("Malformed token")
    body, signature = token.split(".")
    expected = _b64(hmac.new(_secret(), body.encode(), hashlib.sha256).digest())
    if not hmac.compare_digest(signature, expected):
        raise InvalidToken("Invalid token signature")
    try:
        payload = json.loads(_unb64(body))
    except Exception as exc:
        raise InvalidToken("Malformed token") from exc
    if payload.get("typ") != kind:
        raise InvalidToken("Wrong token type")
    now = time.time() if now is None else now
    if not isinstance(payload.get("exp"), int) or payload["exp"] < now:
        raise InvalidToken("Token expired")
    return payload

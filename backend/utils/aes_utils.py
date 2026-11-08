"""
Encryption of numeric database IDs that are exposed to clients.

Two formats are understood:

* **v2 (issued by ``encrypt_id``)** - AES-256-GCM, URL-safe base64 without
  padding: ``nonce(12) || ciphertext || tag(16)``. The ciphertext is
  authenticated, so a modified or forged ID is rejected instead of decrypting
  to some other row's ID. The nonce is derived from the ID with HMAC-SHA256
  (a synthetic IV, as in AES-GCM-SIV/SIV constructions): the same ID always
  encrypts to the same string. That matters because encrypted IDs are stored
  and compared in the database (``bookings.car_id``, the availability RPC) and
  in the frontend (``cars.find(c => c.encrypted_car_id === id)``). A nonce only
  repeats for an identical plaintext, which then yields an identical
  ciphertext, so GCM's nonce-reuse problem does not apply.
* **legacy (still accepted by ``decrypt_id``)** - AES-CBC with a fixed IV and
  padded base64 (always contains ``=``). Links and rows created before v2 keep
  working. ``encrypt_id_legacy`` produces it for values that must match rows
  already stored in the database in that format.
"""
import base64
import hashlib
import hmac
import os

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from dotenv import load_dotenv

# Load environment variables from .env at project root
load_dotenv()


def get_env_or_fallback(key, fallback, required=True):
    value = os.environ.get(key)
    if value:
        return value
    if not required:
        return fallback
    raise RuntimeError(f"Missing required environment variable: {key}. Set this in your .env or Render dashboard.")


AES_KEY = os.environ.get('CLIENT_ID_AES_KEY').encode()[:32]  # 32 bytes for AES-256
AES_IV = os.environ.get('CLIENT_ID_AES_IV').encode()[:16]    # 16 bytes for AES block size

# Separate keys for the v2 format, derived from the configured key
_GCM_KEY = hashlib.sha256(b"rentyl-id-v2-enc|" + AES_KEY).digest()
_NONCE_KEY = hashlib.sha256(b"rentyl-id-v2-nonce|" + AES_KEY).digest()
_NONCE_SIZE = 12


def _b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _b64decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def encrypt_id(plain_id: int) -> str:
    """Encrypt an ID in the authenticated v2 format (deterministic, URL-safe)."""
    plaintext = str(plain_id).encode()
    nonce = hmac.new(_NONCE_KEY, plaintext, hashlib.sha256).digest()[:_NONCE_SIZE]
    return _b64encode(nonce + AESGCM(_GCM_KEY).encrypt(nonce, plaintext, None))


def encrypt_id_legacy(plain_id: int) -> str:
    """Encrypt an ID in the legacy AES-CBC format (only for matching stored rows)."""
    backend = default_backend()
    cipher = Cipher(algorithms.AES(AES_KEY), modes.CBC(AES_IV), backend=backend)
    encryptor = cipher.encryptor()
    padder = padding.PKCS7(128).padder()
    padded_data = padder.update(str(plain_id).encode()) + padder.finalize()
    ct = encryptor.update(padded_data) + encryptor.finalize()
    return base64.urlsafe_b64encode(ct).decode()


def _decrypt_legacy(enc_id: str) -> int:
    backend = default_backend()
    cipher = Cipher(algorithms.AES(AES_KEY), modes.CBC(AES_IV), backend=backend)
    decryptor = cipher.decryptor()
    ct = base64.urlsafe_b64decode(enc_id.encode())
    padded_data = decryptor.update(ct) + decryptor.finalize()
    unpadder = padding.PKCS7(128).unpadder()
    data = unpadder.update(padded_data) + unpadder.finalize()
    return int(data.decode())


def _decrypt_v2(enc_id: str) -> int:
    raw = _b64decode(enc_id)
    if len(raw) <= _NONCE_SIZE + 16:
        raise ValueError("Invalid encrypted ID")
    nonce, ciphertext = raw[:_NONCE_SIZE], raw[_NONCE_SIZE:]
    return int(AESGCM(_GCM_KEY).decrypt(nonce, ciphertext, None).decode())


def decrypt_id(enc_id: str) -> int:
    """Decrypt an ID in either format. Raises ValueError for anything invalid."""
    if not isinstance(enc_id, str) or not enc_id:
        raise ValueError("Invalid encrypted ID")
    try:
        if "=" in enc_id:
            # legacy CBC IDs are padded base64 (one or more '='); v2 never pads
            return _decrypt_legacy(enc_id)
        return _decrypt_v2(enc_id)
    except Exception as exc:
        # One error type/message for every failure (no padding/tag oracle)
        raise ValueError("Invalid encrypted ID") from exc


def to_legacy_id(enc_id: str) -> str:
    """Normalise an encrypted ID (any format) to the legacy format stored in the DB."""
    return encrypt_id_legacy(decrypt_id(enc_id))

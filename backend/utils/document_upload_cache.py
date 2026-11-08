from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Dict, Optional
from uuid import uuid4

CACHE_TTL_SECONDS = 15 * 60
_UPLOAD_CACHE: Dict[str, dict] = {}


def register_upload(file_hash: str, url: str) -> str:
    token = uuid4().hex
    _UPLOAD_CACHE[token] = {
        "hash": file_hash,
        "url": url,
        "updated_at": datetime.now(timezone.utc),
    }
    return token


def validate_upload_token(token: str) -> Optional[dict]:
    entry = _UPLOAD_CACHE.get(token)
    if not entry:
        return None
    age = datetime.now(timezone.utc) - entry.get("updated_at", datetime.now(timezone.utc))
    if age > timedelta(seconds=CACHE_TTL_SECONDS):
        _UPLOAD_CACHE.pop(token, None)
        return None
    return entry

"""
Small in-memory sliding-window rate limiter, used as a FastAPI dependency.

State is per process: with several workers each one counts separately, so the
effective limit is ``limit x workers``. Good enough to stop scripted abuse of
public endpoints; use a shared store (Redis, the database) for strict limits.
"""
import threading
import time
from collections import deque
from typing import Deque, Dict

from fastapi import HTTPException, Request

from backend.utils.client_ip import get_client_ip


class RateLimiter:
    def __init__(self, name: str, limit: int, window_seconds: float, max_keys: int = 50_000):
        self.name = name
        self.limit = limit
        self.window = window_seconds
        self.max_keys = max_keys
        self._hits: Dict[str, Deque[float]] = {}
        self._lock = threading.Lock()

    def hit(self, key: str) -> bool:
        """Record a request for ``key``; return False if it exceeds the limit."""
        now = time.monotonic()
        cutoff = now - self.window
        with self._lock:
            if len(self._hits) >= self.max_keys and key not in self._hits:
                self._prune(cutoff)
            hits = self._hits.setdefault(key, deque())
            while hits and hits[0] <= cutoff:
                hits.popleft()
            if len(hits) >= self.limit:
                return False
            hits.append(now)
            return True

    def _prune(self, cutoff: float) -> None:
        for key in [k for k, v in self._hits.items() if not v or v[-1] <= cutoff]:
            del self._hits[key]
        if len(self._hits) >= self.max_keys:
            # still full of active keys: drop the oldest half
            oldest = sorted(self._hits, key=lambda k: self._hits[k][-1])
            for key in oldest[: len(oldest) // 2]:
                del self._hits[key]

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()

    def __call__(self, request: Request) -> None:
        """FastAPI dependency: 429 when the caller's IP is over the limit."""
        if not self.hit(get_client_ip(request)):
            raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")


# Limits per client IP (per worker process)
login_limiter = RateLimiter("login", limit=10, window_seconds=60)
booking_limiter = RateLimiter("booking", limit=20, window_seconds=60)
upload_limiter = RateLimiter("upload", limit=20, window_seconds=60)
payment_limiter = RateLimiter("payment", limit=20, window_seconds=60)

ALL_LIMITERS = (login_limiter, booking_limiter, upload_limiter, payment_limiter)

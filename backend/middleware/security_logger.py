"""
Security Logging Middleware

Tracks real IP addresses for suspicious requests and logs security events.
"""

from fastapi import Request
from backend.utils.client_ip import get_client_ip
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Callable
import logging
from datetime import datetime, timezone

# Configure security logger
security_logger = logging.getLogger("security")
security_logger.setLevel(logging.WARNING)

# List of suspicious patterns to track
SUSPICIOUS_PATHS = [
    "/.env",
    "/.git",
    "/.aws",
    "/admin",
    "/phpmyadmin",
    "/wp-admin",
    "/wp-login",
    "/config",
    "/.ssh",
    "/etc/passwd",
    "/backup",
    "/.htaccess",
    "/web.config",
    "/composer.json",
    "/package.json",
    "/.DS_Store",
    "/xmlrpc.php",
    "/wp-config.php",
    "/database.yml",
    "/credentials",
    "/.dockerenv",
    "/docker-compose",
    "/Dockerfile",
]

SUSPICIOUS_EXTENSIONS = [
    ".sql",
    ".bak",
    ".backup",
    ".old",
    ".zip",
    ".tar",
    ".gz",
    ".log",
]

SUSPICIOUS_PARAMS = [
    "exec",
    "system",
    "eval",
    "cmd",
    "shell",
    "union",
    "select",
    "drop",
    "insert",
    "update",
    "delete",
    "../",
    "etc/passwd",
]


def get_real_ip(request: Request) -> str:
    """
    Extract the real client IP. Forwarding headers are only trusted when the
    request comes from a configured proxy (see backend/utils/client_ip.py).
    """
    return get_client_ip(request)


def is_suspicious_request(request: Request) -> tuple[bool, str]:
    """
    Check if a request is suspicious.
    Returns (is_suspicious, reason)
    """
    path = request.url.path.lower()
    query = str(request.url.query).lower()

    # Check suspicious paths (matches both /api/.env and /.env)
    for suspicious_path in SUSPICIOUS_PATHS:
        if suspicious_path in path:
            return True, f"Suspicious path: {suspicious_path}"

    # Check suspicious file extensions
    for ext in SUSPICIOUS_EXTENSIONS:
        if path.endswith(ext):
            return True, f"Suspicious extension: {ext}"

    # Check suspicious query parameters
    for param in SUSPICIOUS_PARAMS:
        if param in query or param in path:
            return True, f"Suspicious parameter: {param}"

    # Check for path traversal attempts
    if "../" in path or "..%2f" in path or "..%5c" in path:
        return True, "Path traversal attempt"

    # Check for SQL injection patterns
    sql_patterns = ["'", '"', "--", "/*", "*/", "xp_", "sp_"]
    for pattern in sql_patterns:
        if pattern in query:
            return True, f"Potential SQL injection: {pattern}"

    return False, ""


class SecurityLoggerMiddleware(BaseHTTPMiddleware):
    """
    Middleware to log suspicious requests with real IP tracking
    """

    async def dispatch(self, request: Request, call_next: Callable):
        # Get real IP
        real_ip = get_real_ip(request)

        # Debug: Print every request to verify middleware is working
        print(f"[MIDDLEWARE] Request: {request.method} {request.url.path} from {real_ip}")

        # Check if request is suspicious
        is_suspicious, reason = is_suspicious_request(request)

        if is_suspicious:
            # Log suspicious request with details
            log_entry = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "real_ip": real_ip,
                "method": request.method,
                "path": request.url.path,
                "query": str(request.url.query) if request.url.query else None,
                "user_agent": request.headers.get("user-agent"),
                "referer": request.headers.get("referer"),
                "reason": reason,
                "headers": {
                    "x-forwarded-for": request.headers.get("x-forwarded-for"),
                    "x-real-ip": request.headers.get("x-real-ip"),
                    "cf-connecting-ip": request.headers.get("cf-connecting-ip"),
                    "host": request.headers.get("host"),
                }
            }

            # Log to console and file
            security_logger.warning(
                f"[SECURITY ALERT] {reason} | "
                f"IP: {real_ip} | "
                f"Method: {request.method} | "
                f"Path: {request.url.path} | "
                f"User-Agent: {request.headers.get('user-agent', 'None')}"
            )

            print(f"\n{'='*80}")
            print(f"[SECURITY ALERT] Suspicious Request Detected")
            print(f"{'='*80}")
            print(f"Timestamp:   {log_entry['timestamp']}")
            print(f"Real IP:     {real_ip}")
            print(f"Method:      {request.method}")
            print(f"Path:        {request.url.path}")
            print(f"Query:       {log_entry['query']}")
            print(f"Reason:      {reason}")
            print(f"User-Agent:  {log_entry['user_agent']}")
            print(f"Referer:     {log_entry['referer']}")
            print(f"{'='*80}\n")

            # Optional: Store in database for analysis
            # await self.store_security_event(log_entry)

        # Continue processing the request
        response = await call_next(request)

        return response

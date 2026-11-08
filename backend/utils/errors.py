"""Helpers for turning unexpected exceptions into safe HTTP errors."""
import logging

from fastapi import HTTPException

logger = logging.getLogger(__name__)


def server_error(exc: Exception, message: str = "Internal server error", status_code: int = 500) -> HTTPException:
    """Return an HTTPException that is safe to send to the client.

    - An ``HTTPException`` raised further down (404, 403, 409, ...) is returned
      unchanged, so its status code and message reach the client instead of
      being turned into a 500.
    - Any other exception is logged server-side with its traceback, and the
      client only gets ``message`` (no exception text, SQL, or stack details).
    """
    if isinstance(exc, HTTPException):
        return exc
    logger.error("%s: %s", message, exc, exc_info=exc)
    return HTTPException(status_code=status_code, detail=message)

"""
Client IP detection behind reverse proxies.

Forwarding headers (X-Forwarded-For, X-Real-IP, CF-Connecting-IP) are only
honoured when the TCP peer is a trusted proxy (``TRUSTED_PROXIES``, default
the local nginx). Otherwise any client could choose its own "IP" and bypass
per-IP rate limits or poison session/audit records.

For X-Forwarded-For the list is walked from the right (the entry appended by
the closest proxy) and the first address that is not itself a trusted proxy is
the client.
"""
import ipaddress
from typing import List, Optional

from fastapi import Request

from backend.config import TRUSTED_PROXIES


def _parse_networks(values: List[str]):
    networks = []
    for value in values:
        try:
            networks.append(ipaddress.ip_network(value, strict=False))
        except ValueError:
            continue
    return networks


_TRUSTED_NETWORKS = _parse_networks(TRUSTED_PROXIES)


def _is_trusted(ip: Optional[str]) -> bool:
    if not ip:
        return False
    try:
        address = ipaddress.ip_address(ip.strip())
    except ValueError:
        return False
    return any(address in network for network in _TRUSTED_NETWORKS)


def _valid_ip(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    value = value.strip()
    try:
        ipaddress.ip_address(value)
        return value
    except ValueError:
        return None


def get_client_ip(request: Request) -> str:
    """Return the real client IP for ``request`` (see module docstring)."""
    peer = request.client.host if request.client else None
    if not _is_trusted(peer):
        return peer or "unknown"

    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        hops = [h.strip() for h in forwarded_for.split(",") if h.strip()]
        for hop in reversed(hops):
            if not _is_trusted(hop):
                return _valid_ip(hop) or peer or "unknown"

    for header in ("x-real-ip", "cf-connecting-ip"):
        candidate = _valid_ip(request.headers.get(header))
        if candidate and not _is_trusted(candidate):
            return candidate

    return peer or "unknown"

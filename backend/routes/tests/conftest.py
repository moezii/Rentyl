"""Fixtures for route tests: an in-process ASGI client (no network, no lifespan)."""
import httpx
import pytest
import pytest_asyncio

from backend.main import app


@pytest_asyncio.fixture
async def client():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def as_company():
    """Authenticate requests as a member of the given company (dependency override)."""
    from backend.dependencies import get_current_company_id

    def _set(company_id: int):
        app.dependency_overrides[get_current_company_id] = lambda: company_id
        return company_id

    yield _set
    app.dependency_overrides.clear()

"""
Tests for the second hardening pass: ID encryption formats, signed tokens,
client IP / rate limiting, thread offloading, auth-client isolation, password
reset, public car fields, company endpoints and the calendar query batching.
"""
import threading
from datetime import date, timedelta
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from starlette.requests import Request

from backend.routes.tests.fakes import FakeSupabase
from backend.utils import aes_utils
from backend.utils.aes_utils import decrypt_id, encrypt_id, encrypt_id_legacy, to_legacy_id
from backend.utils.client_ip import get_client_ip
from backend.utils.concurrency import offload
from backend.utils.rate_limit import RateLimiter
from backend.utils.signed_tokens import InvalidToken, sign_token, verify_token


def make_request(peer, headers=None):
    raw = [(k.lower().encode(), v.encode()) for k, v in (headers or {}).items()]
    return Request({"type": "http", "headers": raw, "client": (peer, 1234), "method": "GET", "path": "/"})


class TestIdEncryption:
    def test_v2_round_trip_and_is_url_safe(self):
        token = encrypt_id(12345)
        assert decrypt_id(token) == 12345
        assert "=" not in token and "+" not in token and "/" not in token

    def test_v2_is_deterministic(self):
        # encrypted IDs are compared in the frontend and in the database
        assert encrypt_id(42) == encrypt_id(42)
        assert encrypt_id(42) != encrypt_id(43)

    def test_legacy_ids_still_decrypt(self):
        legacy = encrypt_id_legacy(42)
        assert "=" in legacy
        assert decrypt_id(legacy) == 42
        assert to_legacy_id(encrypt_id(42)) == legacy

    def test_tampered_v2_id_is_rejected(self):
        token = encrypt_id(42)
        tampered = token[:-2] + ("A" if token[-2] != "A" else "B") + token[-1]
        with pytest.raises(ValueError):
            decrypt_id(tampered)

    @pytest.mark.parametrize("bad", ["", "not-an-id", "AAAA", "====", None])
    def test_garbage_raises_one_error_type(self, bad):
        with pytest.raises(ValueError, match="Invalid encrypted ID"):
            decrypt_id(bad)

    def test_v2_key_is_separate_from_legacy_key(self):
        assert aes_utils._GCM_KEY != aes_utils.AES_KEY


class TestSignedTokens:
    def test_round_trip(self):
        token = sign_token("payment", {"txn": "t"}, 60)
        assert verify_token(token, "payment")["txn"] == "t"

    def test_expired(self):
        with pytest.raises(InvalidToken, match="expired"):
            verify_token(sign_token("payment", {}, -1), "payment")

    def test_wrong_type(self):
        with pytest.raises(InvalidToken):
            verify_token(sign_token("intent", {}, 60), "payment")

    def test_tampered_payload(self):
        body, sig = sign_token("payment", {"amt": 1}, 60).split(".")
        other_body = sign_token("payment", {"amt": 1000}, 60).split(".")[0]
        with pytest.raises(InvalidToken, match="signature"):
            verify_token(f"{other_body}.{sig}", "payment")


class TestClientIp:
    def test_headers_from_untrusted_peer_are_ignored(self):
        request = make_request("203.0.113.9", {"X-Forwarded-For": "1.2.3.4", "X-Real-IP": "1.2.3.4"})
        assert get_client_ip(request) == "203.0.113.9"

    def test_forwarded_for_from_trusted_proxy(self):
        request = make_request("127.0.0.1", {"X-Forwarded-For": "198.51.100.7"})
        assert get_client_ip(request) == "198.51.100.7"

    def test_spoofed_leading_entry_is_not_used(self):
        # client sent "X-Forwarded-For: 1.1.1.1"; nginx appended the real peer
        request = make_request("127.0.0.1", {"X-Forwarded-For": "1.1.1.1, 198.51.100.7"})
        assert get_client_ip(request) == "198.51.100.7"

    def test_real_ip_fallback(self):
        assert get_client_ip(make_request("127.0.0.1", {"X-Real-IP": "198.51.100.8"})) == "198.51.100.8"


class TestRateLimiter:
    def test_limits_per_key_and_window(self, monkeypatch):
        now = [1000.0]
        monkeypatch.setattr("backend.utils.rate_limit.time.monotonic", lambda: now[0])
        limiter = RateLimiter("t", limit=2, window_seconds=10)
        assert limiter.hit("a") and limiter.hit("a") and not limiter.hit("a")
        assert limiter.hit("b")
        now[0] += 11
        assert limiter.hit("a")

    def test_key_table_is_bounded(self):
        limiter = RateLimiter("t", limit=1, window_seconds=60, max_keys=10)
        for i in range(50):
            limiter.hit(f"k{i}")
        assert len(limiter._hits) <= 10

    @pytest.mark.asyncio
    async def test_login_is_rate_limited(self, client):
        with patch("backend.routes.auth.login_user", side_effect=__import__("fastapi").HTTPException(401, "bad")):
            codes = [(await client.post("/auth/login", json={"email": "x@example.com", "password": "password123"})).status_code
                     for _ in range(12)]
        assert codes[0] == 401 and codes[-1] == 429


class TestOffload:
    def test_offloaded_handler_is_sync_and_keeps_signature(self):
        import inspect

        async def handler(a: int, b: str = "x"):
            return threading.current_thread().name, a, b

        wrapped = offload(handler)
        assert not inspect.iscoroutinefunction(wrapped)
        assert list(inspect.signature(wrapped).parameters) == ["a", "b"]
        name, a, b = wrapped(1, b="y")
        assert (a, b) == (1, "y")

    @pytest.mark.asyncio
    async def test_blocking_route_runs_off_the_event_loop(self, client, as_company):
        as_company(7)
        seen = {}

        def responder(q):
            seen["thread"] = threading.current_thread().name
            return []

        with patch("backend.routes.calendar.supabase", FakeSupabase(responder)):
            response = await client.get("/calendar/events")
        assert response.status_code == 200
        assert seen["thread"] != threading.main_thread().name


class TestAuthClientIsolation:
    def test_login_uses_its_own_client(self):
        from backend.services import auth_service
        auth_client = MagicMock()
        auth_client.auth.sign_in_with_password.return_value = SimpleNamespace(
            session=object(), user=SimpleNamespace(id="u1"))
        shared = MagicMock()
        profile = {"email": "x@example.com", "role": "agent", "company_id": 7}
        with patch.object(auth_service, "new_auth_client", return_value=auth_client), \
             patch.object(auth_service, "supabase", shared), \
             patch.object(auth_service, "get_user_profile", return_value=profile), \
             patch.object(auth_service.jwt_service, "generate_refresh_token", return_value="r"):
            result = auth_service.login_user("x@example.com", "password123")
        assert result["user"]["id"] == "u1"
        auth_client.auth.sign_in_with_password.assert_called_once()
        shared.auth.sign_in_with_password.assert_not_called()

    def test_sign_up_uses_its_own_client(self):
        from backend.services import auth_service
        auth_client = MagicMock()
        auth_client.auth.sign_up.return_value = SimpleNamespace(user=SimpleNamespace(id="u2"))
        fake = FakeSupabase(lambda q: [{"user_id": "u2"}])
        with patch.object(auth_service, "new_auth_client", return_value=auth_client), \
             patch.object(auth_service, "supabase", fake):
            auth_service.register_user({"email": "n@example.com", "password": "password123", "username": "n",
                                        "first_name": "N", "last_name": "U", "role": "agent"})
        auth_client.auth.sign_up.assert_called_once()
        assert fake.queries_for("users", "insert")

    def test_new_auth_client_is_a_fresh_non_persistent_client(self):
        from backend.supabase.client import new_auth_client, supabase
        a, b = new_auth_client(), new_auth_client()
        assert a is not b and a is not supabase


class TestResetPassword:
    @pytest.mark.asyncio
    @pytest.mark.parametrize("body,expected_refresh", [
        ({"password": "newpassword1", "access_token": "acc", "refresh_token": "ref"}, "ref"),
        ({"password": "newpassword1", "access_token": "acc"}, "acc"),  # older frontends
    ])
    async def test_uses_refresh_token_from_recovery_link(self, client, body, expected_refresh):
        reset_client = MagicMock()
        reset_client.auth.update_user.return_value = SimpleNamespace(user=SimpleNamespace(id="u1"))
        with patch("backend.supabase.client.new_auth_client", return_value=reset_client):
            response = await client.post("/auth/reset-password", json=body)
        assert response.status_code == 200
        reset_client.auth.set_session.assert_called_once_with("acc", expected_refresh)


class TestPublicCars:
    CAR = {"car_id": 3, "company_id": 7, "make": "Toyota", "model": "Yaris", "year": 2022, "color": "red",
           "image_url": "https://img", "daily_rate": 10, "weekly_rate": 60, "monthly_rate": 200,
           "vin": "SECRETVIN", "license_plate": "AB-123", "current_mileage": 5000,
           "registration_expiry_date": "2030-01-01", "status": "available"}

    def responder(self, q):
        if q.table == "cars":
            return [dict(self.CAR), {**self.CAR, "car_id": 4}]
        if q.table == "companies":
            return [{"company_id": 7, "city": "Muscat", "province": "M", "country": "OM",
                     "currency": "OMR", "delivery_offered": True}]
        return []

    @pytest.mark.asyncio
    async def test_only_public_fields_are_returned(self, client):
        with patch("backend.supabase.client.supabase", FakeSupabase(self.responder)):
            response = await client.get("/cars/public/available")
        assert response.status_code == 200
        car = response.json()[0]
        for private in ("car_id", "company_id", "vin", "license_plate", "current_mileage", "registration_expiry_date"):
            assert private not in car
        assert car["make"] == "Toyota" and car["daily_rate"] == 10 and car["city"] == "Muscat"
        assert decrypt_id(car["encrypted_car_id"]) == 3

    @pytest.mark.asyncio
    async def test_date_filter_uses_availability_check_per_car(self, client):
        from backend.services.booking_service import BookingService

        async def availability(car_id, start, end):
            return {"available": decrypt_id(car_id) == 4}

        start = date.today().isoformat()
        end = (date.today() + timedelta(days=2)).isoformat()
        with patch("backend.supabase.client.supabase", FakeSupabase(self.responder)), \
             patch.object(BookingService, "check_availability", side_effect=availability):
            response = await client.get("/cars/public/available", params={"start_date": start, "end_date": end})
        assert [decrypt_id(c["encrypted_car_id"]) for c in response.json()] == [4]


class TestCompanies:
    @pytest.mark.asyncio
    async def test_create_company_requires_admin(self, client):
        response = await client.post("/companies/", json={"company_name": "Spam Inc"})
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_current_company(self, client):
        user = {"user_id": "u", "company_id": 7, "role": "agent"}
        fake = FakeSupabase(lambda q: {"company_id": 7, "company_name": "ACME"})
        with patch("backend.routes.companies.get_current_user_with_company", return_value=user), \
             patch("backend.routes.companies.supabase", fake):
            response = await client.get("/companies/current")
        assert response.status_code == 200
        assert response.json()["company_name"] == "ACME"
        assert fake.queries_for("companies")[0].filter_value("company_id") == 7


class TestCalendarBatching:
    @pytest.mark.asyncio
    async def test_two_lookups_for_all_rentals(self, client, as_company):
        as_company(7)
        end = (date.today() + timedelta(days=2)).isoformat()
        rentals = [{"rental_id": i, "rental_start_date": end, "rental_end_date": end,
                    "car_id": 100 + i, "client_id": 200 + i, "contract_status": "active"} for i in range(5)]

        def responder(q):
            if q.table == "rentalrecords":
                return rentals
            if q.table == "cars" and q.filter_value("car_id") is not None:
                return [{"car_id": c, "make": "M", "model": f"m{c}", "license_plate": "P"} for c in q.filter_value("car_id")]
            if q.table == "clients":
                return [{"client_id": c, "name": f"client {c}"} for c in q.filter_value("client_id")]
            return []

        fake = FakeSupabase(responder)
        with patch("backend.routes.calendar.supabase", fake):
            response = await client.get("/calendar/events")
        assert response.status_code == 200
        rental_events = [e for e in response.json()["events"] if e.get("type") == "rental_end"]
        assert len(rental_events) == 5
        assert rental_events[0]["title"] == "Rental ends: client 200"
        assert len(fake.queries_for("clients")) == 1
        car_lookups = [q for q in fake.queries_for("cars") if q.filter_value("car_id") is not None]
        assert len(car_lookups) == 1


class TestUploadRateLimit:
    @pytest.mark.asyncio
    async def test_public_document_validation_is_rate_limited(self, client):
        codes = []
        for _ in range(22):
            response = await client.post("/upload/validate-document", files={"file": ("x.txt", b"hello", "text/plain")})
            codes.append(response.status_code)
        assert codes[0] == 400 and codes[-1] == 429


class TestDataAccessModel:
    """The backend uses the service role; the anon key is only for Auth."""

    def test_shared_client_uses_service_role_key(self):
        from backend.config import SUPABASE_SERVICE_ROLE_KEY
        from backend.supabase.client import supabase, supabase_admin
        assert supabase.supabase_key == SUPABASE_SERVICE_ROLE_KEY
        assert supabase_admin is supabase

    def test_auth_client_uses_anon_key(self):
        from backend.config import SUPABASE_KEY
        from backend.supabase.client import new_auth_client
        assert new_auth_client().supabase_key == SUPABASE_KEY

    def test_service_role_key_is_required(self, monkeypatch):
        import importlib
        import backend.config as config
        monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY")
        try:
            with pytest.raises(ValueError, match="SUPABASE_SERVICE_ROLE_KEY"):
                importlib.reload(config)
        finally:
            monkeypatch.undo()
            importlib.reload(config)

    def test_migration_removes_anon_access(self):
        import os
        path = os.path.join(os.path.dirname(__file__), "..", "..", "migrations", "revoke_anon_table_access.sql")
        sql = open(path, encoding="utf8").read()
        assert "DROP POLICY IF EXISTS cars_anon_select_available ON public.cars;" in sql
        assert "DROP POLICY IF EXISTS bookings_anon_insert ON public.bookings;" in sql
        assert "REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;" in sql

    @pytest.mark.asyncio
    async def test_public_car_query_selects_only_public_columns(self, client):
        fake = FakeSupabase(lambda q: [])
        with patch("backend.supabase.client.supabase", fake):
            await client.get("/cars/public/available")
        columns = {c.strip() for c in fake.queries_for("cars")[0].columns.split(",")}
        assert "*" not in columns
        assert not columns & {"vin", "license_plate", "current_mileage", "registration_expiry_date"}

"""
Tests for the public booking flow (validate/create) and the company-scoped
booking management endpoints. Supabase is replaced by FakeSupabase.
"""
from datetime import date, timedelta
from unittest.mock import AsyncMock, patch

import pytest

from backend.models.booking import BookingCreate
from backend.routes.tests.fakes import FakeSupabase
from backend.services.booking_service import BookingService, currency_decimals
from backend.utils.aes_utils import encrypt_id, encrypt_id_legacy
from backend.utils.signed_tokens import sign_token

CAR_ID = 42
COMPANY_ID = 7


def booking_responder(query):
    """Happy-path database for create_booking."""
    if query.table == "cars" and query.action == "select":
        return {"company_id": COMPANY_ID, "daily_rate": 10, "weekly_rate": None,
                "monthly_rate": None, "status": "available", "make": "Toyota", "model": "Yaris"}
    if query.table == "clients" and query.action == "insert":
        return [{"client_id": 5}]
    if query.table == "client_documents" and query.action == "insert":
        return [{"document_id": 1}]
    if query.table == "rentalrecords" and query.action == "insert":
        return [{"rental_id": 9}]
    if query.table == "bookings" and query.action == "insert":
        return [{"id": "b-1", **query.payload}]
    return []


def dates(start=None, days=2):
    start = start or date.today()
    return start.isoformat(), (start + timedelta(days=days)).isoformat()


def payment_token(amount=21.0, car=CAR_ID, start=None, end=None, txn="txn-verified", ttl=600):
    s, e = dates()
    return sign_token("payment", {"txn": txn, "ref": "REF-1", "amt": amount, "car": car,
                                  "start": start or s, "end": end or e}, ttl)


def make_booking(token="default", start=None, days=2, **extra):
    s, e = dates(start, days)
    if token == "default":
        token = payment_token(start=s, end=e)
    return BookingCreate(
        car_id=encrypt_id(CAR_ID),
        payment_token=token,
        customer_name="Jane Doe",
        customer_email="jane@example.com",
        customer_phone="+96812345678",
        rental_start_date=s,
        rental_end_date=e,
        **extra,
    )


@pytest.fixture
def fake_db():
    fake = FakeSupabase(booking_responder)
    with patch("backend.services.booking_service.supabase", fake):
        yield fake


class TestCreateBooking:
    @pytest.mark.asyncio
    async def test_success_uses_server_price_and_verified_payment(self, fake_db):
        # 2 days x 10 = 20, no future fee (starts today), +5% platform fee = 21.
        # The browser-sent payment fields are ignored in favour of the token.
        record = await BookingService.create_booking(make_booking(
            payment_transaction_id="txn-from-browser", payment_status="completed", amount_paid=0.5))

        assert record["id"] == "b-1"
        rental = fake_db.queries_for("rentalrecords", "insert")[0].payload
        assert rental["company_id"] == COMPANY_ID
        assert rental["total_days"] == 2
        assert rental["payment_status"] == "paid"
        # company receives the amount without the platform fee
        assert rental["amount_paid"] == pytest.approx(20.0)
        booking = fake_db.queries_for("bookings", "insert")[0].payload
        assert booking["payment_transaction_id"] == "txn-verified"
        assert booking["payment_reference"] == "REF-1"
        assert booking["amount_paid"] == pytest.approx(21.0)
        assert booking["company_id"] == COMPANY_ID
        # encrypted IDs are stored in the legacy format, like existing rows
        assert booking["car_id"] == encrypt_id_legacy(CAR_ID)
        assert booking["client_id"] == encrypt_id_legacy(5)

    @pytest.mark.asyncio
    @pytest.mark.parametrize("token", [None, "", "garbage", "a.b"])
    async def test_missing_or_forged_payment_token_is_402(self, fake_db, token):
        with pytest.raises(Exception) as exc:
            await BookingService.create_booking(make_booking(token=token))
        assert getattr(exc.value, "status_code", None) == 402
        assert [q for q in fake_db.queries if q.action != "select"] == []

    @pytest.mark.asyncio
    async def test_expired_payment_token_is_402(self, fake_db):
        with pytest.raises(Exception) as exc:
            await BookingService.create_booking(make_booking(token=payment_token(ttl=-1)))
        assert exc.value.status_code == 402

    @pytest.mark.asyncio
    async def test_intent_token_cannot_be_used_as_payment(self, fake_db):
        s, e = dates()
        intent = sign_token("intent", {"ref": "REF-1", "car": CAR_ID, "start": s, "end": e, "amt": 21.0}, 600)
        with pytest.raises(Exception) as exc:
            await BookingService.create_booking(make_booking(token=intent))
        assert exc.value.status_code == 402

    @pytest.mark.asyncio
    async def test_token_for_another_car_is_rejected(self, fake_db):
        with pytest.raises(Exception) as exc:
            await BookingService.create_booking(make_booking(token=payment_token(car=CAR_ID + 1)))
        assert exc.value.status_code == 400
        assert fake_db.queries_for("clients", "insert") == []

    @pytest.mark.asyncio
    async def test_token_for_other_dates_is_rejected(self, fake_db):
        s, _ = dates()
        token = payment_token(end=(date.today() + timedelta(days=9)).isoformat())
        with pytest.raises(Exception) as exc:
            await BookingService.create_booking(make_booking(token=token))
        assert exc.value.status_code == 400

    @pytest.mark.asyncio
    async def test_reused_transaction_is_409(self, fake_db):
        def responder(query):
            if query.table == "bookings" and query.action == "select":
                return [{"id": "existing", "rental_start_date": "2030-01-01", "rental_end_date": "2030-01-02"}]
            return booking_responder(query)
        fake_db.responder = responder
        with pytest.raises(Exception) as exc:
            await BookingService.create_booking(make_booking())
        assert exc.value.status_code == 409
        assert fake_db.queries_for("bookings", "select")[0].filter_value("payment_transaction_id") == "txn-verified"
        assert fake_db.queries_for("rentalrecords", "insert") == []

    @pytest.mark.asyncio
    async def test_underpaid_amount_is_rejected_before_any_write(self, fake_db):
        with pytest.raises(Exception, match="Payment amount mismatch"):
            await BookingService.create_booking(make_booking(token=payment_token(amount=5.0)))
        assert [q for q in fake_db.queries if q.action != "select"] == []

    @pytest.mark.asyncio
    async def test_back_dated_booking_is_rejected(self, fake_db):
        start = date.today() - timedelta(days=3)
        s, e = dates(start)
        with pytest.raises(Exception, match="cannot be in the past"):
            await BookingService.create_booking(make_booking(token=payment_token(start=s, end=e), start=start))
        assert fake_db.queries_for("rentalrecords", "insert") == []

    @pytest.mark.asyncio
    async def test_double_booking_constraint_is_reported(self, fake_db):
        def responder(query):
            if query.table == "rentalrecords" and query.action == "insert":
                raise Exception('conflicting key value violates exclusion constraint "no_overlapping_rentals"')
            return booking_responder(query)
        fake_db.responder = responder
        with pytest.raises(Exception, match="DOUBLE_BOOKING_PREVENTED"):
            await BookingService.create_booking(make_booking())
        assert fake_db.queries_for("bookings", "insert") == []


class TestPricing:
    def test_currency_decimals(self):
        assert currency_decimals("OMR") == 3
        assert currency_decimals("kwd") == 3
        assert currency_decimals("USD") == 2
        assert currency_decimals(None) == 2

    @pytest.mark.asyncio
    @pytest.mark.parametrize("currency,decimals", [("OMR", 3), ("USD", 2), (None, 3)])
    async def test_total_is_rounded_to_company_currency(self, currency, decimals):
        def responder(q):
            if q.table == "cars":
                return {"company_id": COMPANY_ID, "daily_rate": 10.35, "weekly_rate": None, "monthly_rate": None}
            if q.table == "companies":
                return [{"currency": currency}] if currency else []
            return []
        s, e = dates(days=1)
        with patch("backend.services.booking_service.supabase", FakeSupabase(responder)), \
             patch.object(BookingService, "check_availability", AsyncMock(return_value={"available": True})):
            price = await BookingService.calculate_booking_price(encrypt_id(CAR_ID), s, e)
        # one day at 10.35 + 5% platform fee = 10.8675
        assert price["total_cost"] == round(10.35 * 1.05, decimals)
        assert price["decimals"] == decimals


class TestBookingStatus:
    def test_past_status_matches_db_constraint(self):
        assert BookingService.compute_booking_status("2000-01-01", "2000-01-03") == "past"

    def test_cancelled_is_not_overridden_by_dates(self):
        booking = {"booking_status": "cancelled", "rental_start_date": "2999-01-01", "rental_end_date": "2999-01-02"}
        assert BookingService.effective_status(booking) == "cancelled"

    @pytest.mark.asyncio
    async def test_confirm_writes_a_date_based_status(self, client, as_company):
        as_company(COMPANY_ID)
        future = (date.today() + timedelta(days=5)).isoformat()

        def responder(q):
            if q.table == "bookings" and q.action == "select":
                return {"id": "b-1", "booking_status": "cancelled",
                        "rental_start_date": future, "rental_end_date": future}
            if q.table == "bookings" and q.action == "update":
                return [{"id": "b-1", **q.payload}]
            return []

        fake = FakeSupabase(responder)
        with patch("backend.services.booking_service.supabase", fake):
            response = await client.post("/bookings/b-1/confirm")
        assert response.status_code == 200
        update = fake.queries_for("bookings", "update")[0]
        # 'confirmed' is rejected by bookings_booking_status_check
        assert update.payload["booking_status"] == "future"
        assert update.filter_value("company_id") == COMPANY_ID


class TestBookingEndpoints:
    @pytest.mark.asyncio
    async def test_validate_returns_price_breakdown(self, client):
        price = {"total_cost": 21.0, "total_days": 2}
        s, e = dates()
        fake = FakeSupabase(lambda q: {"car_id": CAR_ID, "company_id": COMPANY_ID, "daily_rate": 10, "status": "available"})
        with patch("backend.services.booking_service.supabase", fake), \
             patch.object(BookingService, "check_availability", AsyncMock(return_value={"available": True})), \
             patch.object(BookingService, "calculate_booking_price", AsyncMock(return_value=price)):
            response = await client.post("/bookings/validate", json={
                "car_id": encrypt_id(CAR_ID), "customer_name": "Jane", "customer_email": "jane@example.com",
                "rental_start_date": s, "rental_end_date": e,
            })
        assert response.status_code == 200
        assert response.json()["data"]["price_breakdown"] == price

    @pytest.mark.asyncio
    async def test_validate_unavailable_car_does_not_leak_internals(self, client):
        s, e = dates()
        fake = FakeSupabase(lambda q: {"car_id": CAR_ID, "company_id": COMPANY_ID, "daily_rate": 10})
        with patch("backend.services.booking_service.supabase", fake), \
             patch.object(BookingService, "check_availability",
                          AsyncMock(return_value={"available": False, "message": "taken"})):
            response = await client.post("/bookings/validate", json={
                "car_id": encrypt_id(CAR_ID), "customer_name": "Jane", "customer_email": "jane@example.com",
                "rental_start_date": s, "rental_end_date": e,
            })
        assert response.status_code == 500
        assert response.json()["detail"] == "Failed to validate booking"

    @pytest.mark.asyncio
    async def test_create_without_payment_token_is_402(self, client, fake_db):
        body = make_booking(token=None).model_dump()
        body.update(payment_transaction_id="fake", payment_status="completed", payment_response_code="00")
        response = await client.post("/bookings/create", json=body)
        assert response.status_code == 402
        assert fake_db.queries_for("rentalrecords", "insert") == []

    @pytest.mark.asyncio
    async def test_create_with_verified_payment(self, client, fake_db):
        response = await client.post("/bookings/create", json=make_booking().model_dump())
        assert response.status_code == 200
        assert response.json()["data"]["payment_transaction_id"] == "txn-verified"

    @pytest.mark.asyncio
    async def test_booking_endpoints_are_rate_limited(self, client, fake_db):
        codes = []
        for _ in range(25):
            response = await client.post("/bookings/create", json=make_booking(token=None).model_dump())
            codes.append(response.status_code)
        assert codes[0] == 402 and codes[-1] == 429

    @pytest.mark.asyncio
    @pytest.mark.parametrize("method,path", [
        ("get", "/bookings/"),
        ("get", "/bookings/some-id"),
        ("get", "/bookings/reference/REF-1"),
        ("put", "/bookings/some-id"),
        ("post", "/bookings/some-id/cancel"),
        ("post", "/bookings/some-id/confirm"),
    ])
    async def test_management_endpoints_require_auth(self, client, method, path):
        kwargs = {"json": {"booking_status": "cancelled"}} if method == "put" else {}
        response = await getattr(client, method)(path, **kwargs)
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_is_scoped_to_callers_company(self, client, as_company):
        as_company(COMPANY_ID)
        fake = FakeSupabase(lambda q: [{"id": "b-1", "rental_start_date": "2030-01-01", "rental_end_date": "2030-01-02"}])
        with patch("backend.services.booking_service.supabase", fake):
            response = await client.get("/bookings/")
        assert response.status_code == 200
        assert fake.queries_for("bookings")[0].filter_value("company_id") == COMPANY_ID

    @pytest.mark.asyncio
    async def test_get_other_companys_booking_is_404(self, client, as_company):
        as_company(COMPANY_ID)

        def responder(query):
            # the row exists, but belongs to company 99
            if query.filter_value("company_id") == COMPANY_ID:
                raise Exception("JSON object requested, multiple (or no) rows returned")
            return {"id": "b-1", "company_id": 99}

        fake = FakeSupabase(responder)
        with patch("backend.services.booking_service.supabase", fake):
            response = await client.get("/bookings/b-1")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_cancel_is_scoped_to_callers_company(self, client, as_company):
        as_company(COMPANY_ID)
        fake = FakeSupabase(lambda q: [{"id": "b-1", "booking_status": "cancelled"}])
        with patch("backend.services.booking_service.supabase", fake):
            response = await client.post("/bookings/b-1/cancel")
        assert response.status_code == 200
        update = fake.queries_for("bookings", "update")[0]
        assert update.filter_value("company_id") == COMPANY_ID
        assert update.payload["booking_status"] == "cancelled"

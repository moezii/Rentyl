"""Regression tests for smaller fixes: email escaping, contact rate-limit IP, rentals."""
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest

from backend.models.rental import RentalCreate
from backend.routes import contact
from backend.routes.tests.fakes import FakeSupabase
from backend.services.email_service import EmailService
from backend.utils.aes_utils import encrypt_id


class TestEmailEscaping:
    def test_customer_fields_are_escaped_in_company_email(self):
        html = EmailService()._generate_company_notification_html(
            company_name="ACME", customer_name='<a href="https://evil.example">Click</a>',
            customer_email="x@example.com", customer_phone="1", car_info="Car",
            rental_start="2030-01-01", rental_end="2030-01-02", amount_paid=21.0, booking_id="b-1",
            collection_address="<img src=x>")
        assert '<a href="https://evil.example">' not in html
        assert "&lt;a href=&quot;https://evil.example&quot;&gt;" in html
        assert "<img src=x>" not in html

    def test_contact_form_fields_are_escaped(self):
        form = contact.ContactFormData(name="Eve", email="eve@example.com", company="<b>Co</b>",
                                       message="<script>alert(1)</script> hello there friend")
        html = contact.generate_contact_email_html(form)
        assert "<script>" not in html and "&lt;script&gt;" in html
        assert "&lt;b&gt;Co&lt;/b&gt;" in html


class TestContactRateLimitIp:
    def setup_method(self):
        contact.rate_limit_storage.clear()

    @pytest.mark.asyncio
    async def test_rate_limit_is_per_client_not_per_proxy(self, client, monkeypatch):
        monkeypatch.setattr(contact, "RESEND_API_KEY", None)  # stop before sending
        body = {"name": "Eve", "email": "eve@example.com", "company": "Co",
                "message": "Hello, I would like a demo please."}
        first = await client.post("/contact/submit", json=body, headers={"X-Real-IP": "203.0.113.1"})
        second = await client.post("/contact/submit", json=body, headers={"X-Real-IP": "203.0.113.2"})
        # both requests come through the same proxy hop; neither may be throttled
        assert first.status_code != 429 and second.status_code != 429
        assert set(contact.rate_limit_storage) == {"203.0.113.1", "203.0.113.2"}


class TestRentals:
    @pytest.mark.asyncio
    async def test_naive_start_date_still_updates_car_status(self):
        from backend.services import rental_service

        # naive (no offset), as the frontend may send it
        start = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=1)
        row = {"rental_id": 1, "car_id": 3, "client_id": 4, "total_days": 2,
               "rental_start_date": start.isoformat(), "rental_end_date": (start + timedelta(days=2)).isoformat(),
               "daily_rate": 10, "final_price": 20, "payment_status": "unpaid", "amount_paid": 0}

        def responder(q):
            if q.table in ("cars", "clients") and q.action == "select":
                return {"car_id": 3, "daily_rate": 10}
            if q.table == "rentalrecords" and q.action == "insert":
                return [row]
            return []

        fake = FakeSupabase(responder)
        rental = RentalCreate(car_id=3, client_id=4, company_id=7, rental_start_date=start,
                              rental_end_date=start + timedelta(days=2))
        with patch.object(rental_service, "supabase", fake):
            await rental_service.create_rental_service(rental, 7)
        update = fake.queries_for("cars", "update")[0]
        # regression: naive vs aware comparison raised TypeError and skipped this update
        assert update.payload == {"status": "rented"}
        assert update.filter_value("company_id") == 7

    @pytest.mark.asyncio
    async def test_receipt_filename_is_ascii_for_arabic_names(self, client, as_company):
        as_company(7)

        async def fake_rental(rental_id, company_id):
            return {"rental_id": rental_id, "car_id": 3, "encrypted_client_id": encrypt_id(4)}

        def responder(q):
            if q.table == "clients":
                return {"name": "محمد علي", "phone_number": "1"}
            if q.table == "cars":
                return {"car_id": 3, "make": "Toyota"}
            return {"company_id": 7, "company_name": "ACME"}

        from io import BytesIO
        from backend.routes import rentals
        with patch.object(rentals, "get_rental_by_id_service", fake_rental), \
             patch.object(rentals, "supabase", FakeSupabase(responder)), \
             patch.object(rentals, "generate_rental_receipt_pdf", return_value=BytesIO(b"%PDF-1.4")):
            response = await client.get(f"/rentals/{encrypt_id(11)}/download-receipt")
        assert response.status_code == 200
        disposition = response.headers["content-disposition"]
        disposition.encode("latin-1")  # must not raise
        assert disposition.startswith("attachment; filename=rental_receipt_11_")

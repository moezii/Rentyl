"""Tests for the AMWAL payment endpoints (hash generation, response validation, return URL)."""
import hashlib
import hmac
from datetime import date, timedelta
from unittest.mock import AsyncMock, patch

import pytest

from backend.routes import payment
from backend.routes.tests.fakes import FakeSupabase
from backend.services.booking_service import BookingService
from backend.utils.aes_utils import encrypt_id, encrypt_id_legacy
from backend.utils.signed_tokens import sign_token, verify_token
from urllib.parse import unquote
from backend.utils.payment_utils import AMWALPaymentConfig, generate_secure_hash


def hash_request(**overrides):
    body = {
        "amount": 21.0,
        "currencyId": 512,
        "merchantId": AMWALPaymentConfig.MERCHANT_ID,
        "merchantReference": "REF-1",
        "requestDateTime": "2030-01-01T10:00:00.000Z",
        "sessionToken": "",
        "terminalId": AMWALPaymentConfig.TERMINAL_ID,
    }
    body.update(overrides)
    return body


def booking_context(amount=21.0):
    return {
        "booking_car_id": encrypt_id(42),
        "booking_start_date": date.today().isoformat(),
        "booking_end_date": (date.today() + timedelta(days=2)).isoformat(),
        "booking_expected_amount": amount,
        "license_upload_token": "lic",
        "id_upload_token": "id",
    }


@pytest.fixture
def priced_booking():
    price = {"total_cost": 21.0, "availability": {"available": True}}
    fake = FakeSupabase()
    with patch.object(BookingService, "calculate_booking_price", AsyncMock(return_value=price)), \
         patch.object(payment, "validate_upload_token", return_value={"hash": "h"}), \
         patch("backend.supabase.client.supabase", fake):
        yield fake


class TestGenerateHash:
    @pytest.mark.asyncio
    async def test_generates_hash_for_configured_merchant(self, client):
        response = await client.post("/payment/generate-hash", json=hash_request())
        assert response.status_code == 200
        params = {k: v for k, v in hash_request().items()}
        assert response.json()["secureHash"] == generate_secure_hash(params)

    @pytest.mark.asyncio
    async def test_rejects_foreign_merchant(self, client):
        response = await client.post("/payment/generate-hash", json=hash_request(merchantId="999999"))
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_booking_amount_must_match_server_price(self, client, priced_booking):
        # expected amount matches the price, but the amount that would be signed doesn't
        response = await client.post("/payment/generate-hash",
                                     json={**hash_request(amount=0.5), **booking_context(amount=21.0)})
        assert response.status_code == 400
        assert "price mismatch" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_booking_with_matching_amount_is_signed(self, client, priced_booking):
        response = await client.post("/payment/generate-hash",
                                     json={**hash_request(amount=21.0), **booking_context(amount=21.0)})
        assert response.status_code == 200
        assert priced_booking.rpc_calls[0][0] == "check_car_availability_secure"

    @pytest.mark.asyncio
    async def test_missing_booking_fields_are_a_400_not_a_500(self, client):
        # regression: HTTPExceptions raised inside the handler used to become 500s
        response = await client.post("/payment/generate-hash",
                                     json={**hash_request(), "booking_car_id": encrypt_id(42)})
        assert response.status_code == 400
        assert "Missing booking fields" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_conflicting_rental_blocks_payment(self, client, priced_booking):
        priced_booking.rpc_result = [{"available": False}]
        response = await client.post("/payment/generate-hash",
                                     json={**hash_request(), **booking_context()})
        assert response.status_code == 409


class TestValidateResponse:
    PARAMS = {
        "amount": "21.000", "currencyId": 512, "customerId": "c-1", "customerTokenId": "t-1",
        "merchantId": AMWALPaymentConfig.MERCHANT_ID, "merchantReference": "REF-1",
        "responseCode": "00", "terminalId": AMWALPaymentConfig.TERMINAL_ID,
        "transactionId": "txn-1", "transactionTime": "2030-01-01T10:00:00Z",
    }

    @staticmethod
    def amwal_hash(params):
        message = "&".join(f"{k[0].upper()}{k[1:]}={params[k]}" for k in sorted(params))
        key = bytes.fromhex(AMWALPaymentConfig.SECURE_HASH_KEY)
        return hmac.new(key, message.encode(), hashlib.sha256).hexdigest().upper()

    @pytest.mark.asyncio
    async def test_valid_hash_is_accepted(self, client):
        received = self.amwal_hash(self.PARAMS)
        response = await client.post("/payment/validate-response",
                                     json={"params": self.PARAMS, "receivedHash": received})
        assert response.json()["isValid"] is True

    @pytest.mark.asyncio
    async def test_tampered_amount_is_rejected(self, client):
        received = self.amwal_hash(self.PARAMS)
        tampered = {**self.PARAMS, "amount": "0.100"}
        response = await client.post("/payment/validate-response",
                                     json={"params": tampered, "receivedHash": received})
        assert response.json()["isValid"] is False


def amwal_response(**overrides):
    params = {**TestValidateResponse.PARAMS, **overrides}
    return params, TestValidateResponse.amwal_hash(params)


def intent_for(ref="REF-1", amount=21.0, car=42):
    s = date.today().isoformat()
    e = (date.today() + timedelta(days=2)).isoformat()
    return sign_token("intent", {"ref": ref, "car": car, "start": s, "end": e, "amt": amount}, 600)


class TestPaymentIntent:
    @pytest.mark.asyncio
    async def test_booking_hash_comes_with_signed_intent(self, client, priced_booking):
        response = await client.post("/payment/generate-hash",
                                     json={**hash_request(amount=21.0), **booking_context(amount=21.0)})
        intent = verify_token(response.json()["paymentIntent"], "intent")
        assert intent["ref"] == "REF-1" and intent["car"] == 42 and intent["amt"] == 21.0
        assert intent["start"] == booking_context()["booking_start_date"]
        # the availability RPC still gets the legacy-format encrypted ID stored in bookings
        assert priced_booking.rpc_calls[0][1]["p_car_id_enc"] == encrypt_id_legacy(42)

    @pytest.mark.asyncio
    async def test_non_booking_hash_has_no_intent(self, client):
        response = await client.post("/payment/generate-hash", json=hash_request())
        assert response.json()["paymentIntent"] is None


class TestConfirmPayment:
    async def _confirm(self, client, params, received, intent=None):
        return await client.post("/payment/confirm", json={
            "params": params, "receivedHash": received, "paymentIntent": intent or intent_for()})

    @pytest.mark.asyncio
    async def test_valid_payment_returns_payment_token(self, client):
        params, received = amwal_response()
        response = await self._confirm(client, params, received)
        assert response.status_code == 200
        token = verify_token(response.json()["paymentToken"], "payment")
        assert (token["txn"], token["ref"], token["amt"], token["car"]) == ("txn-1", "REF-1", 21.0, 42)

    @pytest.mark.asyncio
    async def test_forged_hash_is_rejected(self, client):
        params, _ = amwal_response()
        assert (await self._confirm(client, params, "00" * 32)).status_code == 400

    @pytest.mark.asyncio
    async def test_failed_payment_code_is_rejected(self, client):
        params, received = amwal_response(responseCode="03")
        assert (await self._confirm(client, params, received)).status_code == 402

    @pytest.mark.asyncio
    async def test_payment_for_another_reference_is_rejected(self, client):
        params, received = amwal_response(merchantReference="SOMEONE-ELSE")
        assert (await self._confirm(client, params, received)).status_code == 400

    @pytest.mark.asyncio
    async def test_underpayment_is_rejected(self, client):
        params, received = amwal_response(amount="1.000")
        assert (await self._confirm(client, params, received)).status_code == 400

    @pytest.mark.asyncio
    async def test_other_merchant_is_rejected(self, client):
        params, received = amwal_response(merchantId="999999")
        assert (await self._confirm(client, params, received)).status_code == 400

    @pytest.mark.asyncio
    async def test_forged_intent_is_rejected(self, client):
        params, received = amwal_response()
        assert (await self._confirm(client, params, received, intent="x.y")).status_code == 400


class TestReturnUrl:
    @pytest.mark.asyncio
    async def test_verified_return_redirects_with_payment_token(self, client):
        car = encrypt_id(42)
        params, received = amwal_response()
        response = await client.get("/payment/return", params={
            "carId": car, "intent": intent_for(), **params, "secureHashValue": received})
        assert response.status_code in (302, 307)
        location = response.headers["location"]
        assert f"/booking/{car}?payment=success&code=00&paymentToken=" in location
        token = unquote(location.split("paymentToken=")[1])

        status = await client.get("/payment/status", params={"token": token})
        assert status.json() == {"status": "success", "code": "00", "transaction_id": "txn-1"}

    @pytest.mark.asyncio
    async def test_unverifiable_success_code_is_pending(self, client):
        # regression: a bare responseCode=00 used to be reported as success
        car = encrypt_id(42)
        response = await client.get("/payment/return", params={"carId": car, "responseCode": "00", "transactionId": "t1"})
        assert response.headers["location"].endswith(f"/booking/{car}?payment=pending&code=00")

    @pytest.mark.asyncio
    async def test_tampered_return_is_failed(self, client):
        params, received = amwal_response()
        response = await client.get("/payment/return", params={
            "carId": encrypt_id(42), "intent": intent_for(), **params, "amount": "0.100",
            "secureHashValue": received})
        assert "payment=failed" in response.headers["location"]
        assert "paymentToken" not in response.headers["location"]

    @pytest.mark.asyncio
    async def test_cancel_is_failed(self, client):
        response = await client.get("/payment/return", params={"carId": "x", "responseCode": "00", "cancel": "1"})
        assert "payment=failed" in response.headers["location"]

    @pytest.mark.asyncio
    async def test_query_values_are_encoded_in_redirect(self, client):
        response = await client.get("/payment/return",
                                    params={"carId": "abc/../x?y=1", "responseCode": "00&payment=success"})
        location = response.headers["location"]
        # "/" and "?" are encoded ("=" stays: it is base64 padding in real IDs)
        assert "/booking/abc%2F..%2Fx%3Fy=1?payment=failed" in location
        assert location.endswith("payment=failed&code=00%26payment%3Dsuccess")

    @pytest.mark.asyncio
    async def test_status_without_valid_token_is_404(self, client):
        assert (await client.get("/payment/status", params={"car_id": encrypt_id(42)})).status_code == 404
        assert (await client.get("/payment/status", params={"token": "bad.token"})).status_code == 404

    @pytest.mark.asyncio
    async def test_log_callback_hides_errors(self, client):
        response = await client.post("/payment/log-callback", json={"type": "success", "responseCode": "00"})
        assert response.json()["success"] is True


class TestSessionToken:
    @pytest.mark.asyncio
    async def test_foreign_merchant_is_rejected(self, client):
        response = await client.post("/payment/get-session-token",
                                     json={"customerId": "00000000-0000-0000", "merchantId": "999999"})
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_malformed_customer_id_is_rejected(self, client):
        response = await client.post("/payment/get-session-token",
                                     json={"customerId": "../../x", "merchantId": AMWALPaymentConfig.MERCHANT_ID})
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_booking_amount_must_match_server_price(self, client, priced_booking):
        response = await client.post("/payment/get-session-token", json={
            "customerId": "00000000-0000-0000", "merchantId": AMWALPaymentConfig.MERCHANT_ID,
            "booking_car_id": encrypt_id(42), "booking_start_date": "2030-01-01",
            "booking_end_date": "2030-01-03", "amount": 1.0})
        assert response.status_code == 400
        assert "price mismatch" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_is_rate_limited(self, client):
        codes = []
        for _ in range(22):
            response = await client.post("/payment/get-session-token",
                                         json={"customerId": "00000000-0000-0000", "merchantId": "999999"})
            codes.append(response.status_code)
        assert codes[0] == 400 and codes[-1] == 429

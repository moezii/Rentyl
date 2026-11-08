"""
Unit tests for AMWAL payment hash helpers.

Recomputes the HMAC-SHA256 response hash independently and checks that
validate_response_integrity accepts it (and rejects tampered input).
All IDs and the key below are dummy placeholders.
"""
import hashlib
import hmac

import pytest

from backend.utils import payment_utils
from backend.utils.payment_utils import validate_response_integrity

DUMMY_HEX_KEY = "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff"


@pytest.fixture(autouse=True)
def dummy_hash_key(monkeypatch):
    monkeypatch.setattr(payment_utils.AMWALPaymentConfig, "SECURE_HASH_KEY", DUMMY_HEX_KEY)


def expected_response_hash(params):
    """Independent re-implementation of the AMWAL response hash string."""
    sorted_string = (
        f"Amount={params['amount']}&"
        f"CurrencyId={params['currencyId']}&"
        f"CustomerId={params['customerId']}&"
        f"CustomerTokenId={params['customerTokenId']}&"
        f"MerchantId={params['merchantId']}&"
        f"MerchantReference={params['merchantReference']}&"
        f"ResponseCode={params['responseCode']}&"
        f"TerminalId={params['terminalId']}&"
        f"TransactionId={params['transactionId']}&"
        f"TransactionTime={params['transactionTime']}"
    )
    return hmac.new(
        bytes.fromhex(DUMMY_HEX_KEY), sorted_string.encode("utf-8"), hashlib.sha256
    ).hexdigest().upper()


def make_params(amount):
    return {
        "amount": amount,
        "currencyId": 512,
        "customerId": "",
        "customerTokenId": "",
        "merchantId": "123456",
        "merchantReference": "TEST_ORDER_123",
        "responseCode": "00",
        "terminalId": "654321",
        "transactionId": "test-txn-123",
        "transactionTime": "15/11/2025, 7:33:25 PM",
    }


@pytest.mark.parametrize("amount", ["5.000", "10.5", 10.5])
def test_validate_response_integrity_accepts_matching_hash(amount):
    params = make_params(amount)
    assert validate_response_integrity(params, expected_response_hash(params)) is True


def test_validate_response_integrity_is_case_insensitive_on_received_hash():
    params = make_params("5.000")
    assert validate_response_integrity(params, expected_response_hash(params).lower()) is True


def test_validate_response_integrity_rejects_tampered_amount():
    params = make_params("5.000")
    good_hash = expected_response_hash(params)
    params["amount"] = "50.000"
    assert validate_response_integrity(params, good_hash) is False


def test_validate_response_integrity_rejects_missing_field():
    params = make_params("5.000")
    good_hash = expected_response_hash(params)
    del params["transactionId"]
    assert validate_response_integrity(params, good_hash) is False

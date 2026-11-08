"""
AMWAL Payment Gateway Utility Functions

This module provides utility functions for secure hash generation and validation
for the AMWAL Payment Gateway integration.

IMPORTANT SECURITY NOTES:
- Secure hash MUST be generated on the backend using the merchant secret key
- NEVER expose the merchant secret key to the frontend
- All hash generation must use HMAC-SHA256 algorithm
"""

import hmac
import hashlib
import logging
import os
from typing import Dict, Any
from datetime import datetime, timezone
from dotenv import load_dotenv

# Load environment variables from root .env file
load_dotenv()

logger = logging.getLogger(__name__)


class AMWALPaymentConfig:
    """
    AMWAL Payment Gateway Configuration

    All values are loaded from root .env file
    SECURITY: These must NEVER be exposed to the frontend
    """

    # Load from root .env file - No fallback values for security
    MERCHANT_ID = os.getenv('AMWAL_MERCHANT_ID')
    TERMINAL_ID = os.getenv('AMWAL_TERMINAL_ID')
    SECURE_HASH_KEY = os.getenv('AMWAL_SECURE_HASH_KEY')

    # Validate that critical environment variables are set
    if not MERCHANT_ID:
        raise ValueError("AMWAL_MERCHANT_ID must be set in .env file")
    if not TERMINAL_ID:
        raise ValueError("AMWAL_TERMINAL_ID must be set in .env file")
    if not SECURE_HASH_KEY:
        raise ValueError("AMWAL_SECURE_HASH_KEY must be set in .env file")

    # Supported currency (512 = Omani Rial)
    CURRENCY_ID = 512

    # Environment URLs
    ENVIRONMENTS = {
        'PRODUCTION': 'https://webhook.amwalpg.com',
        'SIT': 'https://test.amwalpg.com:24443',
        'UAT': 'https://test.amwalpg.com:14443'
    }

    # Current environment from root .env
    CURRENT_ENV = os.getenv('AMWAL_ENVIRONMENT') or 'UAT'


def generate_secure_hash(params: Dict[str, Any]) -> str:
    """
    Generate secure hash for AMWAL Payment Gateway using HMAC-SHA256

    The hash is calculated from sorted key-value pairs concatenated with the secret key.
    This ensures the integrity of the payment request.

    Args:
        params (dict): Dictionary containing payment parameters
            Required keys:
            - amount: Transaction amount
            - currencyId: Currency ID (512 for OMR)
            - merchantId: Merchant ID
            - merchantReference: Unique reference for transaction
            - requestDateTime: ISO format datetime
            - sessionToken: Session token (empty string if not using)
            - terminalId: Terminal ID

    Returns:
        str: Uppercase hexadecimal secure hash

    Raises:
        ValueError: If required parameters are missing or invalid

    Example:
        >>> params = {
        ...     "amount": 10,
        ...     "currencyId": 512,
        ...     "merchantId": "123456",
        ...     "merchantReference": "ORDER123",
        ...     "requestDateTime": "2024-12-31T15:27:10.361969Z",
        ...     "sessionToken": "",
        ...     "terminalId": "654321"
        ... }
        >>> hash_value = generate_secure_hash(params)
    """

    # Validate required parameters
    required_keys = [
        'amount', 'currencyId', 'merchantId', 'merchantReference',
        'requestDateTime', 'sessionToken', 'terminalId'
    ]

    for key in required_keys:
        if key not in params:
            raise ValueError(f"Missing required parameter: {key}")

    # Construct the string to hash according to AMWAL specification
    # Format: Amount=value&CurrencyId=value&MerchantId=value...
    # Keys must be in PascalCase (capital first letter)

    # Format amount: if it's a whole number, remove decimal places
    # e.g., 10.0 becomes "10", but 10.5 stays "10.5"
    amount_value = params['amount']
    if isinstance(amount_value, float) and amount_value.is_integer():
        amount_str = str(int(amount_value))
    else:
        amount_str = str(amount_value)

    sorted_string = (
        f"Amount={amount_str}&"
        f"CurrencyId={params['currencyId']}&"
        f"MerchantId={params['merchantId']}&"
        f"MerchantReference={params['merchantReference']}&"
        f"RequestDateTime={params['requestDateTime']}&"
        f"SessionToken={params['sessionToken']}&"
        f"TerminalId={params['terminalId']}"
    )

    logger.debug("Building AMWAL request hash")

    # Convert hex key to binary
    try:
        binary_key = bytes.fromhex(AMWALPaymentConfig.SECURE_HASH_KEY)
    except ValueError:
        raise ValueError("Invalid SECURE_HASH_KEY format. Must be hexadecimal.")

    # Generate HMAC-SHA256 hash
    hmac_hash = hmac.new(
        binary_key,
        sorted_string.encode('utf-8'),
        hashlib.sha256
    )

    # Return uppercase hexadecimal hash
    secure_hash = hmac_hash.hexdigest().upper()


    return secure_hash


def validate_response_integrity(params: Dict[str, Any], received_hash: str) -> bool:
    """
    Validate the integrity of the payment response from AMWAL

    This compares the received hash with a recalculated hash to ensure
    the response hasn't been tampered with.

    Args:
        params (dict): Response parameters from AMWAL
            Required keys:
            - amount: Transaction amount
            - currencyId: Currency ID
            - customerId: Customer ID
            - customerTokenId: Customer token ID
            - merchantId: Merchant ID
            - merchantReference: Transaction reference
            - responseCode: Response code
            - terminalId: Terminal ID
            - transactionId: Transaction ID
            - transactionTime: Transaction timestamp
        received_hash (str): Hash value received from AMWAL

    Returns:
        bool: True if hash is valid, False otherwise

    Example:
        >>> response_params = {
        ...     "amount": 10,
        ...     "currencyId": 512,
        ...     "customerId": "abc-123",
        ...     "customerTokenId": "token-456",
        ...     "merchantId": "123456",
        ...     "merchantReference": "ORDER123",
        ...     "responseCode": "00",
        ...     "terminalId": "654321",
        ...     "transactionId": "txn-789",
        ...     "transactionTime": "2024-12-31T15:30:00Z"
        ... }
        >>> is_valid = validate_response_integrity(response_params, "RECEIVED_HASH")
    """

    try:
        # CRITICAL: For response validation, do NOT format the amount
        # AMWAL sends amount as string "9.000" and uses it EXACTLY in their hash
        # Unlike request hash (which formats 9.0 -> "9"), response hash keeps "9.000" as is
        amount_str = str(params['amount'])

        # Construct the sorted string for validation using PascalCase (capital first letter)
        # Format matches AMWAL specification for response validation
        sorted_string = (
            f"Amount={amount_str}&"
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


        # Convert hex key to binary
        try:
            binary_key = bytes.fromhex(AMWALPaymentConfig.SECURE_HASH_KEY)
        except ValueError:
            raise ValueError("Invalid SECURE_HASH_KEY format. Must be hexadecimal.")

        # Generate HMAC-SHA256 hash
        hmac_hash = hmac.new(
            binary_key,
            sorted_string.encode('utf-8'),
            hashlib.sha256
        )

        # Return uppercase hexadecimal hash
        calculated_hash = hmac_hash.hexdigest().upper()


        # Compare hashes (constant time comparison to prevent timing attacks)
        is_valid = hmac.compare_digest(calculated_hash, received_hash.upper())
        logger.debug("AMWAL response hash match: %s", is_valid)

        return is_valid

    except (KeyError, ValueError) as e:
        print(f"[ERROR] Error validating response integrity: {e}")
        import traceback
        traceback.print_exc()
        return False


def generate_session_token_hash(customer_id: str, merchant_id: str, request_datetime: str) -> str:
    """
    Generate secure hash for session token request

    Args:
        customer_id (str): Unique customer identifier
        merchant_id (str): Merchant ID
        request_datetime (str): Request datetime in ISO format

    Returns:
        str: Uppercase hexadecimal secure hash
    """

    # Construct sorted string for session token request
    sorted_string = (
        f"customerId={customer_id}&"
        f"merchantId={merchant_id}&"
        f"requestDateTime={request_datetime}"
    )

    # Convert hex key to binary
    binary_key = bytes.fromhex(AMWALPaymentConfig.SECURE_HASH_KEY)

    # Generate HMAC-SHA256 hash
    hmac_hash = hmac.new(
        binary_key,
        sorted_string.encode('utf-8'),
        hashlib.sha256
    )

    return hmac_hash.hexdigest().upper()


def get_current_datetime_iso() -> str:
    """
    Get current datetime in ISO format for AMWAL requests

    Returns:
        str: Current datetime in ISO format with Z suffix
    """
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%fZ')


# Example usage and testing
if __name__ == "__main__":
    # Example: Generate secure hash for a payment request
    print("AMWAL Payment Gateway - Secure Hash Generation Example")
    print("=" * 60)

    example_params = {
        "amount": 10,
        "currencyId": 512,
        "merchantId": "123456",
        "merchantReference": "TEST_ORDER_123",
        "requestDateTime": get_current_datetime_iso(),
        "sessionToken": "",
        "terminalId": "654321"
    }

    print("\nPayment Parameters:")
    for key, value in example_params.items():
        print(f"  {key}: {value}")

    try:
        secure_hash = generate_secure_hash(example_params)
        print(f"\nGenerated Secure Hash: {secure_hash}")
    except ValueError as e:
        print(f"\nError: {e}")
        print("\nPlease configure your AMWAL credentials in environment variables:")
        print("  - AMWAL_MERCHANT_ID")
        print("  - AMWAL_TERMINAL_ID")
        print("  - AMWAL_SECURE_HASH_KEY (in hexadecimal format)")

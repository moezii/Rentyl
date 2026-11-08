"""
AMWAL Payment Gateway Response Code Mappings

This module provides human-readable messages for AMWAL payment gateway response codes.
Used for logging and displaying user-friendly error messages.

Author: Rentyl Development Team
Date: 2026-01-09
"""

# AMWAL Response Code Mappings
# Based on standard payment gateway response codes
AMWAL_RESPONSE_CODES = {
    # Success
    "00": {
        "status": "success",
        "message": "Payment completed successfully",
        "user_message": "Payment completed successfully",
        "action": "proceed"
    },

    # Card/Payment Declined
    "05": {
        "status": "declined",
        "message": "Do not honor - Transaction declined by bank",
        "user_message": "Your card was declined. Please try a different payment method or contact your bank.",
        "action": "retry_different_card"
    },
    "14": {
        "status": "error",
        "message": "Invalid card number",
        "user_message": "Invalid card number. Please check your card details and try again.",
        "action": "retry"
    },
    "51": {
        "status": "declined",
        "message": "Insufficient funds",
        "user_message": "Insufficient funds. Please use a different card or payment method.",
        "action": "retry_different_card"
    },
    "54": {
        "status": "error",
        "message": "Expired card",
        "user_message": "Your card has expired. Please use a different card.",
        "action": "retry_different_card"
    },
    "55": {
        "status": "error",
        "message": "Incorrect PIN",
        "user_message": "Incorrect PIN entered. Please try again.",
        "action": "retry"
    },
    "57": {
        "status": "declined",
        "message": "Transaction not permitted to cardholder",
        "user_message": "This transaction is not permitted. Please contact your bank or try a different card.",
        "action": "retry_different_card"
    },
    "61": {
        "status": "declined",
        "message": "Exceeds withdrawal amount limit",
        "user_message": "Transaction amount exceeds your card limit. Please use a different card or contact your bank.",
        "action": "retry_different_card"
    },
    "62": {
        "status": "declined",
        "message": "Restricted card",
        "user_message": "Your card is restricted. Please contact your bank or use a different card.",
        "action": "retry_different_card"
    },
    "65": {
        "status": "declined",
        "message": "Exceeds withdrawal frequency limit",
        "user_message": "Transaction frequency limit exceeded. Please try again later or use a different card.",
        "action": "retry_different_card"
    },

    # Security/Fraud
    "34": {
        "status": "error",
        "message": "Suspected fraud",
        "user_message": "Transaction blocked for security reasons. Please contact your bank.",
        "action": "contact_bank"
    },
    "41": {
        "status": "error",
        "message": "Lost card",
        "user_message": "Card reported as lost. Please use a different card.",
        "action": "retry_different_card"
    },
    "43": {
        "status": "error",
        "message": "Stolen card",
        "user_message": "Card reported as stolen. Please use a different card.",
        "action": "retry_different_card"
    },

    # Technical/System Errors
    "12": {
        "status": "error",
        "message": "Invalid transaction",
        "user_message": "Transaction error. Please try again or contact support.",
        "action": "retry"
    },
    "13": {
        "status": "error",
        "message": "Invalid amount",
        "user_message": "Invalid payment amount. Please refresh the page and try again.",
        "action": "refresh"
    },
    "30": {
        "status": "error",
        "message": "Format error",
        "user_message": "Payment processing error. Please try again.",
        "action": "retry"
    },
    "58": {
        "status": "error",
        "message": "Transaction not permitted to terminal",
        "user_message": "Payment gateway error. Please try again or contact support.",
        "action": "contact_support"
    },
    "91": {
        "status": "error",
        "message": "Issuer or switch is inoperative",
        "user_message": "Bank system temporarily unavailable. Please try again in a few minutes.",
        "action": "retry_later"
    },
    "92": {
        "status": "error",
        "message": "Financial institution or intermediate network facility cannot be found",
        "user_message": "Unable to connect to your bank. Please try again later.",
        "action": "retry_later"
    },
    "96": {
        "status": "error",
        "message": "System malfunction",
        "user_message": "Payment system error. Please try again or contact support.",
        "action": "contact_support"
    },

    # Timeout
    "68": {
        "status": "timeout",
        "message": "Response received too late",
        "user_message": "Payment timed out. Please check your booking status or try again.",
        "action": "check_status"
    },

    # 3D Secure
    "N7": {
        "status": "error",
        "message": "CVV2 failure",
        "user_message": "Incorrect CVV/Security code. Please check and try again.",
        "action": "retry"
    },

    # Generic/Unknown
    "default": {
        "status": "error",
        "message": "Payment processing error",
        "user_message": "Payment failed. Please try again or use a different payment method.",
        "action": "retry"
    }
}


def get_response_details(response_code: str) -> dict:
    """
    Get detailed information about a payment response code

    Args:
        response_code: AMWAL response code (e.g., "00", "05", "51")

    Returns:
        Dictionary containing status, messages, and recommended action
    """
    response_code = str(response_code).strip()
    return AMWAL_RESPONSE_CODES.get(response_code, AMWAL_RESPONSE_CODES["default"])


def get_user_message(response_code: str) -> str:
    """
    Get user-friendly error message for a response code

    Args:
        response_code: AMWAL response code

    Returns:
        User-friendly error message
    """
    details = get_response_details(response_code)
    return details["user_message"]


def get_log_message(response_code: str) -> str:
    """
    Get technical log message for a response code

    Args:
        response_code: AMWAL response code

    Returns:
        Technical message for logging
    """
    details = get_response_details(response_code)
    return details["message"]


def is_success(response_code: str) -> bool:
    """
    Check if response code indicates success

    Args:
        response_code: AMWAL response code

    Returns:
        True if successful, False otherwise
    """
    details = get_response_details(response_code)
    return details["status"] == "success"


def should_retry(response_code: str) -> bool:
    """
    Check if user should retry the payment

    Args:
        response_code: AMWAL response code

    Returns:
        True if retry is recommended, False otherwise
    """
    details = get_response_details(response_code)
    return details["action"] in ["retry", "retry_different_card", "retry_later"]

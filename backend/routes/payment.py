"""
AMWAL Payment Gateway API Routes

This module provides REST API endpoints for payment processing through AMWAL Payment Gateway.
It handles secure hash generation, response validation, and session token management.

Author: Rentyl Development Team
Date: 2025
"""

from fastapi import APIRouter, HTTPException, status, Request, Depends
from backend.utils.errors import server_error
from backend.utils.concurrency import offload
from backend.utils.rate_limit import payment_limiter
from backend.utils.signed_tokens import (
    sign_token, verify_token, InvalidToken, INTENT_TTL_SECONDS, PAYMENT_TTL_SECONDS
)
from backend.utils.aes_utils import decrypt_id, to_legacy_id
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any
import httpx
from urllib.parse import quote
import logging

from backend.utils.payment_utils import (
    generate_secure_hash,
    validate_response_integrity,
    generate_session_token_hash,
    get_current_datetime_iso,
    AMWALPaymentConfig
)
from backend.utils.payment_response_codes import (
    get_user_message,
    get_log_message
)
from backend.services.booking_service import booking_service
from backend.utils.document_upload_cache import validate_upload_token


# Create router
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payment", tags=["Payment"])

from backend.config import FRONTEND_BASE_URL

# Largest difference accepted between a paid / signed amount and the server price
from backend.services.booking_service import PRICE_TOLERANCE

# Fields of AMWAL's response that are covered by its secure hash
AMWAL_RESPONSE_FIELDS = (
    "amount", "currencyId", "customerId", "customerTokenId", "merchantId",
    "merchantReference", "responseCode", "terminalId", "transactionId", "transactionTime",
)


def verify_amwal_payment(params: Dict[str, Any], received_hash: str, payment_intent: str) -> Dict[str, Any]:
    """Verify a successful AMWAL payment and return the signed payment token payload.

    Checks AMWAL's response hash, the response code, our merchant/terminal, and
    that merchant reference and amount match the payment intent issued by
    /payment/generate-hash. Raises HTTPException when any check fails.
    """
    try:
        intent = verify_token(payment_intent, "intent")
    except InvalidToken:
        raise HTTPException(status_code=400, detail="Payment intent is missing or expired")

    missing = [k for k in ("amount", "merchantId", "merchantReference", "responseCode",
                           "terminalId", "transactionId", "transactionTime") if params.get(k) in (None, "")]
    if missing or not received_hash:
        raise HTTPException(status_code=400, detail="Incomplete payment response")

    normalized = {k: params.get(k) if params.get(k) is not None else "" for k in AMWAL_RESPONSE_FIELDS}
    if not validate_response_integrity(normalized, str(received_hash)):
        logger.warning("AMWAL response hash mismatch for reference %s", params.get("merchantReference"))
        raise HTTPException(status_code=400, detail="Payment response could not be verified")
    if str(params["responseCode"]) != "00":
        raise HTTPException(status_code=402, detail="Payment was not successful")
    if (str(params["merchantId"]) != str(AMWALPaymentConfig.MERCHANT_ID)
            or str(params["terminalId"]) != str(AMWALPaymentConfig.TERMINAL_ID)):
        raise HTTPException(status_code=400, detail="Payment was made to a different merchant")
    if str(params["merchantReference"]) != intent["ref"]:
        raise HTTPException(status_code=400, detail="Payment does not match this booking")
    try:
        paid = float(params["amount"])
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid payment amount")
    if abs(paid - float(intent["amt"])) > PRICE_TOLERANCE:
        raise HTTPException(status_code=400, detail="Paid amount does not match the booking price")

    return {
        "txn": str(params["transactionId"]),
        "ref": intent["ref"],
        "amt": paid,
        "car": intent["car"],
        "start": intent["start"],
        "end": intent["end"],
    }


def issue_payment_token(payment: Dict[str, Any]) -> str:
    return sign_token("payment", payment, PAYMENT_TTL_SECONDS)


# Request/Response Models
class GenerateHashRequest(BaseModel):
    """Request model for generating secure hash"""
    amount: float = Field(..., gt=0, description="Transaction amount (must be > 0)")
    currencyId: int = Field(512, description="Currency ID (512 for OMR)")
    merchantId: str = Field(..., description="Merchant ID")
    merchantReference: str = Field(..., description="Unique transaction reference")
    requestDateTime: str = Field(..., description="Request datetime in ISO format")
    sessionToken: str = Field("", description="Session token for recurring payments")
    terminalId: str = Field(..., description="Terminal ID")
    # Optional booking context to prevent payment when booking/availability fails
    booking_car_id: Optional[str] = Field(None, description="Encrypted car ID for booking validation")
    booking_start_date: Optional[str] = Field(None, description="Rental start date (YYYY-MM-DD)")
    booking_end_date: Optional[str] = Field(None, description="Rental end date (YYYY-MM-DD)")
    booking_expected_amount: Optional[float] = Field(
        None, gt=0, description="Amount expected from validated price"
    )
    license_upload_token: Optional[str] = Field(
        None, description="Upload token for the driver's license document"
    )
    id_upload_token: Optional[str] = Field(
        None, description="Upload token for the ID document"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "amount": 100.50,
                "currencyId": 512,
                "merchantId": "123456",
                "merchantReference": "ORDER_123456",
                "requestDateTime": "2024-12-31T15:27:10.361969Z",
                "sessionToken": "",
                "terminalId": "654321"
            }
        },
    )


class GenerateHashResponse(BaseModel):
    """Response model for secure hash generation"""
    secureHash: str = Field(..., description="Generated secure hash")
    success: bool = Field(True, description="Success status")
    message: str = Field("Secure hash generated successfully")
    paymentIntent: Optional[str] = Field(
        None, description="Signed booking payment intent (only for booking payments); "
                          "required to confirm the payment afterwards"
    )


class ConfirmPaymentRequest(BaseModel):
    """AMWAL's response (from the SmartBox completeCallback) plus our payment intent"""
    params: Dict[str, Any] = Field(..., description="AMWAL response fields (amount, merchantReference, ...)")
    receivedHash: str = Field(..., max_length=256, description="secureHashValue from AMWAL")
    paymentIntent: str = Field(..., max_length=4096, description="paymentIntent from /payment/generate-hash")


class ConfirmPaymentResponse(BaseModel):
    success: bool = True
    paymentToken: str = Field(..., description="Pass to /bookings/create as payment_token")
    transactionId: str


class ValidateResponseRequest(BaseModel):
    """Request model for validating payment response"""
    params: Dict[str, Any] = Field(..., description="Response parameters from AMWAL")
    receivedHash: str = Field(..., description="Hash value received from AMWAL")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "params": {
                    "amount": 100.50,
                    "currencyId": 512,
                    "customerId": "abc-123-def",
                    "customerTokenId": "token-456",
                    "merchantId": "123456",
                    "merchantReference": "ORDER_123456",
                    "responseCode": "00",
                    "terminalId": "654321",
                    "transactionId": "txn-789",
                    "transactionTime": "2024-12-31T15:30:00Z"
                },
                "receivedHash": "<HEX_HMAC_SHA256_FROM_AMWAL>"
            }
        },
    )


class ValidateResponseResponse(BaseModel):
    """Response model for validation result"""
    isValid: bool = Field(..., description="Whether the response is valid")
    success: bool = Field(True, description="Success status")
    message: str = Field(..., description="Validation result message")


class GetSessionTokenRequest(BaseModel):
    """Request model for getting session token"""
    customerId: str = Field(..., min_length=8, max_length=64, pattern=r"^[A-Za-z0-9-]+$",
                            description="Customer ID from previous transaction")
    merchantId: str = Field(..., max_length=32, description="Merchant ID")
    # Optional booking context: when given, the price is checked like /generate-hash
    booking_car_id: Optional[str] = Field(None, description="Encrypted car ID")
    booking_start_date: Optional[str] = Field(None, description="Rental start date (YYYY-MM-DD)")
    booking_end_date: Optional[str] = Field(None, description="Rental end date (YYYY-MM-DD)")
    amount: Optional[float] = Field(None, gt=0, description="Amount the customer is about to pay")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "customerId": "00000000-0000-0000-0000-000000000000",
                "merchantId": "123456"
            }
        },
    )


class GetSessionTokenResponse(BaseModel):
    """Response model for session token"""
    sessionToken: str = Field(..., description="Session token for recurring payment")
    success: bool = Field(True, description="Success status")
    message: str = Field("Session token retrieved successfully")


class PaymentConfigData(BaseModel):
    """Payment configuration data"""
    merchantId: str = Field(..., description="Merchant ID")
    terminalId: str = Field(..., description="Terminal ID")
    currencyId: int = Field(..., description="Currency ID")
    environment: str = Field(..., description="Current environment")


class PaymentConfigResponse(BaseModel):
    """Response model for payment configuration"""
    success: bool = Field(True, description="Success status")
    data: PaymentConfigData = Field(..., description="Configuration data")


# API Endpoints

@router.post(
    "/generate-hash",
    response_model=GenerateHashResponse,
    summary="Generate Secure Hash for Payment Request",
    description="""
    Generates a secure hash for AMWAL payment requests using HMAC-SHA256.

    **IMPORTANT**: This endpoint MUST be called from the backend only.
    Never generate secure hashes on the client side as it requires the secret key.

    The hash ensures the integrity of the payment request and prevents tampering.
    """
)
@offload
async def generate_payment_hash(request: GenerateHashRequest, _rl: None = Depends(payment_limiter)):
    """
    Generate secure hash for payment request

    Args:
        request: Payment parameters including amount, merchant info, etc.

    Returns:
        GenerateHashResponse with the generated secure hash

    Raises:
        HTTPException: If hash generation fails
    """
    try:
        # Only sign requests for this merchant/terminal: the hash key must not be
        # usable as a signing oracle for arbitrary AMWAL parameters.
        if (str(request.merchantId) != str(AMWALPaymentConfig.MERCHANT_ID)
                or str(request.terminalId) != str(AMWALPaymentConfig.TERMINAL_ID)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid merchant or terminal ID"
            )

        # If booking context is provided, validate availability and price before issuing hash
        if request.booking_car_id or request.booking_start_date or request.booking_end_date:
            missing = []
            if not request.booking_car_id:
                missing.append("booking_car_id")
            if not request.booking_start_date:
                missing.append("booking_start_date")
            if not request.booking_end_date:
                missing.append("booking_end_date")
            if not request.license_upload_token:
                missing.append("license_upload_token")
            if not request.id_upload_token:
                missing.append("id_upload_token")
            if missing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Missing booking fields for validation: {', '.join(missing)}"
                )

            try:
                price_breakdown = await booking_service.calculate_booking_price(
                    request.booking_car_id,
                    request.booking_start_date,
                    request.booking_end_date
                )
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Booking validation failed: {str(e)}"
                )

            if not validate_upload_token(request.license_upload_token):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="License document upload is missing or expired. Please re-upload."
                )
            if not validate_upload_token(request.id_upload_token):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="ID document upload is missing or expired. Please re-upload."
                )

            # The amount that gets signed must be the server-calculated price (the
            # expected amount alone is not enough: it is not part of the hash).
            backend_total = float(price_breakdown.get("total_cost", 0))
            if abs(backend_total - float(request.amount)) > PRICE_TOLERANCE:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Booking price mismatch. Please refresh and try again."
                )

            # Check amount alignment if provided
            if request.booking_expected_amount is not None:
                if abs(backend_total - float(request.booking_expected_amount)) > PRICE_TOLERANCE:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Booking price mismatch. Please refresh and try again."
                    )

            # Block payment if availability says not available
            availability = price_breakdown.get("availability")
            if availability and not availability.get("available", True):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Car is not available for the selected dates"
                )

            # CRITICAL: Double-check availability with database lock to prevent race conditions
            # This ensures that between now and payment completion, no other booking sneaks in
            from backend.supabase.client import supabase

            try:
                decrypted_car_id = decrypt_id(request.booking_car_id)

                # Use PostgreSQL's check with RPC to verify no conflicts exist
                # This is a final gate before allowing payment to proceed
                final_check = supabase.rpc(
                    'check_car_availability_secure',
                    {
                        'p_car_id_enc': to_legacy_id(request.booking_car_id),
                        'p_car_id_int': decrypted_car_id,
                        'p_start': request.booking_start_date,
                        'p_end': request.booking_end_date
                    }
                ).execute()

                # If RPC returns conflicts, block payment
                if final_check.data:
                    has_conflicts = False
                    for row in final_check.data:
                        if row.get("available") is False:
                            has_conflicts = True
                            break

                    if has_conflicts:
                        raise HTTPException(
                            status_code=status.HTTP_409_CONFLICT,
                            detail="Car was just booked by another customer. Please select different dates."
                        )

            except HTTPException:
                raise  # Re-raise HTTP exceptions
            except Exception as lock_error:
                # Log error but don't block payment - database constraint will catch actual conflicts
                import traceback
                print(f"[WARNING] Final availability check failed: {str(lock_error)}")
                traceback.print_exc()
                # Continue - the exclusion constraint on rentalrecords will be the final safety net

        # Convert request to dict for hash generation
        params = {
            "amount": request.amount,
            "currencyId": request.currencyId,
            "merchantId": request.merchantId,
            "merchantReference": request.merchantReference,
            "requestDateTime": request.requestDateTime,
            "sessionToken": request.sessionToken,
            "terminalId": request.terminalId
        }

        # Generate secure hash
        secure_hash = generate_secure_hash(params)

        # For booking payments, bind the merchant reference to the car, dates and
        # the amount that was signed. /payment/confirm and /payment/return only
        # accept AMWAL responses that match this intent.
        payment_intent = None
        if request.booking_car_id:
            payment_intent = sign_token("intent", {
                "ref": request.merchantReference,
                "car": decrypt_id(request.booking_car_id),
                "start": request.booking_start_date,
                "end": request.booking_end_date,
                "amt": float(request.amount),
            }, INTENT_TTL_SECONDS)

        # Log payment initiation for tracking
        logger.info("[PAYMENT INITIATED] Merchant Reference: %s | Amount: %s",
                    request.merchantReference, request.amount)

        return GenerateHashResponse(
            secureHash=secure_hash,
            success=True,
            message="Secure hash generated successfully",
            paymentIntent=payment_intent,
        )

    except ValueError as e:
        print(f"[PAYMENT ERROR] Invalid parameters for merchant reference {request.merchantReference}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid payment parameters: {str(e)}"
        )
    except Exception as e:
        print(f"[PAYMENT ERROR] Failed to generate hash for merchant reference {request.merchantReference}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise server_error(e, "Failed to generate secure hash")


@router.post(
    "/validate-response",
    response_model=ValidateResponseResponse,
    summary="Validate Payment Response Integrity",
    description="""
    Validates the integrity of a payment response from AMWAL Payment Gateway.

    This endpoint compares the received hash with a recalculated hash to ensure
    the response hasn't been tampered with.
    """
)
async def validate_payment_response(request: ValidateResponseRequest):
    """
    Validate payment response integrity

    Args:
        request: Response parameters and received hash from AMWAL

    Returns:
        ValidateResponseResponse indicating if the response is valid
    """
    try:
        # Log the received data for debugging
        logger.debug("Validating AMWAL payment response for merchant reference %s",
                     request.params.get("merchantReference"))

        # Validate response integrity
        is_valid = validate_response_integrity(
            request.params,
            request.receivedHash
        )

        if is_valid:
            print("[DEBUG] Payment response validation SUCCESSFUL")
            return ValidateResponseResponse(
                isValid=True,
                success=True,
                message="Response integrity validated successfully"
            )
        else:
            print("[DEBUG] Payment response validation FAILED - hash mismatch")
            return ValidateResponseResponse(
                isValid=False,
                success=True,
                message="Response integrity validation failed - hash mismatch"
            )

    except KeyError as e:
        print(f"[ERROR] Missing required parameter: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing required parameter: {str(e)}"
        )
    except Exception as e:
        print(f"[ERROR] Failed to validate response: {str(e)}")
        import traceback
        traceback.print_exc()
        raise server_error(e, "Failed to validate response")


@router.post(
    "/confirm",
    response_model=ConfirmPaymentResponse,
    summary="Verify a completed AMWAL payment",
    description="""
    Verifies AMWAL's response hash for a completed payment (as received by the
    SmartBox completeCallback) against the payment intent from /generate-hash,
    and returns a short-lived server-signed payment token for /bookings/create.
    """
)
def confirm_payment(request: ConfirmPaymentRequest, _rl: None = Depends(payment_limiter)):
    payment = verify_amwal_payment(request.params, request.receivedHash, request.paymentIntent)
    logger.info("[PAYMENT VERIFIED] Merchant Reference: %s", payment["ref"])
    return ConfirmPaymentResponse(paymentToken=issue_payment_token(payment), transactionId=payment["txn"])


@router.post(
    "/get-session-token",
    response_model=GetSessionTokenResponse,
    summary="Get Session Token for Recurring Payments",
    description="""
    Retrieves a session token for recurring payments using saved cards.

    The customer ID should be obtained from the first successful transaction
    where the customer chose to save their card.

    This endpoint calls the AMWAL API to get the session token.
    """
)
@offload
async def get_session_token(request: GetSessionTokenRequest, _rl: None = Depends(payment_limiter)):
    """
    Get session token for recurring payments

    Args:
        request: Customer ID and merchant ID

    Returns:
        GetSessionTokenResponse with session token

    Raises:
        HTTPException: If token retrieval fails
    """
    # Public endpoint (saved-card checkout): only for our merchant, and when a
    # booking is given the amount must be the server price for it.
    if str(request.merchantId) != str(AMWALPaymentConfig.MERCHANT_ID):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid merchant ID")
    booking_fields = (request.booking_car_id, request.booking_start_date,
                      request.booking_end_date, request.amount)
    if any(v is not None for v in booking_fields):
        if any(v is None for v in booking_fields):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail="booking_car_id, booking_start_date, booking_end_date and amount are required together")
        try:
            price = await booking_service.calculate_booking_price(
                request.booking_car_id, request.booking_start_date, request.booking_end_date)
        except Exception as e:
            logger.warning("Session token price check failed: %s", e)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Booking validation failed")
        if abs(float(price.get("total_cost", 0)) - float(request.amount)) > PRICE_TOLERANCE:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail="Booking price mismatch. Please refresh and try again.")

    try:
        # Generate current datetime
        request_datetime = get_current_datetime_iso()

        # Generate secure hash for session token request
        secure_hash = generate_session_token_hash(
            request.customerId,
            request.merchantId,
            request_datetime
        )

        # Prepare request payload for AMWAL API
        payload = {
            "customerId": request.customerId,
            "merchantId": int(request.merchantId),
            "requestDateTime": request_datetime,
            "secureHashValue": secure_hash
        }

        # Get environment URL
        env_url = AMWALPaymentConfig.ENVIRONMENTS.get(
            AMWALPaymentConfig.CURRENT_ENV,
            AMWALPaymentConfig.ENVIRONMENTS['UAT']
        )

        # Call AMWAL API to get session token
        api_url = f"{env_url}/Customer/GetSmartboxDirectCallSessionToken"

        # Verify TLS against the production gateway. The AMWAL test hosts (UAT/SIT,
        # non-standard ports) are reached without verification as before.
        verify_tls = AMWALPaymentConfig.CURRENT_ENV == 'PRODUCTION'
        async with httpx.AsyncClient(verify=verify_tls) as client:
            response = await client.post(
                api_url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=30.0
            )

            response.raise_for_status()
            result = response.json()

            # Check if request was successful
            if result.get('success') and result.get('data', {}).get('sessionToken'):
                return GetSessionTokenResponse(
                    sessionToken=result['data']['sessionToken'],
                    success=True,
                    message="Session token retrieved successfully"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=result.get('message', 'Failed to retrieve session token')
                )

    except httpx.HTTPStatusError as e:
        # Don't forward AMWAL's status code (a 401 from AMWAL would look like an
        # expired session to the frontend) or its error text.
        logger.error("AMWAL session token request failed with HTTP %s", e.response.status_code)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AMWAL API error"
        )
    except httpx.RequestError as e:
        raise server_error(e, "Failed to connect to AMWAL API", status_code=503)
    except Exception as e:
        raise server_error(e, "Failed to get session token")


@router.get(
    "/config",
    response_model=PaymentConfigResponse,
    summary="Get Payment Gateway Configuration",
    description="Returns the payment gateway configuration (without sensitive data)"
)
async def get_payment_config():
    """
    Get payment gateway configuration

    Returns public configuration data (without secret key)
    """
    return PaymentConfigResponse(
        success=True,
        data=PaymentConfigData(
            merchantId=AMWALPaymentConfig.MERCHANT_ID,
            terminalId=AMWALPaymentConfig.TERMINAL_ID,
            currencyId=AMWALPaymentConfig.CURRENCY_ID,
            environment=AMWALPaymentConfig.CURRENT_ENV
        )
    )


@router.post(
    "/log-callback",
    summary="Log Payment Callback Status",
    description="Logs payment callback events (success/failure/cancel) for monitoring"
)
async def log_payment_callback(request: Dict[str, Any]):
    """
    Log payment callback events for monitoring and debugging

    This endpoint is called by the frontend when payment callbacks fire
    to provide visibility into payment outcomes in server logs
    """
    try:
        callback_type = request.get("type", "unknown")
        merchant_reference = request.get("merchantReference", "N/A")
        response_code = request.get("responseCode", "N/A")
        transaction_id = request.get("transactionId", "N/A")
        error_message = request.get("errorMessage")

        if callback_type == "success":
            log_msg = get_log_message(str(response_code))
            print(f"[PAYMENT SUCCESS] Merchant Reference: {merchant_reference} | Transaction ID: {transaction_id} | Response Code: {response_code} | Message: {log_msg}")
        elif callback_type == "error":
            log_msg = get_log_message(str(response_code))
            print(f"[PAYMENT FAILED] Merchant Reference: {merchant_reference} | Response Code: {response_code} | Message: {log_msg} | Error: {error_message or 'N/A'}")
        elif callback_type == "cancel":
            print(f"[PAYMENT CANCELLED] Merchant Reference: {merchant_reference} | User cancelled payment")
        elif callback_type == "timeout":
            print(f"[PAYMENT TIMEOUT] Merchant Reference: {merchant_reference} | No response received from payment gateway")
        else:
            print(f"[PAYMENT UNKNOWN] Merchant Reference: {merchant_reference} | Unknown callback type: {callback_type}")

        return {"success": True, "message": "Callback logged successfully"}
    except Exception as e:
        logger.warning("Failed to log payment callback: %s", e)
        return {"success": False, "message": "Failed to log callback"}


@router.get(
    "/health",
    summary="Payment Service Health Check",
    description="Check if the payment service is operational"
)
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "AMWAL Payment Gateway",
        "timestamp": get_current_datetime_iso(),
        "environment": AMWALPaymentConfig.CURRENT_ENV
    }


@router.get(
    "/return",
    summary="AMWAL Return URL Handler",
    description="Handles AMWAL redirect and sends user back to booking with status."
)
def amwal_return(request: Request):
    """AMWAL redirect target.

    Success is only reported when AMWAL's response hash verifies against the
    payment intent that the frontend appended to the return URL (``intent``).
    The redirect then carries a signed ``paymentToken`` (usable for
    /bookings/create and /payment/status). A "00" response code without
    verifiable hash fields is reported as ``payment=pending`` instead of success.

    Assumption: AMWAL appends the same fields it passes to the SmartBox
    callback (``amount``, ``merchantReference``, ``transactionId``, ...,
    ``secureHashValue``) to the return URL; names are matched case-insensitively.
    """
    raw = dict(request.query_params)
    lowered = {k.lower(): v for k, v in raw.items()}
    params = {name: lowered.get(name.lower()) for name in AMWAL_RESPONSE_FIELDS}
    car_id = raw.get("carId", "")
    response_code = params.get("responseCode") or ""
    received_hash = lowered.get("securehashvalue") or lowered.get("securehash") or ""
    intent = raw.get("intent") or ""
    is_cancel = raw.get("cancel") == "1"

    payment_token = None
    if is_cancel or response_code != "00":
        status_flag = "failed"
    elif received_hash and intent:
        try:
            payment_token = issue_payment_token(verify_amwal_payment(params, received_hash, intent))
            status_flag = "success"
        except HTTPException as exc:
            logger.warning("AMWAL return could not be verified: %s", exc.detail)
            status_flag = "failed"
    else:
        status_flag = "pending"

    # Query values are attacker-controlled: encode them so they can't add extra
    # query parameters or path segments to the redirect. Encrypted IDs are
    # url-safe base64, so legitimate values are unchanged.
    safe_car_id = quote(car_id, safe="-_=")
    safe_code = quote(response_code, safe="")
    query = f"payment={status_flag}&code={safe_code}"
    if payment_token:
        query += f"&paymentToken={quote(payment_token, safe='')}"

    if not car_id:
        return RedirectResponse(f"{FRONTEND_BASE_URL}/book?{query}")
    return RedirectResponse(f"{FRONTEND_BASE_URL}/booking/{safe_car_id}?{query}")


@router.get(
    "/status",
    summary="Get a verified payment's status from its payment token"
)
def get_payment_status(token: Optional[str] = None, car_id: Optional[str] = None):
    """Status of a verified payment.

    Replaces the old per-process cache keyed by car ID (wrong with several
    workers, and readable by anyone who knew a car ID). ``car_id`` is still
    accepted for compatibility but no longer identifies a payment on its own.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment status not found"
        )
    try:
        payment = verify_token(token, "payment")
    except InvalidToken:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment status expired"
        )
    return {"status": "success", "code": "00", "transaction_id": payment["txn"]}

# Payments

Card payments go through the AMWAL SmartBox. The merchant hash key stays on
the backend, and a booking is written only after the backend has verified
AMWAL's signed response itself. The relevant code is in
`backend/routes/payment.py`, `backend/utils/payment_utils.py`,
`backend/utils/signed_tokens.py`, `frontend/src/utils/amwalPayment.js` and
`frontend/src/pages/BookingPage.jsx`.

## Flow

1. The booking page validates the documents (`POST /upload/validate-document`)
   and the booking (`POST /bookings/validate`), then uploads the documents
   (`POST /upload/document`).
2. `POST /payment/generate-hash` signs the request for AMWAL. For a booking it
   first recomputes the price and refuses an amount that differs from it. The
   response includes a payment intent, a signed token that ties the merchant
   reference to the car, the rental dates and the amount.
3. SmartBox opens. The intent is appended to the return URL.
4. When the payment succeeds, SmartBox calls `completeCallback` with AMWAL's
   response. The frontend posts it, together with the intent, to
   `POST /payment/confirm`. The backend checks the response hash, response
   code `00`, merchant and terminal IDs, merchant reference and amount, and
   returns a payment token.
5. `POST /bookings/create` takes the payment token. The backend checks its
   signature, expiry, car and dates, recomputes the price, compares it with
   the paid amount and refuses a transaction that already has a booking. Only
   then are the client, rental and booking rows written. Payment fields sent by
   the browser are ignored.

Intents are valid for one hour and payment tokens for 30 minutes. Both are
stateless HMAC tokens, so any worker can verify them.

If AMWAL redirects the browser to `GET /payment/return`, the response is
verified the same way using the `intent` query parameter:

| Result | Redirect |
| --- | --- |
| verified, code `00` | `/booking/:carId?payment=success&code=00&paymentToken=...` |
| code `00`, no hash fields | `/booking/:carId?payment=pending&code=00` |
| any other code, cancel or bad hash | `/booking/:carId?payment=failed&code=...` |

Without `carId` the redirect goes to `/book`. The code assumes AMWAL appends
the same fields to the redirect as it passes to the callback (matched without
regard to case). `GET /payment/status?token=...` returns the status for a
payment token.

## Hashes

Both hashes are HMAC-SHA256 with the hex-decoded `AMWAL_SECURE_HASH_KEY`,
written as uppercase hex.

The request hash covers
`Amount, CurrencyId, MerchantId, MerchantReference, RequestDateTime, SessionToken, TerminalId`
as `Key=value` pairs joined with `&`. Whole-number amounts are written without
decimals (`10.0` becomes `10`).

The response hash covers
`Amount, CurrencyId, CustomerId, CustomerTokenId, MerchantId, MerchantReference, ResponseCode, TerminalId, TransactionId, TransactionTime`.
The amount is used exactly as AMWAL sends it (for example `"5.000"`), and the
comparison is constant-time.

Tests are in `backend/utils/tests/payment_utils_test.py` and
`backend/routes/tests/payment_test.py`.

## Configuration

Backend (`.env`):

| Variable | Purpose |
| --- | --- |
| `AMWAL_MERCHANT_ID`, `AMWAL_TERMINAL_ID` | merchant account |
| `AMWAL_SECURE_HASH_KEY` | hash key, hex |
| `AMWAL_ENVIRONMENT` | `UAT` (default), `SIT` or `PRODUCTION` |
| `FRONTEND_BASE_URL` | target of the return redirect |
| `PAYMENT_TOKEN_SECRET` | signs intents and payment tokens; defaults to a key derived from `JWT_SECRET_KEY` and must be the same on every worker |

The frontend loads the SmartBox script from AMWAL for the environment reported
by `GET /payment/config`, falling back to `VITE_AMWAL_ENVIRONMENT`. The
currency is fixed to 512 (Omani rial) in `AMWALPaymentConfig.CURRENCY_ID`.
The backend's own calls to AMWAL (saved-card session tokens) verify TLS
certificates only against the production gateway.

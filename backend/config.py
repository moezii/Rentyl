# app/config.py

from dotenv import load_dotenv
import os

# Load .env from project root
load_dotenv()

# === Supabase Configuration ===
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
# Server-side key for all database/storage access (the anon key is only used for Auth)
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
BUCKET_NAME = os.getenv("BUCKET_NAME")
BOOKING_DOCS_BUCKET = os.getenv("BOOKING_DOCS_BUCKET") or "booking-documents"
SIGNED_URL_TTL_SECONDS = int(os.getenv("SIGNED_URL_TTL_SECONDS") or "3600")

if not all([SUPABASE_URL, SUPABASE_KEY]):
    raise ValueError("Missing Supabase configuration in .env file")
if not SUPABASE_SERVICE_ROLE_KEY:
    # Required: the backend reads and writes with the service role, and the
    # anon role has no table access (see migrations/revoke_anon_table_access.sql)
    raise ValueError("SUPABASE_SERVICE_ROLE_KEY is required (backend database access uses the service role)")

if SUPABASE_URL and not SUPABASE_URL.endswith("/"):
    SUPABASE_URL = f"{SUPABASE_URL}/"

# === Environment Detection ===
ENVIRONMENT = os.getenv("ENVIRONMENT") or "development"
# Render sets RENDER on its hosts; an empty value (e.g. `RENDER=` copied from
# .env.example or passed through by docker-compose) does not count.
IS_PRODUCTION = ENVIRONMENT == "production" or bool(os.getenv("RENDER"))

# Public URL of the frontend (payment return redirect, password-reset link)
FRONTEND_BASE_URL = (os.getenv("FRONTEND_BASE_URL") or "https://www.rentyl.app").rstrip("/")

# === CORS Origins Configuration ===
def get_cors_origins():
    """Get CORS origins based on environment"""
    # Development origins
    development_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost",
        "http://localhost:80",
        "http://localhost:8080",
        "http://localhost:10000",  # Unified Docker container
        "http://127.0.0.1:10000",  # Unified Docker container
    ]
    
    # Production origins
    production_origins = [
        "https://rentyl.app",
        "https://www.rentyl.app",
        "https://rentyl-app.onrender.com",
    ]
    
    # Custom origins from environment
    custom_origins = []
    if os.getenv("CORS_ORIGINS"):
        custom_origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS").split(",") if origin.strip()]
    
    if IS_PRODUCTION:
        # In production, allow only production origins and custom origins (no localhost)
        return production_origins + custom_origins
    else:
        # In development, allow all origins for testing
        return development_origins + production_origins + custom_origins

CORS_ORIGINS = get_cors_origins()

# === JWT Configuration ===
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not JWT_SECRET_KEY:
    raise ValueError("JWT_SECRET_KEY environment variable is required for production")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # Changed from 15 to 60 minutes (1 hour)
REFRESH_TOKEN_EXPIRE_DAYS = 7     # Changed from 3 to 7 days (1 week)

# === Payment tokens ===
# Secret for the server-signed payment intent / payment confirmation tokens.
# Defaults to a key derived from JWT_SECRET_KEY, so every worker shares it.
PAYMENT_TOKEN_SECRET = os.getenv("PAYMENT_TOKEN_SECRET") or None

# === Reverse proxies ===
# Peers whose X-Forwarded-For / X-Real-IP headers are trusted (comma-separated
# IPs or CIDRs). Default: the nginx running in the same container. Add your
# platform's load-balancer range (e.g. 10.0.0.0/8 on Render) if it sits in front.
TRUSTED_PROXIES = [p.strip() for p in (os.getenv("TRUSTED_PROXIES") or "127.0.0.1,::1").split(",") if p.strip()]

# === Resend Email Configuration ===
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
if not RESEND_API_KEY:
    print("[WARNING] RESEND_API_KEY not set - email notifications will be disabled")
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL") or "no-reply@notify.rentyl.app"

print(f"[CONFIG] Environment: {ENVIRONMENT}")
print(f"[CONFIG] Production Mode: {IS_PRODUCTION}")
print(f"[CONFIG] CORS Origins: {len(CORS_ORIGINS)} configured")
for i, origin in enumerate(CORS_ORIGINS):
    print(f"[CONFIG] CORS Origin [{i}]: {origin}")



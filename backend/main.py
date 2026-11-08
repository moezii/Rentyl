# backend/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from backend.supabase.client import supabase
from backend.config import CORS_ORIGINS, IS_PRODUCTION
from backend.middleware.security_logger import SecurityLoggerMiddleware
import traceback
from datetime import datetime, date, timezone

# Import routers individually
from backend.routes.cars import router as cars_router
from backend.routes.clients import router as clients_router
from backend.routes.maintenance import router as maintenance_router
from backend.routes.rentals import router as rentals_router
from backend.routes.users import router as users_router
from backend.routes.auth import router as auth_router
from backend.routes.companies import router as companies_router
from backend.routes.analytics import router as analytics_router
from backend.routes.client_documents import router as client_documents_router
from backend.routes.currency import router as currency_router
from backend.routes.calendar import router as calendar_router
from backend.routes.payment import router as payment_router
from backend.routes.bookings import router as bookings_router
from backend.routes.upload import router as upload_router
from backend.routes.contact import router as contact_router
from backend.services.jwt_service import jwt_service
import asyncio
from contextlib import asynccontextmanager

# Background task for cleaning up expired sessions
async def cleanup_sessions_task():
    """Background task to clean up expired sessions and tokens"""
    while True:
        try:
            # Supabase client calls are synchronous: run them off the event loop
            await asyncio.to_thread(jwt_service.cleanup_expired_tokens)
        except Exception:
            # Silently ignore cleanup errors
            pass

        # Wait 1 hour before next cleanup
        await asyncio.sleep(3600)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start background cleanup task
    cleanup_task = asyncio.create_task(cleanup_sessions_task())
    try:
        yield
    finally:
        cleanup_task.cancel()


# Create FastAPI app
app = FastAPI(
    lifespan=lifespan,
    title="Rentyl",
    description="FastAPI backend using Supabase",
    version="1.0.0"
)

# Security Logger Middleware - MUST be first to catch all requests
app.add_middleware(SecurityLoggerMiddleware)

# CORS middleware - MUST be after security logger
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"] if IS_PRODUCTION else ["*"],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Accept",
        "Origin",
        "Referrer-Policy",
        "X-Content-Type-Options",
        "X-Device-Fingerprint",
        "X-Frame-Options",
        "X-Request-ID",
        "X-Request-Time",
        "X-XSS-Protection"
    ] if IS_PRODUCTION else ["*"],
    expose_headers=["Content-Type"] if IS_PRODUCTION else ["*"]
)

# Health check endpoint - MUST be before router includes
@app.get("/")
def root():
    return {
        "message": "Rentyl backend is running", 
        "status": "OK",
        "environment": "production" if IS_PRODUCTION else "development",
        "cors_origins_count": len(CORS_ORIGINS)
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "rentyl-backend",
        "environment": "production" if IS_PRODUCTION else "development"
    }

# Debug endpoint exposing CORS configuration: only available outside production
if not IS_PRODUCTION:
    @app.get("/debug/cors")
    def debug_cors():
        """Debug endpoint to check CORS configuration"""
        import os
        return {
            "is_production": IS_PRODUCTION,
            "environment": os.getenv("ENVIRONMENT", "not_set"),
            "render_env": os.getenv("RENDER", "not_set"),
            "cors_origins": CORS_ORIGINS,
            "cors_origins_count": len(CORS_ORIGINS),
            "allowed_headers": [
                "Content-Type", 
                "Authorization", 
                "X-Requested-With", 
                "Accept", 
                "Origin",
                "Referrer-Policy",
                "X-Content-Type-Options",
                "X-Device-Fingerprint",
                "X-Frame-Options",
                "X-Request-ID",
                "X-Request-Time",
                "X-XSS-Protection"
            ] if IS_PRODUCTION else ["*"],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }


@app.options("/test-cors")
def test_cors_preflight():
    """Test endpoint specifically for CORS preflight"""
    return {"message": "CORS preflight successful"}

@app.get("/test-cors")  
def test_cors_get():
    """Test endpoint for CORS GET requests"""
    return {"message": "CORS GET request successful", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include routers with proper prefixes
try:
    app.include_router(auth_router, prefix="/auth", tags=["Auth"])
    app.include_router(users_router, prefix="/users", tags=["Users"])
    app.include_router(cars_router, prefix="/cars", tags=["Cars"])
    app.include_router(clients_router, prefix="/clients", tags=["Clients"])
    app.include_router(rentals_router, prefix="/rentals", tags=["Rentals"])
    app.include_router(maintenance_router, prefix="/maintenance", tags=["Maintenance"])
    app.include_router(analytics_router, prefix="/analytics", tags=["Analytics"])
    app.include_router(client_documents_router, prefix="/documents", tags=["Documents"])
    app.include_router(companies_router, prefix="/companies", tags=["Companies"])
    app.include_router(currency_router, prefix="/currency", tags=["Currency"])
    app.include_router(calendar_router, prefix="/calendar", tags=["Calendar"])
    app.include_router(payment_router)  # Payment router already has /api/payment prefix
    app.include_router(bookings_router)  # Bookings router already has /api/bookings prefix
    app.include_router(upload_router, prefix="/upload", tags=["Upload"])
    app.include_router(contact_router, prefix="/contact", tags=["Contact"])
    print(" All routers registered successfully")
except Exception as e:
    print(f" Error registering routers: {str(e)}")
    print(traceback.format_exc())



# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "error": "Not Found",
            "message": f"The requested path {request.url.path} was not found",
            "status_code": 404
        }
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": "An internal server error occurred",
            "status_code": 500
        }
    )

if __name__ == "__main__":
    import uvicorn
    print(" Starting development server...")
    uvicorn.run(
        "backend.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info"
    )
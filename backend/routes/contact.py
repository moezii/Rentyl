"""
Contact Form API Route

Handles contact form submissions with:
- Rate limiting (per IP)
- Bot prevention (basic honeypot + timing checks)
- Email validation
- Resend email service integration
"""

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, Dict
from datetime import datetime, timedelta
import re
import html
import asyncio
import resend
from backend.config import RESEND_API_KEY, RESEND_FROM_EMAIL
from backend.middleware.security_logger import get_real_ip
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# CORS preflight handler
@router.options("/submit")
async def contact_options():
    """Handle CORS preflight for contact form submission"""
    return {"status": "ok"}

# In-memory rate limiting storage (per IP address)
# Format: {ip_address: [(timestamp1, timestamp2, ...)]}
rate_limit_storage: Dict[str, list] = {}

# Rate limiting configuration
RATE_LIMIT_WINDOW_SECONDS = 3600  # 1 hour window
MAX_REQUESTS_PER_WINDOW = 5  # Max 5 contact form submissions per hour per IP
MIN_REQUEST_INTERVAL_SECONDS = 10  # Min 10 seconds between requests


class ContactFormData(BaseModel):
    """Contact form submission data"""
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    company: str = Field(..., min_length=1, max_length=200)
    phone: Optional[str] = Field(None, max_length=20)
    fleetSize: Optional[str] = Field(None, max_length=20)
    message: str = Field(..., min_length=1, max_length=2000)

    # Honeypot field - should be empty (bots often fill all fields)
    website: Optional[str] = Field(None, max_length=0)

    # Timestamp when form was rendered (for timing check)
    formTimestamp: Optional[int] = None

    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        """Validate name doesn't contain suspicious patterns"""
        if re.search(r'https?://', v, re.IGNORECASE):
            raise ValueError('Name contains invalid characters')
        return v.strip()

    @field_validator('message')
    @classmethod
    def validate_message(cls, v):
        """Validate message content"""
        # Check for excessive links (spam indicator)
        link_count = len(re.findall(r'https?://', v, re.IGNORECASE))
        if link_count > 2:
            raise ValueError('Message contains too many links')
        return v.strip()

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        """Validate phone number format if provided"""
        if v is None or v.strip() == '':
            return None

        # Remove spaces, dashes, parentheses for validation
        cleaned = re.sub(r'[\s\-\(\)\+]', '', v)

        # Check if it's a valid phone number (7-15 digits)
        if not re.match(r'^\d{7,15}$', cleaned):
            raise ValueError('Invalid phone number format')

        return v.strip()


def check_rate_limit(ip_address: str) -> bool:
    """
    Check if IP address has exceeded rate limit

    Args:
        ip_address: Client IP address

    Returns:
        True if request is allowed, False if rate limit exceeded
    """
    now = datetime.now()

    # Clean up old entries first
    if ip_address in rate_limit_storage:
        # Remove timestamps outside the time window
        cutoff_time = now - timedelta(seconds=RATE_LIMIT_WINDOW_SECONDS)
        rate_limit_storage[ip_address] = [
            ts for ts in rate_limit_storage[ip_address]
            if ts > cutoff_time
        ]
    else:
        rate_limit_storage[ip_address] = []

    # Check if IP has exceeded max requests in window
    if len(rate_limit_storage[ip_address]) >= MAX_REQUESTS_PER_WINDOW:
        return False

    # Check minimum interval between requests
    if rate_limit_storage[ip_address]:
        last_request = rate_limit_storage[ip_address][-1]
        if (now - last_request).total_seconds() < MIN_REQUEST_INTERVAL_SECONDS:
            return False

    # Add current timestamp
    rate_limit_storage[ip_address].append(now)
    return True


def check_bot_indicators(form_data: ContactFormData, request_time: datetime) -> tuple[bool, str]:
    """
    Check for bot indicators

    Args:
        form_data: Contact form data
        request_time: Time when request was received

    Returns:
        Tuple of (is_valid, error_message)
    """
    # Check honeypot field (should be empty)
    if form_data.website:
        return False, "Invalid form submission"

    # Check form submission timing (bots submit too fast)
    if form_data.formTimestamp:
        form_age_seconds = (request_time.timestamp() * 1000) - form_data.formTimestamp

        # Form submitted too fast (< 3 seconds is suspicious)
        if form_age_seconds < 3000:
            return False, "Form submitted too quickly"

        # Form age unreasonably old (> 1 hour)
        if form_age_seconds > 3600000:
            return False, "Form session expired"

    return True, ""


def _h(value) -> str:
    """HTML-escape a form value for the notification email."""
    return html.escape(str(value)) if value is not None else ""


def generate_contact_email_html(form_data: ContactFormData) -> str:
    """Generate HTML email template for contact form submission"""
    phone_section = f"""
                    <tr>
                        <td style="padding: 8px 0; font-weight: 500; color: #6b7280; font-size: 14px;">Phone:</td>
                        <td style="padding: 8px 0;"><a href="tel:{_h(form_data.phone)}" style="color: #2563eb; text-decoration: none; font-size: 14px;">{_h(form_data.phone)}</a></td>
                    </tr>
    """ if form_data.phone else ""

    fleet_section = f"""
                    <tr>
                        <td style="padding: 8px 0; font-weight: 500; color: #6b7280; font-size: 14px;">Fleet Size:</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px;">{_h(form_data.fleetSize)}</td>
                    </tr>
    """ if form_data.fleetSize else ""

    return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Contact Form Submission</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

        <!-- Header -->
        <div style="background-color: #2563eb; padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">New Contact Form Submission</h1>
            <p style="color: #dbeafe; margin: 8px 0 0 0; font-size: 14px;">From Rentyl Website</p>
        </div>

        <!-- Main Content -->
        <div style="padding: 32px 24px;">
            <p style="font-size: 16px; color: #111827; margin: 0 0 24px 0;">You have received a new contact form submission from your website.</p>

            <!-- Contact Information -->
            <div style="margin-bottom: 24px;">
                <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 16px; font-weight: 600; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Contact Information</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; font-weight: 500; width: 140px; color: #6b7280; font-size: 14px;">Name:</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">{_h(form_data.name)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: 500; color: #6b7280; font-size: 14px;">Email:</td>
                        <td style="padding: 8px 0;"><a href="mailto:{_h(form_data.email)}" style="color: #2563eb; text-decoration: none; font-size: 14px;">{_h(form_data.email)}</a></td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: 500; color: #6b7280; font-size: 14px;">Company:</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px;">{_h(form_data.company)}</td>
                    </tr>
                    {phone_section}
                    {fleet_section}
                </table>
            </div>

            <!-- Message -->
            <div style="margin-bottom: 24px;">
                <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 16px; font-weight: 600; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Message</h2>
                <div style="background-color: #f9fafb; border-left: 3px solid #2563eb; padding: 16px; border-radius: 4px;">
                    <p style="color: #111827; font-size: 14px; margin: 0; white-space: pre-wrap;">{_h(form_data.message)}</p>
                </div>
            </div>

            <!-- Action Button -->
            <div style="text-align: center; margin: 32px 0;">
                <a href="mailto:{_h(form_data.email)}?subject=Re: Contact Form Inquiry" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 500; font-size: 14px;">Reply to {_h(form_data.name)}</a>
            </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
                Submitted on {datetime.now().strftime("%B %d, %Y at %I:%M %p")}<br>
                This is an automated notification from Rentyl Contact Form<br>
                © {datetime.now().year} Rentyl. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
"""


@router.post("/submit")
async def submit_contact_form(form_data: ContactFormData, request: Request):
    """
    Handle contact form submission

    Security features:
    - Rate limiting per IP address
    - Bot detection (honeypot, timing checks)
    - Input validation and sanitization
    - Temporary email domain blocking
    """
    request_time = datetime.now()

    # Get client IP address
    # Behind nginx request.client.host is always 127.0.0.1, which made the
    # per-IP limit a single site-wide limit; use the proxy-supplied client IP.
    client_ip = get_real_ip(request) or "unknown"

    # Check rate limit
    if not check_rate_limit(client_ip):
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please try again later."
        )

    # Check for bot indicators
    is_valid, error_msg = check_bot_indicators(form_data, request_time)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    # Check for temporary/disposable email domains
    disposable_domains = [
        'tempmail.com', 'throwaway.email', 'guerrillamail.com',
        'mailinator.com', '10minutemail.com', 'temp-mail.org',
        'fakeinbox.com', 'trashmail.com'
    ]
    email_domain = form_data.email.split('@')[1].lower()
    if email_domain in disposable_domains:
        raise HTTPException(
            status_code=400,
            detail="Temporary email addresses are not allowed"
        )

    # Check if Resend is configured
    if not RESEND_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Email service is not configured. Please contact support directly."
        )

    # Send email via Resend
    try:
        resend.api_key = RESEND_API_KEY

        html_content = generate_contact_email_html(form_data)

        params = {
            "from": RESEND_FROM_EMAIL,
            "to": ["support@rentyl.app"],  # Send to support email
            "reply_to": form_data.email,  # Allow direct reply to customer
            "subject": f"Contact Form: {form_data.name} - {form_data.company}",
            "html": html_content,
        }

        email = await asyncio.to_thread(resend.Emails.send, params)

        logger.info("[CONTACT] Form submitted")

        return JSONResponse(
            content={
                "success": True,
                "message": "Thank you for contacting us. We'll get back to you soon!",
                "email_id": email.get("id")
            },
            status_code=200
        )

    except Exception as e:
        print(f"[CONTACT ERROR] Failed to send email: {str(e)}")

        # Don't expose internal error details to client
        raise HTTPException(
            status_code=500,
            detail="Failed to send message. Please try again or contact us directly at support@rentyl.app"
        )

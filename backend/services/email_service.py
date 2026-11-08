"""
Email Service using Resend

Handles sending email notifications for bookings:
- Company notifications when new clients book
- Customer confirmation emails after successful payment
"""

import asyncio
import functools
import html
import resend
from typing import Optional, Dict
from datetime import datetime
from backend.config import RESEND_API_KEY, RESEND_FROM_EMAIL
import logging

logger = logging.getLogger(__name__)


def _escape_html_args(func):
    """HTML-escape every string argument of an email template builder.

    Customer names, phones, addresses etc. come from the public booking form;
    without escaping they could inject markup/links into emails we send.
    """
    @functools.wraps(func)
    def wrapper(self, *args, **kwargs):
        args = tuple(html.escape(a) if isinstance(a, str) else a for a in args)
        kwargs = {k: html.escape(v) if isinstance(v, str) else v for k, v in kwargs.items()}
        return func(self, *args, **kwargs)
    return wrapper


class EmailService:
    """Service for sending emails via Resend"""

    def __init__(self):
        """Initialize Resend with API key"""
        if RESEND_API_KEY:
            resend.api_key = RESEND_API_KEY
            self.enabled = True
        else:
            self.enabled = False
            print("[EMAIL SERVICE] Resend API key not configured - emails disabled")

    def _format_currency(self, amount: float) -> str:
        """Format amount as OMR currency"""
        return f"{amount:.2f} OMR"

    def _format_date(self, date_str: str, lang: str = 'en') -> str:
        """Format date string to readable format

        Args:
            date_str: ISO format date string
            lang: Language code ('en' or 'ar')
        """
        try:
            date_obj = datetime.fromisoformat(date_str.replace('Z', '+00:00'))

            if lang == 'ar':
                # For Arabic: Use day-month-year format with Arabic month names
                months_ar = {
                    1: 'يناير', 2: 'فبراير', 3: 'مارس', 4: 'أبريل',
                    5: 'مايو', 6: 'يونيو', 7: 'يوليو', 8: 'أغسطس',
                    9: 'سبتمبر', 10: 'أكتوبر', 11: 'نوفمبر', 12: 'ديسمبر'
                }
                day = date_obj.day
                month = months_ar[date_obj.month]
                year = date_obj.year
                return f"{day} {month} {year}"
            else:
                # English format: Month Day, Year
                return date_obj.strftime("%B %d, %Y")
        except:
            return date_str

    @_escape_html_args
    def _generate_company_notification_html(
        self,
        company_name: str,
        customer_name: str,
        customer_email: str,
        customer_phone: str,
        car_info: str,
        rental_start: str,
        rental_end: str,
        amount_paid: float,
        booking_id: str,
        collection_address: Optional[str] = None,
        pickup_time: Optional[str] = None
    ) -> str:
        """Generate HTML template for company notification email"""
        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Booking Notification</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

        <!-- Header -->
        <div style="background-color: #2563eb; padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">New Booking Notification</h1>
            <p style="color: #dbeafe; margin: 8px 0 0 0; font-size: 14px; word-break: break-all; overflow-wrap: break-word;">Booking ID: {booking_id}</p>
        </div>

        <!-- Main Content -->
        <div style="padding: 32px 24px;">
            <p style="font-size: 16px; color: #111827; margin: 0 0 24px 0;">Dear {company_name},</p>
            <p style="font-size: 14px; color: #6b7280; margin: 0 0 32px 0;">You have received a new booking. Please review the details below and contact the customer to arrange vehicle pickup.</p>

            <!-- Customer Information -->
            <div style="margin-bottom: 24px;">
                <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 16px; font-weight: 600; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Customer Information</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; font-weight: 500; width: 140px; color: #6b7280; font-size: 14px;">Name:</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px;">{customer_name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: 500; color: #6b7280; font-size: 14px;">Email:</td>
                        <td style="padding: 8px 0;"><a href="mailto:{customer_email}" style="color: #2563eb; text-decoration: none; font-size: 14px;">{customer_email}</a></td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: 500; color: #6b7280; font-size: 14px;">Phone:</td>
                        <td style="padding: 8px 0;"><a href="tel:{customer_phone}" style="color: #2563eb; text-decoration: none; font-size: 14px;">{customer_phone}</a></td>
                    </tr>
                </table>
            </div>

            <!-- Rental Details -->
            <div style="margin-bottom: 24px;">
                <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 16px; font-weight: 600; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Rental Details</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; font-weight: 500; width: 140px; color: #6b7280; font-size: 14px;">Vehicle:</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">{car_info}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: 500; color: #6b7280; font-size: 14px;">Start Date:</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px;">{self._format_date(rental_start)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: 500; color: #6b7280; font-size: 14px;">End Date:</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px;">{self._format_date(rental_end)}</td>
                    </tr>
                    {f'''<tr>
                        <td style="padding: 8px 0; font-weight: 500; color: #6b7280; font-size: 14px;">Collection Address:</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px;">{collection_address}</td>
                    </tr>''' if collection_address else ''}
                    {f'''<tr>
                        <td style="padding: 8px 0; font-weight: 500; color: #6b7280; font-size: 14px;">Pick-up Time:</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px;">{pickup_time}</td>
                    </tr>''' if pickup_time else ''}
                    <tr>
                        <td style="padding: 8px 0; font-weight: 500; color: #6b7280; font-size: 14px;">Amount Paid:</td>
                        <td style="padding: 8px 0; color: #059669; font-size: 18px; font-weight: 700;">{self._format_currency(amount_paid)}</td>
                    </tr>
                </table>
            </div>

            <!-- Action Button -->
            <div style="text-align: center; margin: 32px 0;">
                <a href="mailto:{customer_email}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 500; font-size: 14px;">Contact Customer</a>
            </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
                This is an automated notification from Rentyl<br>
                © {datetime.now().year} Rentyl. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
"""

    @_escape_html_args
    def _generate_customer_confirmation_html(
        self,
        customer_name: str,
        car_info: str,
        rental_start: str,
        rental_end: str,
        amount_paid: float,
        booking_id: str,
        payment_reference: str,
        company_phone: Optional[str] = None,
        company_location_link: Optional[str] = None,
        pickup_time: Optional[str] = None,
        collection_address: Optional[str] = None
    ) -> str:
        """Generate HTML template for customer confirmation email"""
        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Confirmation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); overflow: hidden;">

        <!-- Header -->
        <div style="background-color: #2563eb; padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 28px; font-weight: 600;">Booking Confirmed</h1>
            <p style="color: #dbeafe; margin: 0; font-size: 14px;">Your payment has been successfully processed</p>
        </div>

        <!-- Main Content -->
        <div style="padding: 32px 24px;">
            <p style="font-size: 16px; color: #111827; font-weight: 500; margin: 0 0 8px 0;">Hello {customer_name},</p>

            <p style="font-size: 14px; color: #4b5563; margin: 0 0 24px 0;">Thank you for choosing Rentyl! Your booking has been successfully confirmed and payment has been processed.</p>

            <!-- Rental Details -->
            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-left: 3px solid #2563eb; border-radius: 6px; padding: 20px; margin-bottom: 20px;">
                <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">Your Rental Details</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; font-weight: 500; color: #6b7280; font-size: 14px;">Vehicle:</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">{car_info}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: 500; color: #6b7280; font-size: 14px;">Pick-up Date:</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px;">{self._format_date(rental_start)}</td>
                    </tr>
                    {f'''<tr>
                        <td style="padding: 8px 0; font-weight: 500; color: #6b7280; font-size: 14px;">Delivery Address:</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px;">{collection_address}</td>
                    </tr>''' if collection_address else ''}
                    {f'''<tr>
                        <td style="padding: 8px 0; font-weight: 500; color: #6b7280; font-size: 14px;">Delivery Time:</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px;">{pickup_time}</td>
                    </tr>''' if pickup_time and collection_address else ''}
                    {f'''<tr>
                        <td style="padding: 8px 0; font-weight: 500; color: #6b7280; font-size: 14px;">Pick-up Time:</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px;">{pickup_time}</td>
                    </tr>''' if pickup_time and not collection_address else ''}
                    <tr>
                        <td style="padding: 8px 0; font-weight: 500; color: #6b7280; font-size: 14px;">Return Date:</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px;">{self._format_date(rental_end)}</td>
                    </tr>
                </table>
            </div>

            <!-- Payment Information -->
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 3px solid #059669; border-radius: 6px; padding: 20px; margin-bottom: 20px;">
                <h2 style="color: #065f46; margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">Payment Information</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; font-weight: 500; color: #6b7280; font-size: 14px;">Amount Paid:</td>
                        <td style="padding: 8px 0; color: #059669; font-weight: 700; font-size: 18px;">{self._format_currency(amount_paid)}</td>
                    </tr>
                    <tr>
                        <td colspan="2" style="padding: 8px 0;">
                            <div style="font-weight: 500; color: #6b7280; font-size: 14px; margin-bottom: 4px;">Payment Reference:</div>
                            <div style="color: #111827; font-family: monospace; font-size: 12px; word-break: break-all; overflow-wrap: break-word;">{payment_reference}</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: 500; color: #6b7280; font-size: 14px;">Payment Status:</td>
                        <td style="padding: 8px 0;"><span style="background-color: #059669; color: #ffffff; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600;">PAID</span></td>
                    </tr>
                </table>
            </div>

            <!-- Booking Reference -->
            <div style="background-color: #eff6ff; border: 1px solid #dbeafe; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
                <p style="margin: 0 0 4px 0; font-size: 14px; color: #1e40af; font-weight: 600;">Booking Reference:</p>
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #111827; font-family: monospace; word-break: break-all; overflow-wrap: break-word;">{booking_id}</p>
                <p style="margin: 0; font-size: 12px; color: #6b7280;">Please keep this reference for your records</p>
            </div>

            <!-- Company Contact Information -->
            {"" if not (company_phone or company_location_link) else f'''<div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-left: 3px solid #f59e0b; border-radius: 6px; padding: 20px; margin-bottom: 20px;">
                <h3 style="color: #92400e; margin: 0 0 12px 0; font-size: 15px; font-weight: 600;">📍 Company Contact Information</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    ''' + (f'<tr><td style="padding: 8px 0; font-weight: 500; color: #78350f; font-size: 14px;">Phone:</td><td style="padding: 8px 0;"><a href="tel:{company_phone}" style="color: #2563eb; text-decoration: none; font-size: 14px; font-weight: 600;">{company_phone}</a></td></tr>' if company_phone else '') + (f'<tr><td style="padding: 8px 0; font-weight: 500; color: #78350f; font-size: 14px;">Location:</td><td style="padding: 8px 0;"><a href="{company_location_link}" target="_blank" style="color: #2563eb; text-decoration: none; font-size: 14px; font-weight: 600;">View on Google Maps</a></td></tr>' if company_location_link else '') + '''
                </table>
                <p style="margin: 12px 0 0 0; font-size: 12px; color: #78350f;">The rental company will contact you to arrange pickup details</p>
            </div>'''}

            <!-- Next Steps -->
            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
                <h3 style="color: #111827; margin: 0 0 12px 0; font-size: 15px; font-weight: 600;">Next Steps</h3>
                <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px;">
                    <li style="margin-bottom: 8px;">You will be contacted by the rental company shortly to arrange pickup details</li>
                    <li style="margin-bottom: 8px;">Please have your driver's license and ID ready</li>
                    <li style="margin-bottom: 0;">Make sure to arrive on time for your scheduled pickup</li>
                </ul>
            </div>

            <!-- Call to Action -->
            <div style="text-align: center; margin-top: 24px;">
                <a href="https://rentyl.app" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 500; font-size: 14px;">
                    Visit Rentyl
                </a>
            </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
                Need help? Contact us at <a href="mailto:support@rentyl.app" style="color: #2563eb; text-decoration: none;">support@rentyl.app</a><br>
                © {datetime.now().year} Rentyl. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
"""

    async def send_company_notification(
        self,
        company_email: str,
        company_name: str,
        customer_name: str,
        customer_email: str,
        customer_phone: str,
        car_info: str,
        rental_start: str,
        rental_end: str,
        amount_paid: float,
        booking_id: str,
        collection_address: Optional[str] = None,
        pickup_time: Optional[str] = None
    ) -> Dict:
        """
        Send notification email to company about new booking

        Args:
            company_email: Company's email address
            company_name: Company name
            customer_name: Customer's full name
            customer_email: Customer's email
            customer_phone: Customer's phone
            car_info: Car make/model info
            rental_start: Rental start date
            rental_end: Rental end date
            amount_paid: Amount paid for booking
            booking_id: Booking reference ID
            collection_address: Vehicle pickup/collection location

        Returns:
            Dict with success status and message
        """
        if not self.enabled:
            return {"success": False, "message": "Email service not configured"}

        try:
            html_content = self._generate_company_notification_html(
                company_name=company_name,
                customer_name=customer_name,
                customer_email=customer_email,
                customer_phone=customer_phone,
                car_info=car_info,
                rental_start=rental_start,
                rental_end=rental_end,
                amount_paid=amount_paid,
                booking_id=booking_id,
                collection_address=collection_address,
                pickup_time=pickup_time
            )

            params = {
                "from": RESEND_FROM_EMAIL,
                "to": [company_email],
                "subject": f"New Booking: {customer_name} - {car_info}",
                "html": html_content,
            }

            email = await asyncio.to_thread(resend.Emails.send, params)

            logger.info("[EMAIL] Company notification sent")
            return {"success": True, "message": "Company notification sent", "email_id": email.get("id")}

        except Exception as e:
            logger.warning("[EMAIL] Failed to send company notification (%s)", type(e).__name__)
            return {"success": False, "message": f"Failed to send email: {str(e)}"}

    async def send_customer_confirmation(
        self,
        customer_email: str,
        customer_name: str,
        car_info: str,
        rental_start: str,
        rental_end: str,
        amount_paid: float,
        booking_id: str,
        payment_reference: str,
        company_phone: Optional[str] = None,
        company_location_link: Optional[str] = None,
        pickup_time: Optional[str] = None,
        collection_address: Optional[str] = None
    ) -> Dict:
        """
        Send booking confirmation email to customer

        Args:
            customer_email: Customer's email address
            customer_name: Customer's full name
            car_info: Car make/model info
            rental_start: Rental start date
            rental_end: Rental end date
            amount_paid: Amount paid for booking
            booking_id: Booking reference ID
            payment_reference: Payment transaction reference
            company_phone: Company contact phone number
            company_location_link: Google Maps link to company location

        Returns:
            Dict with success status and message
        """
        if not self.enabled:
            return {"success": False, "message": "Email service not configured"}

        try:
            html_content = self._generate_customer_confirmation_html(
                customer_name=customer_name,
                car_info=car_info,
                rental_start=rental_start,
                rental_end=rental_end,
                amount_paid=amount_paid,
                booking_id=booking_id,
                payment_reference=payment_reference,
                company_phone=company_phone,
                company_location_link=company_location_link,
                pickup_time=pickup_time,
                collection_address=collection_address
            )

            params = {
                "from": RESEND_FROM_EMAIL,
                "to": [customer_email],
                "subject": f"Booking Confirmed - {car_info} | Rentyl",
                "html": html_content,
            }

            email = await asyncio.to_thread(resend.Emails.send, params)

            logger.info("[EMAIL] Customer confirmation sent")
            return {"success": True, "message": "Customer confirmation sent", "email_id": email.get("id")}

        except Exception as e:
            logger.warning("[EMAIL] Failed to send customer confirmation (%s)", type(e).__name__)
            return {"success": False, "message": f"Failed to send email: {str(e)}"}

    @_escape_html_args
    def _generate_agent_notification_html(
        self,
        amount_paid: float,
        platform_fee: float,
        company_id: int,
        company_name: str,
        customer_name: str,
        customer_email: str,
        customer_phone: str,
        booking_timestamp: str
    ) -> str:
        """Generate HTML template for agent notification email"""
        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Booking - Agent Notification</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

        <!-- Header -->
        <div style="background-color: #059669; padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">New Booking Notification</h1>
            <p style="color: #d1fae5; margin: 8px 0 0 0; font-size: 14px;">Agent Dashboard</p>
        </div>

        <!-- Main Content -->
        <div style="padding: 32px 24px;">
            <p style="font-size: 16px; color: #111827; margin: 0 0 24px 0;">A new booking has been created in the system.</p>

            <!-- Booking Details Table -->
            <div style="background-color: #f9fafb; border: 2px solid #059669; border-radius: 8px; padding: 20px; margin-bottom: 24px; overflow-x: auto;">
                <h2 style="color: #059669; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">Booking Summary</h2>
                <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 12px 8px; font-weight: 600; color: #374151; font-size: 14px; width: 40%;">Amount Paid</td>
                        <td style="padding: 12px 8px; color: #111827; font-size: 16px; font-weight: 700; word-wrap: break-word;">{self._format_currency(amount_paid)}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 12px 8px; font-weight: 600; color: #374151; font-size: 14px;">Platform Fee (5%)</td>
                        <td style="padding: 12px 8px; color: #059669; font-size: 16px; font-weight: 700; word-wrap: break-word;">{self._format_currency(platform_fee)}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 12px 8px; font-weight: 600; color: #374151; font-size: 14px;">Amount to Send</td>
                        <td style="padding: 12px 8px; color: #2563eb; font-size: 16px; font-weight: 700; word-wrap: break-word;">{self._format_currency(amount_paid - platform_fee)}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 12px 8px; font-weight: 600; color: #374151; font-size: 14px;">Company Name</td>
                        <td style="padding: 12px 8px; color: #111827; font-size: 14px; font-weight: 600; word-wrap: break-word;">{company_name}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 12px 8px; font-weight: 600; color: #374151; font-size: 14px;">Customer Name</td>
                        <td style="padding: 12px 8px; color: #111827; font-size: 14px; word-wrap: break-word;">{customer_name}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 12px 8px; font-weight: 600; color: #374151; font-size: 14px;">Customer Email</td>
                        <td style="padding: 12px 8px; word-wrap: break-word; word-break: break-all;"><a href="mailto:{customer_email}" style="color: #2563eb; text-decoration: none; font-size: 13px;">{customer_email}</a></td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 12px 8px; font-weight: 600; color: #374151; font-size: 14px;">Customer Phone</td>
                        <td style="padding: 12px 8px; word-wrap: break-word;"><a href="tel:{customer_phone}" style="color: #2563eb; text-decoration: none; font-size: 14px;">{customer_phone}</a></td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 8px; font-weight: 600; color: #374151; font-size: 14px;">Booking Date & Time</td>
                        <td style="padding: 12px 8px; color: #111827; font-size: 13px; word-wrap: break-word;">{booking_timestamp}</td>
                    </tr>
                </table>
            </div>

            <!-- Revenue Summary -->
            <div style="background-color: #ecfdf5; border-left: 4px solid #059669; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
                <p style="margin: 0; color: #065f46; font-size: 14px; font-weight: 600;">Platform Revenue: {self._format_currency(platform_fee)}</p>
            </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
                This is an automated notification for Rentyl Agent<br>
                © {datetime.now().year} Rentyl. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
"""

    async def send_agent_notification(
        self,
        agent_email: str,
        amount_paid: float,
        platform_fee: float,
        company_id: int,
        company_name: str,
        customer_name: str,
        customer_email: str,
        customer_phone: str,
        booking_timestamp: str
    ) -> Dict:
        """
        Send notification email to agent about new booking

        Args:
            agent_email: Agent's email address
            amount_paid: Total amount paid by customer
            platform_fee: Platform fee (5% of amount_paid)
            company_id: Company ID
            company_name: Company name
            customer_name: Customer's full name
            customer_email: Customer's email
            customer_phone: Customer's phone
            booking_timestamp: Timestamp of booking creation

        Returns:
            Dict with success status and message
        """
        if not self.enabled:
            return {"success": False, "message": "Email service not configured"}

        try:
            html_content = self._generate_agent_notification_html(
                amount_paid=amount_paid,
                platform_fee=platform_fee,
                company_id=company_id,
                company_name=company_name,
                customer_name=customer_name,
                customer_email=customer_email,
                customer_phone=customer_phone,
                booking_timestamp=booking_timestamp
            )

            params = {
                "from": RESEND_FROM_EMAIL,
                "to": [agent_email],
                "subject": f"New Booking Notification - {customer_name}",
                "html": html_content,
            }

            email = await asyncio.to_thread(resend.Emails.send, params)

            logger.info("[EMAIL] Agent notification sent")
            return {"success": True, "message": "Agent notification sent", "email_id": email.get("id")}

        except Exception as e:
            logger.warning("[EMAIL] Failed to send agent notification (%s)", type(e).__name__)
            return {"success": False, "message": f"Failed to send email: {str(e)}"}


# Create singleton instance
email_service = EmailService()

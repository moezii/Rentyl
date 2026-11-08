"""
Booking Service

Handles business logic for payment-based bookings.
Creates booking records automatically after successful payments.
"""

from backend.supabase.client import supabase
from backend.models.booking import BookingCreate, BookingUpdate, BookingValidate
from backend.utils.aes_utils import decrypt_id, encrypt_id_legacy, to_legacy_id
from backend.services.email_service import email_service
from typing import List, Optional
from datetime import datetime, date, timedelta, timezone
from urllib.parse import urlparse
from backend.config import BUCKET_NAME, BOOKING_DOCS_BUCKET
from fastapi import HTTPException
from backend.utils.signed_tokens import verify_token, InvalidToken
import asyncio

# Largest difference accepted between a paid / signed amount and the server price
PRICE_TOLERANCE = 0.01

# Currencies whose minor unit has three decimals
THREE_DECIMAL_CURRENCIES = {"OMR", "KWD", "BHD", "JOD", "TND", "IQD", "LYD"}


def currency_decimals(currency_code: Optional[str]) -> int:
    return 3 if (currency_code or "").upper() in THREE_DECIMAL_CURRENCIES else 2


class BookingService:
    """Service for managing payment-based bookings"""

    @staticmethod
    def calculate_optimal_rental_price(
        total_days: int,
        daily_rate: float,
        weekly_rate: Optional[float] = None,
        monthly_rate: Optional[float] = None,
    ) -> float:
        if total_days <= 0:
            raise Exception("Total days must be greater than 0")
        if daily_rate is None or daily_rate <= 0:
            raise Exception("Daily rate must be greater than 0")

        cost = 0.0
        remaining_days = total_days

        if monthly_rate and monthly_rate > 0 and remaining_days >= 30:
            months_used = remaining_days // 30
            cost += months_used * float(monthly_rate)
            remaining_days -= months_used * 30

        if weekly_rate and weekly_rate > 0 and remaining_days >= 7:
            if float(weekly_rate) < float(daily_rate) * 7:
                weeks_used = remaining_days // 7
                cost += weeks_used * float(weekly_rate)
                remaining_days -= weeks_used * 7

        if remaining_days > 0:
            cost += remaining_days * float(daily_rate)

        return float(cost)

    @staticmethod
    def normalize_document_path(location: Optional[str]) -> Optional[str]:
        """
        Convert a Supabase public URL into a storage-relative path so we don't
        persist public URLs in the client_documents table.
        """
        if not location:
            return None

        try:
            # If it's already a path, just strip any leading slashes
            if "://" not in location:
                path = location.lstrip("/")
            else:
                parsed = urlparse(location)
                path = parsed.path
                # Supabase public URLs include /object/public/<bucket>/<path>
                markers = ["/object/public/", "/object/sign/"]
                for marker in markers:
                    if marker in path:
                        path = path.split(marker, 1)[1]
                        break
                path = path.lstrip("/")

            # Remove bucket prefix to keep it relative
            for bucket in [BOOKING_DOCS_BUCKET, BUCKET_NAME]:
                if bucket and path.startswith(f"{bucket}/"):
                    path = path[len(bucket) + 1 :]
                    break

            # Drop any querystring fragments (e.g. signed URLs)
            return path.split("?", 1)[0]
        except Exception:
            # Fall back to original value if parsing fails
            return location

    @staticmethod
    def calculate_future_booking_charge(start_date: date) -> float:
        """
        Calculate extra charge for future bookings
        Charge 1 OMR per 1 day from today until booking starts
        If booking starts today, no charge. If booking starts in the future, charge applies.

        Args:
            start_date: Rental start date

        Returns:
            float: Future booking charge (0 if booking starts today, 1 OMR per 1 day if future)
        """
        today = date.today()

        # No charge if booking starts today or earlier
        if start_date <= today:
            return 0.0

        # If booking starts in the future, calculate charge based on days from today
        days_from_today = (start_date - today).days
        charge = days_from_today * 1.0
        return round(charge, 2)

    @staticmethod
    def ensure_start_date_within_window(start_date: date, max_days: int = 7) -> None:
        today = date.today()
        max_date = today + timedelta(days=max_days)
        if start_date > max_date:
            raise Exception("Start date must be within 7 days from today")

    @staticmethod
    def build_pickup_datetime(date_str: str, time_str: Optional[str]) -> datetime:
        """
        Build a pickup datetime from a date string (YYYY-MM-DD) and time string (HH:MM).
        Falls back to midnight if no time is provided.
        """
        if not time_str:
            return datetime.fromisoformat(f"{date_str}T00:00:00")

        normalized_time = time_str.strip()
        if len(normalized_time) == 5:
            normalized_time = f"{normalized_time}:00"

        return datetime.fromisoformat(f"{date_str}T{normalized_time}")

    @staticmethod
    async def create_booking(booking_data: BookingCreate) -> dict:
        """
        Create a new booking after successful payment
        Also creates client and rental record

        Args:
            booking_data: Booking creation data

        Returns:
            dict: Created booking record

        Raises:
            Exception: If booking creation fails
        """
        try:
            # Decrypt the encrypted car_id to get the actual integer car_id
            decrypted_car_id = decrypt_id(booking_data.car_id)

            # SECURITY: only a payment verified by the server (AMWAL response hash
            # checked in /payment/confirm or /payment/return) can create a booking.
            # Browser-sent payment status / transaction ID are ignored.
            try:
                payment = verify_token(booking_data.payment_token or "", "payment")
            except InvalidToken:
                raise HTTPException(status_code=402, detail="Payment could not be verified")
            if (payment["car"] != decrypted_car_id
                    or payment["start"] != booking_data.rental_start_date
                    or payment["end"] != booking_data.rental_end_date):
                raise HTTPException(status_code=400, detail="Payment does not match this booking")
            if await BookingService.get_booking_by_transaction_id(payment["txn"]):
                raise HTTPException(status_code=409, detail="Booking already exists for this transaction")

            # Get the car to retrieve its company_id and daily_rate
            # This ensures bookings work for cars from ANY company
            # Server-side (service-role) client: public booking lookups work for cars of
            # every company; only the columns needed here are selected.
            public_supabase = supabase

            car_response = public_supabase.table('cars').select(
                'company_id, daily_rate, weekly_rate, monthly_rate, status, make, model'
            ).eq('car_id', decrypted_car_id).single().execute()

            if not car_response.data:
                raise Exception(f"Car not found with ID: {decrypted_car_id}")

            company_id = car_response.data.get('company_id')
            daily_rate = float(car_response.data.get('daily_rate', 0))
            weekly_rate = car_response.data.get('weekly_rate')
            monthly_rate = car_response.data.get('monthly_rate')

            if not company_id:
                raise Exception("Car does not have a company_id")

            # Validate dates and amount BEFORE writing anything (an invalid request
            # used to leave an orphan client + documents behind)
            # Calculate rental details (24-hour periods)
            start_date = datetime.fromisoformat(booking_data.rental_start_date).date()
            end_date = datetime.fromisoformat(booking_data.rental_end_date).date()
            BookingService.ensure_start_date_within_window(start_date)
            # /bookings/create is public, so it must not accept back-dated rentals.
            # One day of grace (unlike validate_booking) so a payment that started
            # just before midnight still gets its booking.
            if start_date < date.today() - timedelta(days=1):
                raise Exception("Start date cannot be in the past")
            pickup_datetime = BookingService.build_pickup_datetime(
                booking_data.rental_start_date,
                booking_data.pickup_time
            )
            total_days = (end_date - start_date).days  # 1 day = 24 hours

            if total_days <= 0:
                raise Exception("End date must be after start date")

            # SECURITY: Calculate price on backend - NEVER trust frontend amount
            base_rental_cost = BookingService.calculate_optimal_rental_price(
                total_days,
                daily_rate,
                weekly_rate,
                monthly_rate,
            )
            future_charge = BookingService.calculate_future_booking_charge(start_date)
            subtotal = base_rental_cost + future_charge
            platform_fee = subtotal * 0.05
            total_amount = subtotal + platform_fee

            # The amount AMWAL confirmed must be the server-calculated price
            if abs(float(payment["amt"]) - total_amount) > PRICE_TOLERANCE:
                raise Exception(f"Payment amount mismatch. Expected {total_amount}, paid {payment['amt']}")

            # Create client record
            client_data = {
                "name": booking_data.customer_name,
                "phone_number": booking_data.customer_phone,
                "company_id": company_id,
                "created_at": datetime.now(timezone.utc).isoformat()
            }

            client_response = supabase.table("clients").insert(client_data).execute()

            if not client_response.data or len(client_response.data) == 0:
                raise Exception("Failed to create client")

            client_id = client_response.data[0].get('client_id')
            # Stored in bookings in the legacy format, like existing rows
            encrypted_client_id = encrypt_id_legacy(client_id)

            license_path = BookingService.normalize_document_path(booking_data.license_document_url)
            id_path = BookingService.normalize_document_path(booking_data.id_document_url)

            # Upload client documents if provided
            if license_path or id_path:
                document_records = []

                if license_path:
                    document_records.append({
                        "client_id": client_id,
                        "company_id": company_id,
                        "name": "Driver License",
                        "file_path": license_path,
                        "file_type": "license",
                        "uploaded_at": datetime.now(timezone.utc).isoformat()
                    })

                if id_path:
                    document_records.append({
                        "client_id": client_id,
                        "company_id": company_id,
                        "name": "ID Document",
                        "file_path": id_path,
                        "file_type": "id",
                        "uploaded_at": datetime.now(timezone.utc).isoformat()
                    })

                if document_records:
                    supabase.table("client_documents").insert(document_records).execute()

            # Platform fee is already added to total_amount (customer payment)
            # Rental record stores the amount after deducting platform fee (what company receives)
            # amount_after_platform_fee = subtotal (rental cost + future charge, without platform fee)
            amount_after_platform_fee_raw = subtotal

            # IMPORTANT: Database trigger recalculates final_price as (daily_rate * total_days + additional_charges)
            # So we need to adjust daily_rate to reflect the amount after platform fee
            # This way: daily_rate_adjusted * total_days = amount_after_platform_fee
            daily_rate_adjusted = round(amount_after_platform_fee_raw / total_days, 3)
            # Recompute to match trigger-calculated final_price and avoid rounding gaps
            amount_after_platform_fee = round(daily_rate_adjusted * total_days, 3)

            # Create rental record
            # The database trigger will calculate: final_price = daily_rate_adjusted * total_days + 0 = amount_after_platform_fee
            # Since amount_paid = amount_after_platform_fee, the rental will be marked as FULLY PAID
            rental_data = {
                "car_id": decrypted_car_id,
                "client_id": client_id,
                "company_id": company_id,
                "rental_start_date": pickup_datetime.isoformat(),
                "rental_end_date": end_date.isoformat(),
                "total_days": total_days,
                "daily_rate": daily_rate_adjusted,  # Adjusted rate = 95% of original total / days
                "amount_paid": amount_after_platform_fee,  # 95% of customer payment
                "payment_status": "paid",  # payment verified above
                "mileage_before": 0,
                "additional_charges": 0,  # Set to 0 - future charge already included in adjusted daily_rate
                "additional_charges_description": f"Customer paid {total_amount:.3f} OMR (including {future_charge:.3f} OMR future booking fee). Platform fee (5%): {platform_fee:.3f} OMR. Company receives: {amount_after_platform_fee:.3f} OMR." if future_charge > 0 else f"Customer paid {total_amount:.3f} OMR. Platform fee (5%): {platform_fee:.3f} OMR. Company receives: {amount_after_platform_fee:.3f} OMR.",
                "contract_status": "active",
                "car_collected": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }

            # Attempt to create rental record
            # The database has an exclusion constraint that prevents overlapping rentals
            try:
                rental_response = supabase.table("rentalrecords").insert(rental_data).execute()
            except Exception as db_error:
                error_msg = str(db_error).lower()

                # Check if it's the exclusion constraint violation (double booking prevented)
                if "no_overlapping_rentals" in error_msg or "exclusion constraint" in error_msg or "conflicting key value" in error_msg:
                    # Database prevented double booking - this means another user booked the car
                    # between the availability check and rental creation
                    raise Exception(
                        f"DOUBLE_BOOKING_PREVENTED: This car was just booked by another customer "
                        f"for overlapping dates. Payment transaction ID: {payment['txn']}. "
                        f"A refund is required."
                    )

                # Other database errors
                raise Exception(f"Database error creating rental: {str(db_error)}")

            if not rental_response.data or len(rental_response.data) == 0:
                raise Exception("Failed to create rental record")

            rental_id = rental_response.data[0].get('rental_id')
            encrypted_rental_id = encrypt_id_legacy(rental_id)

            # Update car status if rental starts today
            today = date.today()
            if start_date <= today:
                supabase.table("cars").update({"status": "rented"}).eq("car_id", decrypted_car_id).execute()

            # Prepare booking data (store encrypted IDs in bookings table)
            booking_dict = {
                "company_id": company_id,
                "car_id": to_legacy_id(booking_data.car_id),  # Encrypted car ID, legacy format (matches existing rows and the availability RPC)
                "client_id": encrypted_client_id,  # Store encrypted client ID
                "rental_record_id": encrypted_rental_id,  # Store encrypted rental ID
                "payment_transaction_id": payment["txn"],  # from the verified AMWAL response
                "payment_reference": payment["ref"],
                "amount_paid": total_amount,  # Include future booking charge
                "currency_id": booking_data.currency_id,
                "customer_email": booking_data.customer_email,
                "customer_phone": booking_data.customer_phone,
                "customer_name": booking_data.customer_name,
                "payment_status": "completed",
                "payment_response_code": "00",
                "rental_start_date": pickup_datetime.isoformat(),
                "rental_end_date": end_date.isoformat(),
                "collection_address": booking_data.collection_address,  # Vehicle pickup location
                "pickup_time": booking_data.pickup_time,
                # Explicitly set booking_status to satisfy DB check constraint (future/present/past/cancelled)
                "booking_status": BookingService.compute_booking_status(
                    start_date.isoformat(), end_date.isoformat()
                ),
                "created_at": datetime.now(timezone.utc).isoformat(),
            }

            # Insert booking into Supabase
            response = supabase.table('bookings').insert(booking_dict).execute()

            if response.data and len(response.data) > 0:
                booking_record = response.data[0]

                # Send email notifications asynchronously (don't block on email failures)
                try:
                    # Get company information including contact details
                    company_response = supabase.table('companies').select('company_name, phone_number, detailed_location').eq('company_id', company_id).execute()
                    company_name = 'Your Company'
                    company_phone = None
                    company_location = None
                    if company_response.data and len(company_response.data) > 0:
                        company_name = company_response.data[0].get('company_name', 'Your Company')
                        company_phone = company_response.data[0].get('phone_number')
                        company_location = company_response.data[0].get('detailed_location')

                    # Get company owner's email from users table
                    user_response = supabase.table('users').select('email, agent_email').eq('company_id', company_id).limit(1).execute()

                    if user_response.data and len(user_response.data) > 0:
                        company_email = user_response.data[0].get('email')
                        agent_email = user_response.data[0].get('agent_email')

                        # Get car information for email
                        car_make_model = f"{car_response.data.get('make', '')} {car_response.data.get('model', '')}".strip()
                        if not car_make_model:
                            car_make_model = "Vehicle"

                        # Send company notification (original email to company owner)
                        if company_email:
                            await email_service.send_company_notification(
                                company_email=company_email,
                                company_name=company_name,
                                customer_name=booking_data.customer_name or "Customer",
                                customer_email=booking_data.customer_email or "N/A",
                                customer_phone=booking_data.customer_phone or "N/A",
                                car_info=car_make_model,
                                rental_start=start_date.isoformat(),
                                rental_end=end_date.isoformat(),
                                amount_paid=total_amount,
                                booking_id=booking_record.get('id', 'N/A'),
                                collection_address=booking_data.collection_address,
                                pickup_time=booking_data.pickup_time
                            )
                            # Add delay to respect Resend rate limit (2 requests/second)
                            await asyncio.sleep(0.6)

                        # Send agent notification (separate email to agent_email)
                        if agent_email:
                            booking_timestamp = booking_record.get('created_at', datetime.now(timezone.utc).isoformat())

                            await email_service.send_agent_notification(
                                agent_email=agent_email,
                                amount_paid=total_amount,
                                platform_fee=platform_fee,
                                company_id=company_id,
                                company_name=company_name,
                                customer_name=booking_data.customer_name or "Customer",
                                customer_email=booking_data.customer_email or "N/A",
                                customer_phone=booking_data.customer_phone or "N/A",
                                booking_timestamp=booking_timestamp
                            )
                            # Add delay to respect Resend rate limit (2 requests/second)
                            await asyncio.sleep(0.6)

                    # Send customer confirmation email
                    if booking_data.customer_email:
                        # Get car information for email
                        car_make_model = f"{car_response.data.get('make', '')} {car_response.data.get('model', '')}".strip()
                        if not car_make_model:
                            car_make_model = "Vehicle"

                        await email_service.send_customer_confirmation(
                            customer_email=booking_data.customer_email,
                            customer_name=booking_data.customer_name or "Customer",
                            car_info=car_make_model,
                            rental_start=start_date.isoformat(),
                            rental_end=end_date.isoformat(),
                            amount_paid=total_amount,
                            booking_id=booking_record.get('id', 'N/A'),
                            payment_reference=payment["ref"],
                            company_phone=company_phone,
                            company_location_link=company_location,
                            pickup_time=booking_data.pickup_time,
                            collection_address=booking_data.collection_address
                        )

                    print(f"[BOOKING] Email notifications sent for booking {booking_record.get('id')}")

                except Exception as email_error:
                    # Log email error but don't fail the booking
                    print(f"[BOOKING WARNING] Failed to send email notifications: {str(email_error)}")

                return booking_record
            else:
                raise Exception("Failed to create booking in database")

        except HTTPException:
            raise
        except Exception as e:
            print(f"Error creating booking: {e}")
            raise Exception(f"Failed to create booking: {str(e)}")

    @staticmethod
    def company_currency_decimals(company_id) -> int:
        """Minor-unit decimals of the company's currency (3 for OMR/KWD/BHD, else 2).

        Payments go through AMWAL in OMR, so an unknown currency counts as OMR.
        """
        currency = None
        if company_id:
            try:
                result = supabase.table('companies').select('currency').eq('company_id', company_id).execute()
                if result.data:
                    currency = result.data[0].get('currency')
            except Exception as e:
                print(f"[BOOKING WARNING] Could not read company currency: {e}")
        return currency_decimals(currency or 'OMR')

    @staticmethod
    def effective_status(booking: dict) -> str:
        """Status to report for a stored booking: 'cancelled' sticks, otherwise date-based."""
        if booking.get('booking_status') == 'cancelled':
            return 'cancelled'
        return BookingService.compute_booking_status(
            booking.get('rental_start_date'), booking.get('rental_end_date')
        )

    @staticmethod
    def compute_booking_status(rental_start_date: str, rental_end_date: str) -> str:
        """
        Compute booking status based on rental dates (Python implementation)

        Args:
            rental_start_date: Start date string (YYYY-MM-DD)
            rental_end_date: End date string (YYYY-MM-DD)

        Returns:
            str: Booking status (future, present, or past - the values the
                bookings_booking_status_check constraint allows)
        """
        if not rental_start_date or not rental_end_date:
            return 'future'

        try:
            start_date = datetime.fromisoformat(rental_start_date).date()
            end_date = datetime.fromisoformat(rental_end_date).date()
            today = date.today()

            if today < start_date:
                return 'future'
            elif start_date <= today <= end_date:
                return 'present'
            else:
                return 'past'
        except (ValueError, TypeError):
            return 'future'

    @staticmethod
    async def get_booking_by_id(booking_id: str, company_id: Optional[int] = None) -> Optional[dict]:
        """
        Get booking by ID with computed status

        Args:
            booking_id: Booking UUID

        Returns:
            dict or None: Booking record if found
        """
        try:
            query = supabase.table('bookings').select('*').eq('id', booking_id)
            if company_id is not None:
                query = query.eq('company_id', company_id)
            response = query.single().execute()
            if response.data:
                # ALWAYS compute status from dates (don't trust stored booking_status)
                computed = BookingService.effective_status(response.data)
                response.data['computed_status'] = computed
                response.data['booking_status'] = computed  # Override stored value
            return response.data if response.data else None
        except Exception as e:
            print(f"Error fetching booking: {e}")
            return None

    @staticmethod
    async def get_booking_by_transaction_id(transaction_id: str) -> Optional[dict]:
        """
        Get booking by payment transaction ID with computed status

        Args:
            transaction_id: AMWAL transaction ID

        Returns:
            dict or None: Booking record if found
        """
        try:
            response = (
                supabase.table('bookings')
                .select('*')
                .eq('payment_transaction_id', transaction_id)
                .execute()
            )
            if response.data and len(response.data) > 0:
                booking = response.data[0]
                # ALWAYS compute status from dates (override stored value)
                computed = BookingService.effective_status(booking)
                booking['computed_status'] = computed
                booking['booking_status'] = computed  # Override stored value
                return booking
            return None
        except Exception as e:
            print(f"Error fetching booking by transaction ID: {e}")
            return None

    @staticmethod
    async def get_booking_by_reference(payment_reference: str, company_id: Optional[int] = None) -> Optional[dict]:
        """
        Get booking by payment reference with computed status

        Args:
            payment_reference: Merchant payment reference

        Returns:
            dict or None: Booking record if found
        """
        try:
            query = (
                supabase.table('bookings')
                .select('*')
                .eq('payment_reference', payment_reference)
            )
            if company_id is not None:
                query = query.eq('company_id', company_id)
            response = query.single().execute()
            if response.data:
                # ALWAYS compute status from dates (override stored value)
                computed = BookingService.effective_status(response.data)
                response.data['computed_status'] = computed
                response.data['booking_status'] = computed  # Override stored value
            return response.data if response.data else None
        except Exception as e:
            print(f"Error fetching booking by reference: {e}")
            return None

    @staticmethod
    async def update_booking(booking_id: str, update_data: BookingUpdate, company_id: Optional[int] = None) -> Optional[dict]:
        """
        Update booking details

        Args:
            booking_id: Booking UUID
            update_data: Data to update

        Returns:
            dict or None: Updated booking record
        """
        try:
            # Prepare update data (only include non-None values)
            update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
            update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()

            query = (
                supabase.table('bookings')
                .update(update_dict)
                .eq('id', booking_id)
            )
            if company_id is not None:
                query = query.eq('company_id', company_id)
            response = query.execute()

            return response.data[0] if response.data and len(response.data) > 0 else None
        except Exception as e:
            print(f"Error updating booking: {e}")
            raise Exception(f"Failed to update booking: {str(e)}")

    @staticmethod
    async def get_all_bookings(limit: int = 100, offset: int = 0, company_id: Optional[int] = None) -> List[dict]:
        """
        Get all bookings with pagination and computed status

        Args:
            limit: Maximum number of records to return
            offset: Number of records to skip

        Returns:
            List of booking records
        """
        try:
            query = supabase.table('bookings').select('*')
            if company_id is not None:
                query = query.eq('company_id', company_id)
            response = (
                query
                .order('created_at', desc=True)
                .range(offset, offset + limit - 1)
                .execute()
            )
            if response.data:
                # ALWAYS compute status from dates (override stored value)
                for booking in response.data:
                    computed = BookingService.effective_status(booking)
                    booking['computed_status'] = computed
                    booking['booking_status'] = computed  # Override stored value
            return response.data if response.data else []
        except Exception as e:
            print(f"Error fetching bookings: {e}")
            return []

    @staticmethod
    async def get_bookings_by_car(car_id: str) -> List[dict]:
        """
        Get all bookings for a specific car with computed status

        Args:
            car_id: Encrypted car ID

        Returns:
            List of booking records
        """
        try:
            response = (
                supabase.table('bookings')
                .select('*')
                .eq('car_id', to_legacy_id(car_id))
                .order('created_at', desc=True)
                .execute()
            )
            if response.data:
                # ALWAYS compute status from dates (override stored value)
                for booking in response.data:
                    computed = BookingService.effective_status(booking)
                    booking['computed_status'] = computed
                    booking['booking_status'] = computed  # Override stored value
            return response.data if response.data else []
        except Exception as e:
            print(f"Error fetching car bookings: {e}")
            return []

    @staticmethod
    async def cancel_booking(booking_id: str, company_id: Optional[int] = None) -> Optional[dict]:
        """
        Cancel a booking

        Args:
            booking_id: Booking UUID

        Returns:
            dict or None: Updated booking record
        """
        try:
            update_data = BookingUpdate(booking_status="cancelled")
            return await BookingService.update_booking(booking_id, update_data, company_id)
        except Exception as e:
            print(f"Error cancelling booking: {e}")
            raise Exception(f"Failed to cancel booking: {str(e)}")

    @staticmethod
    async def confirm_booking(booking_id: str, company_id: Optional[int] = None) -> Optional[dict]:
        """
        Confirm a booking

        Args:
            booking_id: Booking UUID

        Returns:
            dict or None: Updated booking record
        """
        try:
            # The bookings_booking_status_check constraint only allows
            # future/present/past/cancelled ('confirmed' was rejected). Confirming
            # (e.g. un-cancelling) sets the date-based status.
            booking = await BookingService.get_booking_by_id(booking_id, company_id)
            if not booking:
                return None
            status_value = BookingService.compute_booking_status(
                booking.get('rental_start_date'), booking.get('rental_end_date')
            )
            update_data = BookingUpdate(booking_status=status_value)
            return await BookingService.update_booking(booking_id, update_data, company_id)
        except Exception as e:
            print(f"Error confirming booking: {e}")
            raise Exception(f"Failed to confirm booking: {str(e)}")

    @staticmethod
    async def calculate_booking_price(car_id: str, start_date: str, end_date: str) -> dict:
        """
        Calculate the total booking price (SERVER-SIDE CALCULATION)
        SECURITY: Never trust frontend price calculations

        Args:
            car_id: Encrypted car ID
            start_date: Start date in YYYY-MM-DD format
            end_date: End date in YYYY-MM-DD format

        Returns:
            dict: {
                "daily_rate": float,
                "total_days": int,
                "base_rental_cost": float,
                "future_booking_fee": float,
                "total_cost": float,
                "availability": dict (optional - includes conflicts if any)
            }
        """
        try:
            # Validate and parse dates first
            try:
                start_date_obj = datetime.fromisoformat(start_date).date()
                end_date_obj = datetime.fromisoformat(end_date).date()
            except (ValueError, TypeError) as date_error:
                raise Exception(f"Invalid date format: {str(date_error)}")

            BookingService.ensure_start_date_within_window(start_date_obj)

            # Calculate days (24-hour periods: 1 day = 24 hours)
            total_days = (end_date_obj - start_date_obj).days

            if total_days <= 0:
                raise Exception("End date must be after start date")

            # Decrypt car ID and get car details
            try:
                decrypted_car_id = decrypt_id(car_id)
            except Exception as decrypt_error:
                raise Exception(f"Invalid car ID: {str(decrypt_error)}")

            # Fetch car details
            # This is a public endpoint that should work for ALL cars from ALL companies
            try:
                # Server-side (service-role) client: public booking lookups work for cars of
                # every company; only the columns needed here are selected.
                public_supabase = supabase

                car_response = public_supabase.table('cars').select('company_id, daily_rate, weekly_rate, monthly_rate, status').eq('car_id', decrypted_car_id).single().execute()

                if not car_response.data:
                    raise Exception(f"Car not found with ID: {decrypted_car_id}")

                daily_rate = float(car_response.data.get('daily_rate', 0))
                weekly_rate = car_response.data.get('weekly_rate')
                monthly_rate = car_response.data.get('monthly_rate')

                if daily_rate <= 0:
                    raise Exception("Invalid daily rate for this car")

                decimals = BookingService.company_currency_decimals(car_response.data.get('company_id'))

            except Exception as db_error:
                print(f"[BOOKING ERROR] Database error fetching car: {str(db_error)}")
                raise Exception(f"Failed to fetch car details: {str(db_error)}")

            # Calculate base rental cost (optimal using monthly/weekly/daily rates)
            base_rental_cost = BookingService.calculate_optimal_rental_price(
                total_days,
                daily_rate,
                weekly_rate,
                monthly_rate,
            )

            # Calculate future booking fee
            future_booking_fee = BookingService.calculate_future_booking_charge(start_date_obj)

            # Calculate subtotal (rental cost + future fee)
            subtotal = base_rental_cost + future_booking_fee

            # Add 5% platform fee
            platform_fee = subtotal * 0.05
            total_cost = subtotal + platform_fee

            # Check availability (non-blocking - just for information)
            availability_info = None
            try:
                availability_info = await BookingService.check_availability(car_id, start_date, end_date)
            except Exception as avail_error:
                # Don't fail price calculation if availability check fails
                print(f"[BOOKING WARNING] Could not check availability: {str(avail_error)}")

            result = {
                "daily_rate": daily_rate,
                "total_days": total_days,
                # Rounded to the currency's minor unit: OMR (the AMWAL currency) has
                # 3 decimals; it used to be rounded to 2, so the amount signed for
                # AMWAL could differ from the real price by up to 0.005 OMR.
                "base_rental_cost": round(base_rental_cost, decimals),
                "future_booking_fee": round(future_booking_fee, decimals),
                "platform_fee": round(platform_fee, decimals),
                "total_cost": round(total_cost, decimals),
                "decimals": decimals,
            }

            # Include availability info if we got it
            if availability_info:
                result["availability"] = availability_info

            return result

        except Exception as e:
            print(f"[BOOKING ERROR] Error calculating booking price: {str(e)}")
            import traceback
            traceback.print_exc()
            raise Exception(f"Failed to calculate booking price: {str(e)}")

    @staticmethod
    async def check_availability(car_id: str, start_date: str, end_date: str) -> dict:
        """
        Check if a car is available for the specified date range
        This method efficiently checks both bookings and rental records

        Args:
            car_id: Encrypted car ID
            start_date: Start date in YYYY-MM-DD format
            end_date: End date in YYYY-MM-DD format

        Returns:
            dict: {
                "available": bool,
                "conflicting_bookings": List[dict],
                "message": str
            }
        """
        try:
            # Parse dates
            requested_start = datetime.fromisoformat(start_date).date()
            requested_end = datetime.fromisoformat(end_date).date()

            BookingService.ensure_start_date_within_window(requested_start)

            # Validate date range
            if requested_end < requested_start:
                raise Exception("End date must be after or equal to start date")

            # Public availability check
            # Server-side (service-role) client: public booking lookups work for cars of
            # every company; only the columns needed here are selected.
            public_supabase = supabase

            # Conflicts are checked by the check_car_availability_secure RPC
            decrypted_car_id = decrypt_id(car_id)
            rpc_response = public_supabase.rpc(
                'check_car_availability_secure',
                {
                    'p_car_id_enc': to_legacy_id(car_id),
                    'p_car_id_int': decrypted_car_id,
                    'p_start': requested_start.isoformat(),
                    'p_end': requested_end.isoformat()
                }
            ).execute()

            conflicting_bookings = []

            if rpc_response.data:
                for row in rpc_response.data:
                    # Rows with available=True have null conflict fields; skip them
                    if row.get("available") is True:
                        continue

                    conflicting_bookings.append({
                        "type": row.get("conflict_type", "unknown"),
                        "start_date": row.get("conflict_start"),
                        "end_date": row.get("conflict_end"),
                        "status": row.get("conflict_status")
                    })

            # Determine availability
            is_available = len(conflicting_bookings) == 0

            message = "Car is available for the selected dates" if is_available else f"Car is not available. Found {len(conflicting_bookings)} conflicting booking(s)"

            return {
                "available": is_available,
                "conflicting_bookings": conflicting_bookings,
                "message": message,
                "requested_start": start_date,
                "requested_end": end_date
            }

        except Exception as e:
            print(f"Error checking availability: {e}")
            raise Exception(f"Failed to check availability: {str(e)}")

    @staticmethod
    async def validate_booking(booking_data: BookingValidate) -> dict:
        """
        Validate booking before payment (silent pre-check)
        Verifies car availability, calculates price, validates data
        Does NOT create any records - just validation

        Args:
            booking_data: Booking validation data

        Returns:
            dict: {
                "valid": bool,
                "availability": dict,
                "price_breakdown": dict,
                "car_details": dict
            }

        Raises:
            Exception: If validation fails
        """
        try:
            # 1. Decrypt and verify car exists
            # This is a public endpoint that should work for ALL cars from ALL companies
            # Server-side (service-role) client: public booking lookups work for cars of
            # every company; only the columns needed here are selected.
            public_supabase = supabase

            decrypted_car_id = decrypt_id(booking_data.car_id)
            car_response = public_supabase.table('cars').select(
                'car_id, company_id, daily_rate, status, make, model, year'
            ).eq('car_id', decrypted_car_id).single().execute()

            if not car_response.data:
                raise Exception(f"Car not found with ID: {decrypted_car_id}")

            car = car_response.data
            company_id = car.get('company_id')
            daily_rate = float(car.get('daily_rate', 0))

            if not company_id:
                raise Exception("Car does not have a company_id")

            # 2. Check availability
            availability = await BookingService.check_availability(
                booking_data.car_id,
                booking_data.rental_start_date,
                booking_data.rental_end_date
            )

            if not availability.get('available', False):
                raise Exception(
                    f"Car is not available for the selected dates. {availability.get('message', '')}"
                )

            # 3. Calculate price
            price_breakdown = await BookingService.calculate_booking_price(
                booking_data.car_id,
                booking_data.rental_start_date,
                booking_data.rental_end_date
            )

            # 4. Validate customer information
            if not booking_data.customer_name:
                raise Exception("Customer name is required")

            if not booking_data.customer_email and not booking_data.customer_phone:
                raise Exception("Either customer email or phone is required")

            # 5. Validate dates
            start_date = datetime.fromisoformat(booking_data.rental_start_date).date()
            end_date = datetime.fromisoformat(booking_data.rental_end_date).date()
            today = date.today()

            BookingService.ensure_start_date_within_window(start_date)

            if start_date < today:
                raise Exception("Start date cannot be in the past")

            if end_date < start_date:
                raise Exception("End date must be after start date")

            # 6. Documents will be uploaded AFTER payment
            # No need to validate document URLs here since they'll be uploaded after payment succeeds

            # All validations passed
            return {
                "valid": True,
                "availability": availability,
                "price_breakdown": price_breakdown,
                "car_details": {
                    "car_id": booking_data.car_id,
                    "make": car.get('make'),
                    "model": car.get('model'),
                    "year": car.get('year'),
                    "daily_rate": daily_rate,
                    "company_id": company_id
                },
                "booking_details": {
                    "customer_name": booking_data.customer_name,
                    "customer_email": booking_data.customer_email,
                    "customer_phone": booking_data.customer_phone,
                    "rental_start_date": booking_data.rental_start_date,
                    "rental_end_date": booking_data.rental_end_date
                }
            }

        except Exception as e:
            print(f"Error validating booking: {e}")
            raise Exception(f"Booking validation failed: {str(e)}")


# Create singleton instance
booking_service = BookingService()

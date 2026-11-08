import traceback
from fastapi import HTTPException
from backend.utils.errors import server_error
from backend.supabase.client import supabase
from backend.models.rental import RentalCreate, RentalUpdate, RentalOut
from datetime import datetime, date, timezone
from typing import Dict, Optional, Any
from dotenv import load_dotenv
from backend.utils.date_utils import serialize_dates, serialize_date
import os
import logging
import traceback
from backend.utils.aes_utils import encrypt_id

logger = logging.getLogger(__name__)
load_dotenv()



async def delete_rental_service(rental_id: str, company_id: int):
    """
    Deletes a rental record by rental_id.
    
    Args:
        rental_id: The ID of the rental to delete
        company_id: The ID of the company associated with the rental
        
    Returns:
        Dict with deletion success message
        
    Raises:
        HTTPException: If deletion fails or rental not found
    """
    try:
        print(f"[DELETE RENTAL] Deleting rental with ID: {rental_id} for company {company_id}")
        
        # First verify that the rental exists
        rental = await get_rental_by_id_service(rental_id, company_id)
        if not rental:
            raise HTTPException(status_code=404, detail="Rental not found or access denied")
            
        # If rental is found, delete it
        result = supabase.table("rentalrecords").delete().eq("rental_id", rental_id).eq("company_id", company_id).execute()
        
        # Check for errors
        if getattr(result, "error", None):
            print(f"[DELETE ERROR] {result.error}")
            raise HTTPException(status_code=500, detail="Database error")
            
        # If no data returned, rental might not exist
        if not result.data:
            print(f"[DELETE WARNING] No data returned when deleting rental {rental_id}")
            
        # Return success message
        return {"message": "Rental deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[DELETE RENTAL ERROR] {str(e)}")
        traceback.print_exc()
        raise server_error(e)


# Helper function to serialize dates - DEPRECATED, use from date_utils instead
def serialize_dates(data):
    """Convert date/datetime objects to ISO format strings."""
    if isinstance(data, dict):
        return {key: serialize_dates(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [serialize_dates(item) for item in data]
    elif isinstance(data, date):
        return data.isoformat()
    else:
        return data

async def create_rental_service(rental: RentalCreate, company_id: int):
    """
    Creates a new rental record with calculated price.
    """
    try:
        print(f"Creating rental for company {company_id}")
        
        # Verify car belongs to company
        car_result = supabase.table("cars").select("*").eq("car_id", rental.car_id).eq("company_id", company_id).single().execute()
        if not car_result.data:
            raise Exception("Car not found or access denied")
        car = car_result.data
        
        # Verify client belongs to company
        client_result = supabase.table("clients").select("*").eq("client_id", rental.client_id).eq("company_id", company_id).single().execute()
        if not client_result.data:
            raise Exception("Client not found or access denied")
        
        # Parse datetimes (they're already datetime objects from Pydantic)
        start_date = rental.rental_start_date
        end_date = rental.rental_end_date
        
        # Calculate total days based on datetime difference (24-hour periods)
        # 1 day = 24 hours (e.g., 9 AM on day 1 to 9 AM on day 2 = 1 day)
        total_days = (end_date - start_date).days

        if total_days <= 0:
            raise ValueError("End datetime must be after start datetime")

        # Use provided daily_rate if available, otherwise use car's daily_rate
        daily_rate = rental.daily_rate if rental.daily_rate is not None else car.get("daily_rate", 0)
        # ALWAYS recalculate final_price based on server-side total_days (don't trust frontend calculation)
        final_price = daily_rate * total_days
        if rental.additional_charges and rental.additional_charges > 0:
            final_price += rental.additional_charges

        # Create rental data payload
        rental_data = {
            'car_id': rental.car_id,
            'client_id': rental.client_id,
            'company_id': company_id,
            'rental_start_date': start_date.isoformat(),
            'rental_end_date': end_date.isoformat(),
            'total_days': total_days,
            'daily_rate': daily_rate,
            'final_price': final_price,
            'payment_status': rental.payment_status or 'unpaid',
            'amount_paid': rental.amount_paid or 0,
            'mileage_before': rental.mileage_before or 0,
            'additional_charges': rental.additional_charges or 0,
            'additional_charges_description': rental.additional_charges_description or '',
            'created_at': datetime.now(timezone.utc).isoformat()
        }

        
        try:
            # Try insert with the new table structure
            insert_result = supabase.table("rentalrecords").insert(rental_data).execute()
            
            if hasattr(insert_result, "error") and insert_result.error:
                raise Exception(f"Insert error: {insert_result.error}")
                
            if not insert_result.data or len(insert_result.data) == 0:
                raise Exception("Insert returned no data")
                
            rental_entry = insert_result.data[0]
            logger.debug("Rental insert successful")
            
        except Exception as db_err:
            print(f"Database error: {str(db_err)}")
            try:
                # Log the failed rental insertion
                log_data = {
                    'car_id': rental.car_id,
                    'client_id': rental.client_id,
                    'rental_start_date': start_date.isoformat(),
                    'rental_end_date': end_date.isoformat(),
                    'total_days': total_days,
                    'daily_rate': daily_rate,
                    'final_price': final_price,
                    'payment_status': rental.payment_status or 'unpaid',
                    'amount_paid': rental.amount_paid if rental.amount_paid is not None else 0,
                    'mileage_before': rental.mileage_before if rental.mileage_before is not None else 0,
                    'additional_charges': rental.additional_charges if rental.additional_charges is not None else 0,
                    'additional_charges_description': rental.additional_charges_description or '',
                    'error_message': str(db_err)
                }
                
                log_result = supabase.table("rental_logs").insert(log_data).execute()
                if hasattr(log_result, "error") and log_result.error:
                    print(f"Warning: Failed to log rental error: {log_result.error}")
                else:
                    print(f"Rental insertion error logged with ID: {log_result.data[0].get('log_id')}")
            except Exception as log_err:
                print(f"Warning: Failed to log rental error: {str(log_err)}")
            # Fall back to mock rental creation if database insert fails
            import random
            mock_rental_id = random.randint(1000, 9999)
            
            rental_entry = {
                "rental_id": mock_rental_id,
                "car_id": rental.car_id,
                "client_id": rental.client_id,
                "rental_start_date": start_date,
                "rental_end_date": end_date,
                "total_days": total_days,
                "daily_rate": daily_rate,
                "final_price": final_price,
                "amount_paid": rental.amount_paid if rental.amount_paid is not None else 0,
                "mileage_before": rental.mileage_before if rental.mileage_before is not None else 0,
                "mileage_after": None,
                "additional_charges": rental.additional_charges if rental.additional_charges is not None else 0,
                "additional_charges_description": rental.additional_charges_description or "",
                "payment_status": rental.payment_status or "unpaid",
                "created_at": datetime.now(timezone.utc)
            }
            
            print(f"Created mock rental with ID: {mock_rental_id} (database insert failed)")
            raise Exception(f"Database insert failed: {str(db_err)}")
        
        # Update car status only if rental starts today or earlier
        try:
            today = datetime.now(timezone.utc)
            # A start date without an offset is treated as UTC; comparing naive with
            # aware datetimes raises TypeError, which used to skip the status update.
            start_cmp = start_date if start_date.tzinfo else start_date.replace(tzinfo=timezone.utc)
            if start_cmp <= today:
                car_update = supabase.table("cars").update({"status": "rented"}).eq("car_id", rental.car_id).eq("company_id", company_id).execute()
            else:
                # Rental is in the future, keep car as available
                car_update = supabase.table("cars").update({"status": "available"}).eq("car_id", rental.car_id).eq("company_id", company_id).execute()
            if hasattr(car_update, "error") and car_update.error:
                print(f"Warning: Car status update error: {car_update.error}")
        except Exception as e:
            print(f"Warning: Could not update car status: {str(e)}")
        
        # Return RentalOut model
        return RentalOut(
            rental_id=rental_entry.get("rental_id"),
            car_id=rental_entry.get("car_id"),
            client_id=rental_entry.get("client_id"),
            company_id=company_id,
            total_days=rental_entry.get("total_days", total_days),
            rental_start_date=rental_entry.get("rental_start_date"),
            rental_end_date=rental_entry.get("rental_end_date"),
            daily_rate=rental_entry.get("daily_rate"),
            amount_paid=rental_entry.get("amount_paid", 0),
            mileage_before=rental_entry.get("mileage_before", 0),
            mileage_after=rental_entry.get("mileage_after"),
            additional_charges=rental_entry.get("additional_charges", 0),
            additional_charges_description=rental_entry.get("additional_charges_description", ""),
            payment_status=rental_entry.get("payment_status", "unpaid"),
            created_at=rental_entry.get("created_at"),
            final_price=rental_entry.get("final_price")
        )

    except Exception as e:
        print(f"[CREATE RENTAL ERROR] {str(e)}")
        traceback.print_exc()
        raise server_error(e, "Failed to create rental")

# FIXED: Ensure company_id is properly handled as integer
async def get_all_rentals_service(company_id: int, filters: Optional[Dict[str, Any]] = None):
    """
    Fetches all rentals with optional filter criteria and calculates payment and contract status.
    """
    try:
        # Ensure company_id is an integer
        if isinstance(company_id, dict):
            print(f"ERROR: company_id received as dict: {company_id}")
            # Extract the actual company_id if it's wrapped in a dict
            if 'company_id' in company_id:
                company_id = company_id['company_id']
            else:
                raise ValueError("Invalid company_id format")
        
        # Convert to int if it's a string
        company_id = int(company_id)
        
        print(f"Fetching rentals for company {company_id}")
        query = supabase.table("rentalrecords").select("*").eq("company_id", company_id)
    
        if filters:
            for key, value in filters.items():
                if key != "company_id":  # Don't override company filter
                    query = query.eq(key, value)

        try:
            result = query.execute()
            # Check for errors using getattr
            if getattr(result, "error", None):
                raise HTTPException(status_code=502, detail="Database error")
                
            rentals = result.data or []
        except Exception as e:
            print(f"Database query error: {str(e)}")
            raise server_error(e, "Unable to fetch rentals", status_code=502)

        print(f"Fetched {len(rentals)} rentals")
        
        # Process rentals to add derived fields
        today = datetime.now().date()
        
        for r in rentals:
            # Calculate total cost
            r["total_cost"] = (
                float(r.get("daily_rate", 0)) * int(r.get("total_days", 0))
                + float(r.get("additional_charges", 0))
            )
            
            # Determine payment status based on payment amounts
            amount_paid = float(r.get("amount_paid", 0))
            final_price = float(r.get("final_price", 0))
            
            if r.get("payment_status") != "cancelled":
                if amount_paid == 0:
                    r["payment_status"] = "unpaid"
                elif amount_paid < final_price:
                    r["payment_status"] = "partially_paid"
                elif amount_paid >= final_price:
                    r["payment_status"] = "paid"
                    
                # Check if rental is overdue
                if "rental_end_date" in r and r["rental_end_date"]:
                    end_date = datetime.fromisoformat(r["rental_end_date"].replace("Z", "+00:00")) if isinstance(r["rental_end_date"], str) else r["rental_end_date"]
                    # Compare dates only (ignore time)
                    if end_date.date() < today and r["payment_status"] in ["unpaid", "partially_paid"]:
                        r["payment_status"] = "overdue"
            
            # Determine contract status
            if r.get("payment_status") == "cancelled":
                r["contract_status"] = "cancelled"
            elif r.get("payment_status") == "overdue":
                # Overdue contracts are active but also marked as overdue
                r["contract_status"] = "active"
            elif r.get("payment_status") == "paid" and "rental_end_date" in r and r["rental_end_date"]:
                end_date = datetime.fromisoformat(r["rental_end_date"].replace("Z", "+00:00")).date() if isinstance(r["rental_end_date"], str) else r["rental_end_date"]
                
                # Only mark as completed if it's paid AND the end date has passed
                if end_date <= today and r.get("car_collected", False):
                    r["contract_status"] = "completed"
                else:
                    r["contract_status"] = "active"
            else:
                # All unpaid or partially paid contracts are considered active
                r["contract_status"] = "active"

            # Add encrypted_client_id and remove raw client_id
            if 'client_id' in r:
                r['encrypted_client_id'] = encrypt_id(r['client_id'])
                del r['client_id']
            # Add encrypted_car_id and remove raw car_id
            if 'car_id' in r:
                r['encrypted_car_id'] = encrypt_id(r['car_id'])
                del r['car_id']
            # Add encrypted_rental_id and remove raw rental_id
            if 'rental_id' in r:
                r['encrypted_rental_id'] = encrypt_id(r['rental_id'])
                del r['rental_id']

        return rentals

    except Exception as e:
        print(f"[FETCH RENTALS ERROR] {str(e)}")
        raise server_error(e)


# Update the get_rental_by_id_service function in backend/services/rental_service.py:

async def get_rental_by_id_service(rental_id: str, company_id: int):
    """
    Fetches a rental record by rental_id.
    Now returns a dictionary instead of a Pydantic model for compatibility.
    """
    try:
        # Ensure company_id is an integer
        company_id = int(company_id)
        
        try:
            result = (
                supabase
                .table("rentalrecords")
                .select("*")
                .eq("rental_id", rental_id)
                .eq("company_id", company_id)
                .single()
                .execute()
            )
            
            # Check for errors
            if getattr(result, "error", None):
                raise HTTPException(status_code=502, detail="Database error")
                
            rental_entry = result.data
            if not rental_entry:
                raise HTTPException(status_code=404, detail="Rental not found")
                
        except Exception as e:
            print(f"Database query error: {str(e)}")
            raise server_error(e, "Error fetching rental", status_code=502)

        # Add total_cost calculation
        rental_entry["total_cost"] = (
            float(rental_entry.get("daily_rate", 0)) * int(rental_entry.get("total_days", 0))
            + float(rental_entry.get("additional_charges", 0))
        )

        # Add encrypted_client_id and remove raw client_id
        if 'client_id' in rental_entry:
            rental_entry['encrypted_client_id'] = encrypt_id(rental_entry['client_id'])
            del rental_entry['client_id']
        # Add encrypted_car_id and remove raw car_id
        if 'car_id' in rental_entry:
            rental_entry['encrypted_car_id'] = encrypt_id(rental_entry['car_id'])
            del rental_entry['car_id']
        # Add encrypted_rental_id and remove raw rental_id
        if 'rental_id' in rental_entry:
            rental_entry['encrypted_rental_id'] = encrypt_id(rental_entry['rental_id'])
            del rental_entry['rental_id']

        # Return as a dictionary, not converted to a Pydantic model
        return rental_entry

    except Exception as e:
        print(f"[FETCH RENTAL BY ID ERROR] {str(e)}")
        raise server_error(e)

async def update_rental_service(rental_id: str, payload: RentalUpdate, company_id: int):
    """
    Updates fields in a rental contract.
    """
    try:
        # Ensure company_id is an integer
        company_id = int(company_id)
        
        # Verify rental belongs to company
        existing_rental = await get_rental_by_id_service(rental_id, company_id)
        if not existing_rental:
            raise HTTPException(status_code=404, detail="Rental not found or access denied")
        
        update_data = payload.model_dump(exclude_none=True)
        update_data["edited_at"] = datetime.now(timezone.utc).isoformat()

        # Remove status field if present as it doesn't exist in the database schema
        if "status" in update_data:
            print("Removing 'status' field from update data as it doesn't exist in database schema")
            del update_data["status"]
        
        # Special handling for "complete" button logic
        if update_data.get("contract_status") == "completed":
            # Contract can only be completed if payment is fully paid
            if existing_rental.get("payment_status") != "paid":
                # Auto-mark as paid when completing
                update_data["payment_status"] = "paid"
                # Set amount_paid to final_price if not already set
                if "amount_paid" not in update_data:
                    update_data["amount_paid"] = existing_rental.get("final_price", 0)
            
            # Mark car as collected if not already collected
            if not existing_rental.get("car_collected", False):
                update_data["car_collected"] = True
                
            # Update car status to available
            try:
                car_id = existing_rental.get("car_id")
                if car_id:
                    # Update car status to available
                    car_update = {"status": "available"}
                    
                    # If mileage_after is provided, update the car's current_mileage
                    if "mileage_after" in update_data and update_data["mileage_after"] is not None:
                        car_update["current_mileage"] = update_data["mileage_after"]
                    elif existing_rental.get("mileage_after") is not None:
                        car_update["current_mileage"] = existing_rental.get("mileage_after")
                        
                    supabase.table("cars").update(car_update).eq("car_id", car_id).eq("company_id", company_id).execute()
            except Exception as e:
                print(f"Warning: Could not update car status: {str(e)}")
                traceback.print_exc()
        
        # Check if we need to calculate contract_status based on payment_status and dates
        elif "payment_status" in update_data:
            payment_status = update_data["payment_status"]
            
            # Determine contract_status based on payment_status
            if payment_status == "cancelled":
                update_data["contract_status"] = "cancelled"
            elif payment_status == "paid":
                # Only mark as completed if end date is today or in the past AND car is collected
                end_date = existing_rental.get("rental_end_date")
                car_collected = existing_rental.get("car_collected", False) or update_data.get("car_collected", False)
                    
                if end_date and car_collected:
                    end_date = datetime.fromisoformat(end_date.replace("Z", "+00:00")).date() if isinstance(end_date, str) else end_date
                    today = datetime.now().date()
                    
                    if end_date <= today:
                        update_data["contract_status"] = "completed"
        
        # Handle car_collected field - update car status if needed
        if "car_collected" in update_data and update_data["car_collected"] is True:
            try:
                car_id = existing_rental.get("car_id")
                
                if car_id:
                    # Update car status to available
                    car_update = {"status": "available"}
                    supabase.table("cars").update(car_update).eq("car_id", car_id).eq("company_id", company_id).execute()
                    print(f"Updated car {car_id} status to available due to car_collected=true")
            except Exception as e:
                print(f"Warning: Could not update car status for car_collected: {str(e)}")
                traceback.print_exc()
        
        # Serialize any date objects to prevent JSON serialization errors
        update_data = serialize_dates(update_data)

        try:
            result = (
                supabase
                .table("rentalrecords")
                .update(update_data)
                .eq("rental_id", rental_id)
                .eq("company_id", company_id)
                .execute()
            )
            
            # Check for errors using getattr
            if getattr(result, "error", None):
                raise HTTPException(status_code=502, detail="Database error")
                
            if not result.data:
                raise HTTPException(status_code=404, detail="Rental not found")
                
            rental_entry = result.data[0]
            
        except Exception as e:
            print(f"Database update error: {str(e)}")
            raise server_error(e, "Unable to update rental", status_code=502)

        # After fetching or updating a rental record, before returning:
        # record['encrypted_contract_id'] = encrypt_id(record['rental_id'])
        # del record['rental_id']

        return rental_entry

    except Exception as e:
        print(f"[UPDATE RENTAL ERROR] {str(e)}")
        traceback.print_exc()  # Add this to see the full error
        raise server_error(e)

async def get_analytics_service(company_id: int):
    """
    Returns analytics summary for dashboard: revenue, active rentals, and popular cars.
    """
    try:
        # Ensure company_id is an integer
        company_id = int(company_id)
        
        rentals_result = supabase.table("rentalrecords").select("*").eq("company_id", company_id).execute()

        if getattr(rentals_result, "error", None):
            raise HTTPException(status_code=502, detail="Unable to fetch rentals")

        rentals = rentals_result.data or []

        # Avoid None in price calculation
        total_revenue = sum(r.get("final_price") or 0 for r in rentals)
        total_rentals = len(rentals)
        
        # Determine active rentals based on rental dates since 'status' field doesn't exist
        # A rental is considered active if the end date is in the future
        today = datetime.now(timezone.utc).date()
        active_rentals = 0
        
        for rental in rentals:
            try:
                end_date_str = rental.get("rental_end_date")
                if end_date_str:
                    end_date = datetime.fromisoformat(end_date_str.replace("Z", "+00:00")).date() 
                    if end_date >= today:
                        active_rentals += 1
            except (ValueError, TypeError):
                # If we can't parse the date, consider it inactive
                pass

        # Count rentals per car
        car_counts = {}
        for r in rentals:
            cid = r.get("car_id")
            if cid:
                car_counts[cid] = car_counts.get(cid, 0) + 1

        # Fetch top 3 cars for this company
        popular_cars = []
        top_car_ids = sorted(car_counts.items(), key=lambda x: x[1], reverse=True)[:3]

        for car_id, count in top_car_ids:
            car_result = (
                supabase
                .table("cars")
                .select("*")
                .eq("car_id", car_id)
                .eq("company_id", company_id)
                .single()
                .execute()
            )

            if not getattr(car_result, "error", None) and car_result.data:
                car = car_result.data
                popular_cars.append({
                    "car": {
                        "_id": car.get("car_id"),
                        "make": car.get("make"),
                        "model": car.get("model"),
                        "year": car.get("year"),
                        "plateNumber": car.get("license_plate"),
                        "rentalRate": {
                            "daily": car.get("daily_rate", 0)
                        }
                    },
                    "count": count
                })

        return {
            "totalRevenue": total_revenue,
            "activeRentals": active_rentals,
            "totalRentals": total_rentals,
            "popularCars": popular_cars
        }

    except Exception as e:
        print(f"[RENTAL ANALYTICS ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to compute analytics")

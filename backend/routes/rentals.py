from fastapi import APIRouter, HTTPException, Query, Form, Body, Depends
from backend.utils.concurrency import offload
from backend.utils.errors import server_error
from fastapi.responses import StreamingResponse
from typing import Optional, List, Dict, Any
from datetime import datetime, date
import io
import re
import asyncio
import traceback

from backend.models.rental import RentalCreate, RentalUpdate, RentalOut
from backend.dependencies import get_current_company_id
from backend.supabase.client import supabase
from backend.services.rental_service import (
    create_rental_service,
    get_all_rentals_service,
    get_rental_by_id_service,
    update_rental_service,
    delete_rental_service,
    get_analytics_service
)
from backend.services.pdf_service import generate_rental_receipt_pdf
import traceback
from backend.utils.aes_utils import decrypt_id, encrypt_id
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/", response_model=RentalOut)
@offload
async def create_rental(
    rental: Dict[str, Any] = Body(...),
    company_id: int = Depends(get_current_company_id)
):
    """
    Create a new rental contract from JSON request body.
    """
    try:
        
        # Parse datetimes from strings if needed (keep as datetime, not date!)
        start_date = rental.get("rental_start_date")
        if isinstance(start_date, str):
            # Parse as datetime and keep timezone info
            start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            
        end_date = rental.get("rental_end_date")
        if isinstance(end_date, str):
            # Parse as datetime and keep timezone info
            end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        
        # ✅ Calculate rental duration and validate
        # For duration calculation, compare dates only
        if isinstance(start_date, datetime) and isinstance(end_date, datetime):
            total_days = (end_date.date() - start_date.date()).days
        else:
            total_days = (end_date - start_date).days
            
        if total_days <= 0:
            raise HTTPException(status_code=400, detail="End date must be after start date")

        # Validate required fields
        car_id = rental.get("car_id")
        client_id = rental.get("client_id")

        if not car_id:
            raise HTTPException(status_code=400, detail="Car ID is required")
        if not client_id:
            raise HTTPException(status_code=400, detail="Client ID is required")

        # Create proper rental data object with datetime objects (not date!)
        rental_data = RentalCreate(
            car_id=int(car_id),
            client_id=int(client_id),
            company_id=company_id,
            rental_start_date=start_date,  # Keep as datetime
            rental_end_date=end_date,      # Keep as datetime
            notes=rental.get("notes"),
            daily_rate=float(rental.get("daily_rate")) if rental.get("daily_rate") is not None else None,
            final_price=float(rental.get("final_price")) if rental.get("final_price") is not None else None,
            amount_paid=float(rental.get("amount_paid", 0.0)),
            mileage_before=int(rental.get("mileage_before", 0)),
            payment_status=rental.get("payment_status", "unpaid"),
            additional_charges=float(rental.get("additional_charges", 0.0)),
            additional_charges_description=rental.get("additional_charges_description", "")
        )

        # Create the rental using the service directly
        result = await create_rental_service(rental_data, company_id)
        
        # Debug values in case of issues
        logger.info("Rental created")
        
        return result

    except Exception as e:
        print(f"[CREATE RENTAL ERROR] {str(e)}")
        traceback.print_exc()
        raise server_error(e)





@router.get("/")  # TEMPORARILY REMOVED response_model to avoid validation errors
@offload
async def get_rentals(
    client_id: Optional[str] = Query(None),
    car_id: Optional[str] = Query(None),
    company_id: int = Depends(get_current_company_id)
):
    """
    Get all rental contracts, optionally filtered by client_id or car_id.
    """
    try:
        filters = {}
        if client_id:
            # Decrypt the encrypted client_id
            try:
                filters["client_id"] = decrypt_id(client_id)
            except Exception as e:
                raise HTTPException(status_code=400, detail="Invalid client_id")
        if car_id:
            try:
                filters["car_id"] = decrypt_id(car_id)
            except Exception as e:
                raise HTTPException(status_code=400, detail="Invalid car_id")

        rentals = await get_all_rentals_service(company_id, filters)
        
        # Add encrypted_rental_id to all rental records in the response
        for rental in rentals:
            if 'rental_id' in rental and rental['rental_id'] is not None:
                rental['encrypted_rental_id'] = encrypt_id(rental['rental_id'])
                del rental['rental_id']
        
        # Add encrypted_car_id to all rental records in the response
        for rental in rentals:
            if 'car_id' in rental:
                rental['encrypted_car_id'] = encrypt_id(rental['car_id'])
        
        return rentals

    except Exception as e:
        print(f"[GET RENTALS ERROR] {str(e)}")
        raise server_error(e)


@router.get("/active")  # TEMPORARILY REMOVED response_model
@offload
async def get_active_rentals(company_id: int = Depends(get_current_company_id)):
    """
    Get all active rental contracts.
    """
    try:
        # Get all rentals for this company
        all_rentals = await get_all_rentals_service(company_id)
        
        # Filter for active rentals based on end date being in future and not cancelled
        today = datetime.now().date()
        active_rentals = []
        
        for rental in all_rentals:
            try:
                end_date_str = rental.get("rental_end_date")
                if end_date_str:
                    end_date = datetime.fromisoformat(end_date_str.replace("Z", "+00:00")).date()
                    if end_date >= today and rental.get("payment_status") != "cancelled":
                        active_rentals.append(rental)
                else:
                    continue  # Skip if no end_date
            except (ValueError, TypeError):
                # Skip rentals with invalid dates
                pass
                
        # Add encrypted_car_id to all active rental records in the response
        for rental in active_rentals:
            if 'car_id' in rental:
                rental['encrypted_car_id'] = encrypt_id(rental['car_id'])
        
        return active_rentals

    except Exception as e:
        print(f"[GET ACTIVE RENTALS ERROR] {str(e)}")
        raise server_error(e)


@router.get("/analytics")
@offload
async def get_rental_analytics(company_id: int = Depends(get_current_company_id)):
    """
    Get aggregated analytics data for rentals (used in dashboard).
    """
    try:
        return await get_analytics_service(company_id)

    except Exception as e:
        print(f"[RENTAL ANALYTICS ERROR] {str(e)}")
        raise server_error(e)


@router.get("/{rental_id}")  # TEMPORARILY REMOVED response_model
@offload
async def get_rental(rental_id: str, company_id: int = Depends(get_current_company_id)):
    """
    Get rental contract by rental ID.
    """
    try:
        decrypted_rental_id = decrypt_id(rental_id)
        rental = await get_rental_by_id_service(decrypted_rental_id, company_id)
        
        # Add encrypted_car_id to the rental record in the response
        if 'car_id' in rental:
            rental['encrypted_car_id'] = encrypt_id(rental['car_id'])
        
        return rental

    except HTTPException:
        raise
    except Exception as e:
        print(f"[GET RENTAL ERROR] {str(e)}")
        raise server_error(e)


@router.put("/{rental_id}")  # TEMPORARILY REMOVED response_model
@offload
async def update_rental(
    rental_id: str,
    rental_update: RentalUpdate = Body(...),
    company_id: int = Depends(get_current_company_id)
):
    """
    Update an existing rental contract with editable fields.
    """
    try:
        decrypted_rental_id = decrypt_id(rental_id)
        updated_rental = await update_rental_service(decrypted_rental_id, rental_update, company_id)
        
        # Add encrypted_car_id to the updated rental record in the response
        if 'car_id' in updated_rental:
            updated_rental['encrypted_car_id'] = encrypt_id(updated_rental['car_id'])
        
        return updated_rental

    except HTTPException:
        raise
    except Exception as e:
        print(f"[UPDATE RENTAL ERROR] {str(e)}")
        raise server_error(e)
    
@router.delete("/{rental_id}")
@offload
async def delete_rental(rental_id: str, company_id: int = Depends(get_current_company_id)):
    """
    Delete a rental contract by rental ID.
    """
    try:
        decrypted_rental_id = decrypt_id(rental_id)
        return await delete_rental_service(decrypted_rental_id, company_id)
    except HTTPException:
        raise
    except Exception as e:
        print(f"[DELETE RENTAL ERROR] {str(e)}")
        raise server_error(e)

@router.get("/{rental_id}/download-receipt")
@offload
async def download_rental_receipt(
    rental_id: str,
    company_id: int = Depends(get_current_company_id),
    lang: Optional[str] = Query("en", description="Language code for PDF content (en or ar)"),
    currency_symbol: Optional[str] = Query("$"),
    daily_rate_display: Optional[str] = Query(None),
    additional_charges_display: Optional[str] = Query(None),
    final_price_display: Optional[str] = Query(None),
    amount_paid_display: Optional[str] = Query(None),
    mileage_before_display: Optional[str] = Query(None),
    mileage_after_display: Optional[str] = Query(None),
    total_distance_display: Optional[str] = Query(None)
):
    """
    Generate and download a PDF receipt for a rental contract.
    """
    try:
        decrypted_rental_id = decrypt_id(rental_id)
        # Get rental data
        rental = await get_rental_by_id_service(decrypted_rental_id, company_id)
        if not rental:
            raise HTTPException(status_code=404, detail="Rental not found")
        
        # Add currency and display amounts to rental data for PDF generation
        rental["currency_symbol"] = currency_symbol
        # Add raw rental_id for PDF display (user should see the actual ID)
        rental["rental_id"] = decrypted_rental_id
        if daily_rate_display is not None:
            rental["daily_rate_display"] = daily_rate_display
        if additional_charges_display is not None:
            rental["additional_charges_display"] = additional_charges_display
        if final_price_display is not None:
            rental["final_price_display"] = final_price_display
        if amount_paid_display is not None:
            rental["amount_paid_display"] = amount_paid_display
        if mileage_before_display is not None:
            rental["mileage_before_display"] = mileage_before_display
        if mileage_after_display is not None:
            rental["mileage_after_display"] = mileage_after_display
        if total_distance_display is not None:
            rental["total_distance_display"] = total_distance_display
        
        # Get client data WITHOUT using or exposing client_id
        client_data = None
        try:
            encrypted_client_id = rental.get('encrypted_client_id')
            if encrypted_client_id:
                client_id = decrypt_id(encrypted_client_id)
                client_result = supabase.table("clients").select("name", "phone_number").eq(
                    "client_id", client_id
                ).eq("company_id", company_id).single().execute()
                if client_result.data:
                    client_data = client_result.data
        except Exception:
            client_data = None
        
        # Get car data - use encrypted_car_id if available, otherwise use car_id
        car_id_to_use = rental.get("car_id")
        if not car_id_to_use and rental.get("encrypted_car_id"):
            car_id_to_use = decrypt_id(rental["encrypted_car_id"])
        
        car_result = supabase.table("cars").select("*").eq(
            "car_id", car_id_to_use
        ).eq("company_id", company_id).single().execute()
        
        if not car_result.data:
            raise HTTPException(status_code=404, detail="Car not found")
        car_data = car_result.data
        
        # Get company data (optional) - better error handling
        company_data = None
        try:
            company_result = supabase.table("companies").select("*").eq(
                "company_id", company_id
            ).single().execute()
            if company_result.data:
                company_data = company_result.data
            else:
                # If company not found, create a fallback
                company_data = {
                    "company_id": company_id,
                    "company_name": "Rentyl",
                    "name": "Rentyl"
                }
        except Exception as e:
            print(f"Company lookup failed for ID {company_id}: {str(e)}")
            # Create fallback company data
            company_data = {
                "company_id": company_id,
                "company_name": "Rentyl",
                "name": "Rentyl"
            }
        
        # Generate PDF
        # ReportLab is CPU-bound and synchronous: build the PDF off the event loop
        pdf_buffer = await asyncio.to_thread(
            generate_rental_receipt_pdf, rental, client_data, car_data, company_data, lang
        )
        
        # Create filename
        client_name = (client_data.get('name', 'Unknown').replace(' ', '_') if client_data else 'Unknown')
        # HTTP headers are latin-1 and the frontend parses `filename=` as-is: keep
        # an ASCII-only name (non-Latin names such as Arabic used to crash the
        # response with a header encoding error).
        ascii_name = re.sub(r'[^A-Za-z0-9_.-]', '', client_name) or 'client'
        filename = f"rental_receipt_{decrypted_rental_id}_{ascii_name}.pdf"
        
        # Return PDF as streaming response
        # Don't read from buffer, just pass it directly
        pdf_buffer.seek(0)  # Reset buffer position
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[DOWNLOAD RECEIPT ERROR] {str(e)}")
        traceback.print_exc()
        raise server_error(e)
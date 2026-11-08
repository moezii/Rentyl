# backend/services/car_service.py - FIXED Oil Change Handling
from typing import Optional
from backend.models.car import CarCreate
from backend.supabase.client import supabase
from backend.config import BUCKET_NAME
from uuid import uuid4
from datetime import datetime, date, timezone
import os
import traceback
from backend.utils.date_utils import serialize_dates, serialize_date
from backend.utils.aes_utils import encrypt_id
from backend.utils.file_validation import validate_image_file, get_safe_filename, FileValidationError
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)


def _validated_car_image(image):
    """Validate an uploaded car image (type, size, magic bytes).

    Returns ``(content, filename)`` with a server-generated filename, or ``None``
    when no image was sent. Raises HTTPException(400) for an invalid file so it
    is never written to the public bucket.
    """
    if not image or not getattr(image, "filename", None):
        return None
    try:
        content = validate_image_file(image)
        return content, f"car_{get_safe_filename(image.filename)}"
    except FileValidationError as e:
        raise HTTPException(status_code=400, detail=f"File validation failed: {e}")

async def update_car_service(car_id: str, car_data: dict, image, company_id: int):
    try:
        print(f"\n==== Starting car update process for car_id: {car_id} ====\n")
        print(f"Image provided: {image is not None}")
        print(f"Company ID: {company_id}")
        
        # First verify car belongs to company
        car = await get_car_by_id_service(car_id, company_id)
        if not car:
            raise Exception(f"Car not found or access denied")
        
        # Handle image upload if provided
        image_url = None
        validated = _validated_car_image(image)
        if validated:
            try:
                image_bytes, filename = validated

                upload_response = supabase.storage.from_(BUCKET_NAME).upload(
                    path=filename,
                    file=image_bytes,
                    file_options={"content-type": image.content_type}
                )
                
                image_url = supabase.storage.from_(BUCKET_NAME).get_public_url(filename)
                print(f"New image uploaded: {image_url}")
            except Exception as e:
                print(f"Error uploading image: {str(e)}")
                traceback.print_exc()
        
        # Create a copy of the update data
        update_data = dict(car_data)
        
        # Handle oil change tracking fields specifically
        oil_change_tracking = update_data.get('oil_change_tracking')
        last_oil_change_mileage = update_data.get('last_oil_change_mileage')
        oil_change_interval = update_data.get('oil_change_interval')
        
        print(f"Oil change fields received:")
        print(f"  - oil_change_tracking: {oil_change_tracking}")
        print(f"  - last_oil_change_mileage: {last_oil_change_mileage}")
        print(f"  - oil_change_interval: {oil_change_interval}")
        
        # Convert oil change fields to proper types
        if oil_change_tracking is not None:
            update_data['oil_change_tracking'] = oil_change_tracking == 'true' or oil_change_tracking is True
        
        if last_oil_change_mileage is not None:
            try:
                update_data['last_oil_change_mileage'] = int(last_oil_change_mileage)
                print(f"Converted last_oil_change_mileage to: {update_data['last_oil_change_mileage']}")
            except (ValueError, TypeError):
                print(f"Could not convert last_oil_change_mileage: {last_oil_change_mileage}")
                update_data['last_oil_change_mileage'] = None
        
        if oil_change_interval is not None:
            try:
                update_data['oil_change_interval'] = int(oil_change_interval)
                print(f"Converted oil_change_interval to: {update_data['oil_change_interval']}")
            except (ValueError, TypeError):
                print(f"Could not convert oil_change_interval: {oil_change_interval}")
                # Don't set a default here - use what the user specified
                update_data['oil_change_interval'] = 10000  # Only as absolute fallback
        
        # Add image URL if uploaded
        if image_url:
            update_data["image_url"] = image_url
            print(f"Added image_url to update_data: {image_url}")
        
        # Add timestamp
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        # Serialize dates
        update_data = serialize_dates(update_data)
        
        # Execute the update
        print(f"Executing update for car_id: {car_id}, company_id: {company_id}")
        result = supabase.table("cars").update(update_data).eq("car_id", car_id).eq("company_id", company_id).execute()
        
        if getattr(result, "error", None):
            print(f"Error in update: {getattr(result, 'error', None)}")
            raise Exception(f"Database error: {getattr(result.error, 'message', str(result.error))}")
        
        print(f"Update successful")
        
        # Fetch the complete updated car data to return
        print(f"Fetching updated car data for car_id: {car_id}")
        updated_car = await get_car_by_id_service(car_id, company_id)
        
        return {"message": "Car updated successfully", "data": updated_car}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating car: {str(e)}")
        traceback.print_exc()
        raise Exception(f"Failed to update car: {str(e)}")

async def get_car_by_id_service(car_id: str, company_id: int):
    if not car_id or car_id in ("null", "undefined"):
        return None
    try:
        result = supabase.table("cars").select("*").eq("car_id", car_id).eq("company_id", company_id).single().execute()
        if getattr(result, "error", None):
            raise Exception(f"Database error: {getattr(result.error, 'message', str(result.error))}")
        if not result.data:
            return None
        
        car = result.data
        
        # Return formatted car data with proper type conversion
        return {
            "encrypted_car_id": encrypt_id(car.get("car_id") or car.get("id") or ""),
            "make": car.get("make", ""),
            "model": car.get("model", ""),
            "year": car.get("year"),
            "color": car.get("color", ""),
            "license_plate": car.get("license_plate"),
            "type": car.get("type", ""),
            "status": car.get("status", "available"),
            "current_mileage": car.get("current_mileage", 0),
            "daily_rate": car.get("daily_rate", 0),
            "weekly_rate": car.get("weekly_rate"),
            "monthly_rate": car.get("monthly_rate"),
            "image_url": car.get("image_url", ""),
            "description": car.get("description", ""),
            "company_id": car.get("company_id"),
            "vin": car.get("vin", ""),
            "registration_expiry_date": car.get("registration_expiry_date"),
            "insurance_expiry_date": car.get("insurance_expiry_date"),
            # Oil change tracking fields with proper type conversion
            "oil_change_tracking": bool(car.get("oil_change_tracking", False)),
            "oil_change_interval": int(car.get("oil_change_interval") or 10000),
            "last_oil_change_mileage": int(car.get("last_oil_change_mileage") or 0) if car.get("last_oil_change_mileage") else None
        }
    except Exception as e:
        print(f"Error fetching car: {str(e)}")
        traceback.print_exc()
        raise Exception(f"Error fetching car: {str(e)}")

async def get_all_cars_service(company_id: int):
    try:
        print(f"Fetching cars for company {company_id}")
        result = supabase.table("cars").select("*").eq("company_id", company_id).execute()
        
        if getattr(result, "error", None):
            raise Exception(f"Database error: {result.error}")
        
        if not result.data:
            return []
            
        cars = []
        for car in result.data:
            license_plate = car.get("license_plate") or car.get("plate_number") or car.get("plateNumber")
            
            car_data = {
                "car_id": car.get("car_id"),  # Include integer car_id for internal operations
                "encrypted_car_id": encrypt_id(car.get("car_id")),
                "make": car.get("make", ""),
                "model": car.get("model", ""),
                "year": car.get("year"),
                "color": car.get("color", ""),
                "license_plate": license_plate,
                "type": car.get("type", ""),
                "status": car.get("status", "available"),
                "current_mileage": car.get("current_mileage", 0),
                "daily_rate": car.get("daily_rate", 0),
                "weekly_rate": car.get("weekly_rate"),
                "monthly_rate": car.get("monthly_rate"),
                "image_url": car.get("image_url", ""),
                "description": car.get("description", ""),
                "company_id": car.get("company_id"),
                "vin": car.get("vin", ""),
                "registration_expiry_date": car.get("registration_expiry_date"),
                "insurance_expiry_date": car.get("insurance_expiry_date"),
                # Oil change tracking fields with proper type conversion
                "oil_change_tracking": bool(car.get("oil_change_tracking", False)),
                "oil_change_interval": int(car.get("oil_change_interval") or 10000),
                "last_oil_change_mileage": int(car.get("last_oil_change_mileage") or 0) if car.get("last_oil_change_mileage") else None
            }
            cars.append(car_data)
            
        return cars
    except Exception as e:
        raise Exception(f"Error fetching cars: {str(e)}")

# Add other existing functions from the original file...
async def create_car_service(car: CarCreate, image, company_id: int, weekly_rate: Optional[float] = None, monthly_rate: Optional[float] = None):
    try:
        # Handle image upload first
        image_url = None
        validated = _validated_car_image(image)
        if validated:
            try:
                image_bytes, filename = validated
                logger.debug("Uploading image %s (%d bytes) to bucket %s", filename, len(image_bytes), BUCKET_NAME)

                upload_response = supabase.storage.from_(BUCKET_NAME).upload(
                    path=filename,
                    file=image_bytes,
                    file_options={"content-type": image.content_type}
                )

                image_url = supabase.storage.from_(BUCKET_NAME).get_public_url(filename)
            except Exception as e:
                print(f"Error during image upload: {str(e)}")
                traceback.print_exc()

        # Prepare car data
        car_dict = car.model_dump()

        valid_data = {
            "make": car_dict.get("make"),
            "model": car_dict.get("model"),
            "year": car_dict.get("year"),
            "color": car_dict.get("color"),
            "license_plate": car_dict.get("license_plate"),
            "type": car_dict.get("type"),
            "status": car_dict.get("status"),
            "current_mileage": car_dict.get("current_mileage"),
            "daily_rate": car_dict.get("daily_rate"),
            "weekly_rate": weekly_rate,
            "monthly_rate": monthly_rate,
            "registration_expiry_date": car_dict.get("registration_expiry_date"),
            "insurance_expiry_date": car_dict.get("insurance_expiry_date"),
            "vin": car_dict.get("vin"),
            "created_by": car_dict.get("created_by"),
            "description": car_dict.get("description"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "image_url": image_url,
            "company_id": company_id,
            # Initialize oil change tracking fields
            "oil_change_tracking": False,
            "oil_change_interval": 10000,
            "last_oil_change_mileage": None
        }

        # Remove fields with None values
        valid_data = {k: v for k, v in valid_data.items() if v is not None}
        
        # Serialize any date objects
        valid_data = serialize_dates(valid_data)


        # Insert into Supabase
        result = supabase.table("cars").insert(valid_data).execute()
        logger.debug("Car insert returned %d row(s)", len(result.data or []))

        if result.data:
            logger.info("Car created successfully")
            if image_url and result.data[0].get("image_url") != image_url:
                print(f"Warning: Mismatch! DB image URL = {result.data[0].get('image_url')}, Expected = {image_url}")
        else:
            print("Car created but no data returned from the database")

        return {"message": "Car created successfully", "data": result.data, "image_url": image_url}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating car: {str(e)}")
        traceback.print_exc()
        raise Exception(f"Error creating car: {str(e)}")

async def check_car_quota_service(company_id: int):
    """
    Check the car quota for a company.
    Returns: { car_quota: int, current_cars: int, has_quota: bool }
    """
    try:
        print(f"[QUOTA CHECK] Checking quota for company_id: {company_id}")
        
        # 1. Get company's car_quota
        company_result = supabase.table("companies").select("car_quota").eq("company_id", company_id).single().execute()
        
        if getattr(company_result, "error", None) or not company_result.data:
            print(f"[QUOTA CHECK] Company not found or error: {getattr(company_result, 'error', 'No data')}")
            raise Exception(f"Company not found")
        
        car_quota = company_result.data.get("car_quota", 10)
        print(f"[QUOTA CHECK] Company car_quota: {car_quota}")
        
        # 2. Count current cars for this company
        # Simply get all cars and count them - most reliable method
        print(f"[QUOTA CHECK] Counting cars for company_id: {company_id}")
        cars_result = supabase.table("cars").select("car_id").eq("company_id", company_id).execute()
        
        if getattr(cars_result, "error", None):
            print(f"[QUOTA CHECK] Error counting cars: {cars_result.error}")
            raise Exception(f"Error counting cars: {cars_result.error}")
        
        # Count the actual number of cars returned
        current_cars = len(cars_result.data) if cars_result.data else 0
        print(f"[QUOTA CHECK] Current cars count: {current_cars}")
        
        # Determine if quota is available
        has_quota = current_cars < car_quota
        
        result = {
            "car_quota": car_quota,
            "current_cars": current_cars,
            "has_quota": has_quota
        }
        
        print(f"[QUOTA CHECK] Final result: {result}")
        return result
        
    except Exception as e:
        print(f"[QUOTA CHECK ERROR] {str(e)}")
        traceback.print_exc()
        raise Exception(f"Error checking car quota: {str(e)}")

async def delete_car_service(car_id: str, company_id: int):
    try:
        # Verify car belongs to company
        car = await get_car_by_id_service(car_id, company_id)
        if not car:
            raise Exception(f"Car not found or access denied")
            
        # Delete associated image if exists
        if car.get("image_url"):
            try:
                filename = car["image_url"].split("/")[-1]
                supabase.storage.from_(BUCKET_NAME).remove([filename])
            except Exception as e:
                print(f"Warning: Could not delete image: {str(e)}")
                
        # Delete the car
        result = supabase.table("cars").delete().eq("car_id", car_id).eq("company_id", company_id).execute()
        return {"message": "Car deleted successfully"}
        
    except Exception as e:
        raise Exception(f"Error deleting car: {str(e)}")
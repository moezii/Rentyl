from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form, Depends
from backend.utils.concurrency import offload
from backend.utils.errors import server_error
from typing import Optional
from datetime import datetime

from backend.models.car import CarCreate
from backend.services.car_service import (
    create_car_service,
    get_all_cars_service,
    get_car_by_id_service,
    update_car_service,
    delete_car_service,
    check_car_quota_service
)
import traceback
import asyncio
import logging
from backend.controllers.car_controller import CarController
from backend.dependencies import get_current_user_with_company
from backend.utils.aes_utils import encrypt_id, decrypt_id
from backend.utils.file_validation import FileValidationError

router = APIRouter()
logger = logging.getLogger(__name__)

# backend/routes/cars.py - Simplified car creation route
# backend/routes/cars.py - Update car creation route

@router.get("/check-quota")
@offload
async def check_car_quota(user_context: dict = Depends(get_current_user_with_company)):
    """
    Check the car quota for the current company.
    Returns: { car_quota: 10, current_cars: 7, has_quota: true }
    """
    try:
        company_id = user_context["company_id"]
        quota_info = await check_car_quota_service(company_id)
        return quota_info
    except Exception as e:
        print(f"[QUOTA CHECK ERROR] {str(e)}")
        traceback.print_exc()
        raise server_error(e, "Failed to check quota")

@router.post("/")
@offload
async def create_car(
    make: str = Form(...),
    model: str = Form(...),
    year: int = Form(...),
    color: str = Form(...),
    license_plate: str = Form(...),
    type: str = Form(...),
    status: str = Form("available"),
    current_mileage: int = Form(0),
    daily_rate: float = Form(...),
    weekly_rate: Optional[float] = Form(None),
    monthly_rate: Optional[float] = Form(None),
    description: Optional[str] = Form(None),
    registration_expiry_date: Optional[str] = Form(None),
    insurance_expiry_date: Optional[str] = Form(None),
    vin: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    user_context: dict = Depends(get_current_user_with_company)
):
    try:
        print("[CREATE] Raw input received")
        print(f"Type received: {type}")
        
        # Check quota FIRST before any validation
        company_id = user_context["company_id"]
        quota_info = await check_car_quota_service(company_id)
        
        if not quota_info["has_quota"]:
            raise HTTPException(
                status_code=403,
                detail=f"Quota limit reached. Please upgrade your plan to add more cars. (Current: {quota_info['current_cars']}/{quota_info['car_quota']})"
            )
        
        # Validate required fields
        if not all([make, model, year, color, license_plate, type, daily_rate]):
            raise HTTPException(
                status_code=400,
                detail="Missing required fields. Please provide all required information."
            )
            
        # Validate year
        current_year = datetime.now().year
        if not (1900 <= year <= current_year + 1):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid year. Must be between 1900 and {current_year + 1}"
            )
            
        # Validate daily rate
        if daily_rate <= 0:
            raise HTTPException(
                status_code=400,
                detail="Daily rate must be greater than 0"
            )
            
        # Validate car type
        valid_types = ["sedan", "suv", "hatchback", "coupe", "convertible", "van", "truck"]
        if type.lower() not in valid_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid car type. Must be one of: {', '.join(valid_types)}"
            )
        
        # Create car data (without weekly/monthly rates in the model)
        car_data = CarCreate(
            make=make,
            model=model,
            year=year,
            color=color,
            license_plate=license_plate,
            type=type,
            status=status,
            current_mileage=current_mileage,
            daily_rate=daily_rate,
            description=description,
            registration_expiry_date=registration_expiry_date,
            insurance_expiry_date=insurance_expiry_date,
            vin=vin
        )

        # Pass weekly_rate and monthly_rate separately to the service
        result = await CarController.create_car(car_data, image, user_context, weekly_rate, monthly_rate)

        # Add encrypted_car_id to the response
        if result and 'data' in result and result['data'] and len(result['data']) > 0:
            car_id = result['data'][0].get('car_id')
            if car_id:
                result['data'][0]['encrypted_car_id'] = encrypt_id(car_id)

        return result
    except HTTPException as he:
        raise he
    except FileValidationError as fve:
        # Handle file validation errors with specific error messages
        raise HTTPException(
            status_code=400,
            detail=f"File validation failed: {str(fve)}"
        )
    except Exception as e:
        print(f"[CREATE ERROR] {str(e)}")
        traceback.print_exc()
        raise server_error(e, "Failed to create car")

# Car fields shown on the public booking pages (BookPage / BookingPage). Internal
# IDs, VIN, plate, mileage, document expiry and oil-change data stay private.
# (The pages fall back to defaults for transmission / fuel type / seats, which
# are not columns of the cars table.)
PUBLIC_CAR_FIELDS = (
    "make", "model", "year", "color", "type", "image_url",
    "daily_rate", "weekly_rate", "monthly_rate",
)
PUBLIC_COMPANY_FIELDS = ("city", "province", "country", "currency", "delivery_offered")
AVAILABILITY_CHECK_CONCURRENCY = 8


@router.get("/public/available")
@offload
async def get_public_available_cars(start_date: Optional[str] = None, end_date: Optional[str] = None):
    """Public endpoint to get available cars for booking (no authentication required)

    If start_date and end_date are provided, only returns cars that are available during that period.
    Uses the same availability check logic as the booking system.
    """
    try:
        from backend.services.booking_service import booking_service
        from backend.supabase.client import supabase as public_supabase

        # Get all cars with status='available' from all companies. The client is
        # the server-side (service-role) one, so select only what may be shown
        # publicly plus the IDs needed for availability and company data.
        response = public_supabase.table('cars').select(
            'car_id, company_id, ' + ', '.join(PUBLIC_CAR_FIELDS)
        ).eq('status', 'available').execute()

        if not response.data:
            return []

        cars = [car for car in response.data if car.get('car_id')]

        # If dates are provided, filter cars with the SAME availability check as
        # bookings (the check_car_availability_secure RPC). It works per car, so
        # the checks run concurrently instead of one after another.
        if start_date and end_date:
            limit = asyncio.Semaphore(AVAILABILITY_CHECK_CONCURRENCY)

            def check(car_id):
                return asyncio.run(booking_service.check_availability(encrypt_id(car_id), start_date, end_date))

            async def is_available(car):
                async with limit:
                    try:
                        result = await asyncio.to_thread(check, car['car_id'])
                        return bool(result.get('available'))
                    except Exception as e:
                        # If check fails for this car, skip it (treat as unavailable)
                        logger.warning("Availability check failed for a car: %s", e)
                        return False

            flags = await asyncio.gather(*(is_available(car) for car in cars))
            available_cars = [car for car, ok in zip(cars, flags) if ok]
        else:
            # No dates provided, return all cars with status='available'
            available_cars = cars

        # Fetch company data for all companies in one query
        company_ids = sorted({car.get('company_id') for car in available_cars if car.get('company_id')})
        company_info = {}
        if company_ids:
            companies_response = public_supabase.table('companies').select(
                'company_id, ' + ', '.join(PUBLIC_COMPANY_FIELDS)
            ).in_('company_id', company_ids).execute()
            for company in companies_response.data or []:
                if company.get('company_id'):
                    company_info[company['company_id']] = company

        # Format the response: whitelisted fields only
        formatted_cars = []
        for car in available_cars:
            public_car = {field: car.get(field) for field in PUBLIC_CAR_FIELDS if field in car}
            public_car['encrypted_car_id'] = encrypt_id(car['car_id'])
            company = company_info.get(car.get('company_id'))
            if company:
                for field in PUBLIC_COMPANY_FIELDS:
                    public_car[field] = company.get(field)
                public_car['delivery_offered'] = bool(company.get('delivery_offered', False))
            formatted_cars.append(public_car)

        return formatted_cars
    except Exception as e:
        print(f"Error fetching public available cars: {str(e)}")
        traceback.print_exc()
        raise server_error(e, "Failed to fetch available cars")

@router.get("/")
@offload
async def get_all_cars(user_context: dict = Depends(get_current_user_with_company)):
    return await CarController.get_all_cars(user_context)

@router.get("/{car_id}")
@offload
async def get_car_by_id(car_id: str, user_context: dict = Depends(get_current_user_with_company)):
    try:
        decrypted_car_id = decrypt_id(car_id)
        car = await CarController.get_car_by_id(decrypted_car_id, user_context)
        if car and 'car_id' in car:
            car['encrypted_car_id'] = encrypt_id(car['car_id'])
            # Keep car_id for internal use
        return car
    except HTTPException as he:
        # Client errors (400/403/404) pass through; anything else keeps the
        # previous behaviour of answering 400 "Invalid car ID".
        if he.status_code < 500:
            raise
        raise HTTPException(status_code=400, detail="Invalid car ID")
    except Exception:
        # Same message for every failure (bad base64/padding/DB error) so the
        # response can't be used as a padding oracle on the encrypted ID.
        raise HTTPException(status_code=400, detail="Invalid car ID")

async def _update_car_logic(
    car_id: str,
    make: str,
    model: str,
    year: int,
    color: str,
    license_plate: str,
    type: str,
    status: str,
    current_mileage: int,
    daily_rate: float,
    weekly_rate: Optional[float],
    monthly_rate: Optional[float],
    description: Optional[str],
    registration_expiry_date: Optional[str],
    insurance_expiry_date: Optional[str],
    vin: Optional[str],
    oil_change_tracking: Optional[str],
    last_oil_change_mileage: Optional[str],
    oil_change_interval: Optional[str],
    image: Optional[UploadFile],
    user_context: dict
):
    """Shared logic for update car endpoints"""
    try:
        decrypted_car_id = decrypt_id(car_id)
        car_data = {
            "make": make,
            "model": model,
            "year": year,
            "color": color,
            "license_plate": license_plate,
            "type": type,
            "status": status,
            "current_mileage": current_mileage,
            "daily_rate": daily_rate,
            "weekly_rate": weekly_rate,
            "monthly_rate": monthly_rate,
            "description": description,
            "registration_expiry_date": registration_expiry_date,
            "insurance_expiry_date": insurance_expiry_date,
            "vin": vin,
            "oil_change_tracking": oil_change_tracking,
            "last_oil_change_mileage": last_oil_change_mileage,
            "oil_change_interval": oil_change_interval
        }
        result = await CarController.update_car(decrypted_car_id, car_data, image, user_context)
        if result and 'car_id' in result:
            result['encrypted_car_id'] = encrypt_id(result['car_id'])
            # Keep car_id for internal use
        return result
    except FileValidationError as fve:
        # Handle file validation errors with specific error messages
        raise HTTPException(
            status_code=400,
            detail=f"File validation failed: {str(fve)}"
        )
    except HTTPException as he:
        if he.status_code < 500:
            raise
        raise HTTPException(status_code=400, detail="Invalid car ID")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid car ID")

@router.put("/{car_id}/")
@offload
async def update_car_with_slash(
    car_id: str,
    make: str = Form(...),
    model: str = Form(...),
    year: int = Form(...),
    color: str = Form(...),
    license_plate: str = Form(...),
    type: str = Form(...),
    status: str = Form(...),
    current_mileage: int = Form(...),
    daily_rate: float = Form(...),
    weekly_rate: Optional[float] = Form(None),
    monthly_rate: Optional[float] = Form(None),
    description: Optional[str] = Form(None),
    registration_expiry_date: Optional[str] = Form(None),
    insurance_expiry_date: Optional[str] = Form(None),
    vin: Optional[str] = Form(None),
    oil_change_tracking: Optional[str] = Form(None),
    last_oil_change_mileage: Optional[str] = Form(None),
    oil_change_interval: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    user_context: dict = Depends(get_current_user_with_company)
):
    return await _update_car_logic(
        car_id, make, model, year, color, license_plate, type, status,
        current_mileage, daily_rate, weekly_rate, monthly_rate, description, registration_expiry_date,
        insurance_expiry_date, vin, oil_change_tracking, last_oil_change_mileage,
        oil_change_interval, image, user_context
    )

@router.put("/{car_id}")
@offload
async def update_car_without_slash(
    car_id: str,
    make: str = Form(...),
    model: str = Form(...),
    year: int = Form(...),
    color: str = Form(...),
    license_plate: str = Form(...),
    type: str = Form(...),
    status: str = Form(...),
    current_mileage: int = Form(...),
    daily_rate: float = Form(...),
    weekly_rate: Optional[float] = Form(None),
    monthly_rate: Optional[float] = Form(None),
    description: Optional[str] = Form(None),
    registration_expiry_date: Optional[str] = Form(None),
    insurance_expiry_date: Optional[str] = Form(None),
    vin: Optional[str] = Form(None),
    oil_change_tracking: Optional[str] = Form(None),
    last_oil_change_mileage: Optional[str] = Form(None),
    oil_change_interval: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    user_context: dict = Depends(get_current_user_with_company)
):
    return await _update_car_logic(
        car_id, make, model, year, color, license_plate, type, status,
        current_mileage, daily_rate, weekly_rate, monthly_rate, description, registration_expiry_date,
        insurance_expiry_date, vin, oil_change_tracking, last_oil_change_mileage,
        oil_change_interval, image, user_context
    )
    
@router.delete("/{car_id}")
@offload
async def delete_car(car_id: str, user_context: dict = Depends(get_current_user_with_company)):
    try:
        decrypted_car_id = decrypt_id(car_id)
        return await CarController.delete_car(decrypted_car_id, user_context)
    except HTTPException as he:
        if he.status_code < 500:
            raise
        raise HTTPException(status_code=400, detail="Invalid car ID")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid car ID")

# backend/routes/maintenance.py
import traceback
from fastapi import APIRouter, HTTPException, Depends
from backend.utils.errors import server_error
from backend.models.maintenance import MaintenanceCreate, MaintenanceUpdate
from backend.services.maintenance_service import (
    create_maintenance_service,
    get_maintenance_by_car_id_service,
    update_maintenance_service,
    delete_maintenance_service,
    get_all_maintenance_service
)
from backend.dependencies import get_current_company_id
from backend.utils.aes_utils import encrypt_id, decrypt_id

router = APIRouter()

# Get all maintenance records
@router.get("/")
def get_all_maintenance(company_id: int = Depends(get_current_company_id)):
    """Get all maintenance records for the company"""
    try:
        records = get_all_maintenance_service(company_id)
        # Add encrypted_car_id to each record
        for record in records:
            if 'car_id' in record:
                record['encrypted_car_id'] = encrypt_id(record['car_id'])
        return {"data": records}
    except Exception as e:
        print(f"Error in get_all_maintenance: {str(e)}")
        traceback.print_exc()
        raise server_error(e)

# Create a new maintenance record
@router.post("/")
def create_maintenance(payload: MaintenanceCreate, company_id: int = Depends(get_current_company_id)):
    """Create a new maintenance record"""
    try:
        return create_maintenance_service(payload, company_id)
    except Exception as e:
        print(f"Error in create_maintenance: {str(e)}")
        traceback.print_exc()
        raise server_error(e)

# Get maintenance records for a specific car
@router.get("/car/{car_id}")
def get_maintenance_for_car(car_id: str, company_id: int = Depends(get_current_company_id)):
    """Get all maintenance records for a specific car"""
    try:
        try:
            decrypted_car_id = decrypt_id(car_id)
        except Exception as e:
            raise HTTPException(status_code=400, detail="Invalid car_id")
        maintenance_records = get_maintenance_by_car_id_service(decrypted_car_id, company_id)
        return {"data": maintenance_records}
    except Exception as e:
        print(f"Error in get_maintenance_for_car: {str(e)}")
        traceback.print_exc()
        raise server_error(e)
    
# Update a maintenance record
@router.put("/{maintenance_id}")
def update_maintenance(maintenance_id: str, payload: MaintenanceUpdate, company_id: int = Depends(get_current_company_id)):
    """Update an existing maintenance record"""
    try:
        try:
            decrypted_maintenance_id = decrypt_id(maintenance_id)
        except Exception as e:
            raise HTTPException(status_code=400, detail="Invalid maintenance_id")
        result = update_maintenance_service(decrypted_maintenance_id, payload, company_id)
        if result and 'maintenance_id' in result:
            result['encrypted_maintenance_id'] = encrypt_id(result['maintenance_id'])
            del result['maintenance_id']
        return result
    except Exception as e:
        print(f"Error in update_maintenance: {str(e)}")
        traceback.print_exc()
        raise server_error(e)

# Delete a maintenance record
@router.delete("/{maintenance_id}")
def delete_maintenance(maintenance_id: str, company_id: int = Depends(get_current_company_id)):
    """Delete a maintenance record"""
    try:
        try:
            decrypted_maintenance_id = decrypt_id(maintenance_id)
        except Exception as e:
            raise HTTPException(status_code=400, detail="Invalid maintenance_id")
        return delete_maintenance_service(decrypted_maintenance_id, company_id)
    except Exception as e:
        print(f"Error in delete_maintenance: {str(e)}")
        traceback.print_exc()
        raise server_error(e)
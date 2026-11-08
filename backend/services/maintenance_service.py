import traceback
from backend.supabase.client import supabase
from backend.models.maintenance import MaintenanceCreate, MaintenanceUpdate
from datetime import datetime, date, timezone
from backend.utils.date_utils import serialize_dates
from backend.utils.aes_utils import encrypt_id
import logging

logger = logging.getLogger(__name__)

def get_all_maintenance_service(company_id: int):
    try:
        print(f"Fetching maintenance records for company {company_id}")
        result = supabase.table("maintenancerecords").select("*").eq("company_id", company_id).order("maintenance_date", desc=True).execute()
        
        if not result.data:
            return []
            
        # Get unique car IDs for this company's maintenance records
        car_ids = list(set(record["car_id"] for record in result.data))
        
        # Fetch car details for company cars only
        cars_result = supabase.table("cars").select("*").in_("car_id", car_ids).eq("company_id", company_id).execute()
        cars_dict = {car["car_id"]: car for car in (cars_result.data or [])}
        
        # Add car details to each maintenance record and encrypt maintenance_id
        for record in result.data:
            car_id = record["car_id"]
            if car_id in cars_dict:
                record["car"] = cars_dict[car_id]
            else:
                record["car"] = None
            
            # Add encrypted_maintenance_id and remove raw maintenance_id
            record["encrypted_maintenance_id"] = encrypt_id(record["maintenance_id"])
            del record["maintenance_id"]
                
        return result.data
    except Exception as e:
        print(f"Error fetching maintenance records for company {company_id}: {str(e)}")
        return []

def get_maintenance_by_car_id_service(car_id: int, company_id: int):
    try:
        print(f"Fetching maintenance for car {car_id} in company {company_id}")
        
        # Verify car belongs to company
        car_result = supabase.table("cars").select("*").eq("car_id", car_id).eq("company_id", company_id).single().execute()
        if not car_result.data:
            print(f"Car {car_id} not found or access denied for company {company_id}")
            return []
        
        # Get maintenance records
        result = supabase.table("maintenancerecords").select("*").eq("car_id", car_id).eq("company_id", company_id).order("maintenance_date", desc=True).execute()
        
        if not result.data:
            return []
            
        # Add car details to each record and encrypt maintenance_id
        for record in result.data:
            record["car"] = car_result.data
            # Add encrypted_maintenance_id and remove raw maintenance_id
            record["encrypted_maintenance_id"] = encrypt_id(record["maintenance_id"])
            del record["maintenance_id"]
            
        return result.data
    except Exception as e:
        print(f"Error fetching maintenance records: {str(e)}")
        return []

def update_maintenance_service(maintenance_id: int, payload: MaintenanceUpdate, company_id: int):
    try:
        print(f"Updating maintenance record {maintenance_id} for company {company_id}")
        
        # Verify maintenance record belongs to company
        existing_result = supabase.table("maintenancerecords").select("*").eq("maintenance_id", maintenance_id).eq("company_id", company_id).single().execute()
        if not existing_result.data:
            raise Exception("Maintenance record not found or access denied")
        
        # Get the car_id from the existing record if not provided in payload
        car_id = payload.car_id if hasattr(payload, 'car_id') and payload.car_id else existing_result.data.get('car_id')
        
        # Prepare update data
        update_data = payload.model_dump(exclude_none=True)
        update_data["edited_at"] = datetime.now(timezone.utc).isoformat()
        
        # Serialize dates
        for key, value in update_data.items():
            update_data[key] = serialize_dates(value)

        # Update the maintenance record
        logger.debug("Updating maintenance record %s", maintenance_id)
        result = supabase.table("maintenancerecords").update(update_data).eq("maintenance_id", maintenance_id).eq("company_id", company_id).execute()
        
        # If the status is changing, also update the car status
        if "status" in update_data and car_id:
            try:
                new_status = update_data["status"]
                
                # Set car status based on maintenance status
                car_status = "available" if new_status == "completed" else "maintenance"
                
                # Update the car status directly
                print(f"Updating car {car_id} status to {car_status} based on maintenance status {new_status}")
                car_update = {"status": car_status, "updated_at": datetime.now(timezone.utc).isoformat()}
                
                # Execute the car update
                car_update_result = supabase.table("cars").update(car_update).eq("car_id", car_id).eq("company_id", company_id).execute()
                
                if car_update_result.data:
                    print(f"Successfully updated car {car_id} status to {car_status}")
                else:
                    print(f"No data returned from car update, but no error either")
                    
            except Exception as e:
                print(f"Error updating car status: {str(e)}")
                traceback.print_exc()
                # Don't fail the maintenance update if car update fails
        
        # Return the updated record with encrypted_maintenance_id
        if result.data and len(result.data) > 0:
            updated_record = result.data[0]
            updated_record["encrypted_maintenance_id"] = encrypt_id(updated_record["maintenance_id"])
            del updated_record["maintenance_id"]
            return updated_record
        else:
            # If no data returned, return the existing record with encrypted ID
            existing_record = existing_result.data
            existing_record["encrypted_maintenance_id"] = encrypt_id(existing_record["maintenance_id"])
            del existing_record["maintenance_id"]
            return existing_record
    except Exception as e:
        print(f"Error updating maintenance record: {str(e)}")
        raise Exception(f"Failed to update maintenance record: {str(e)}")

def delete_maintenance_service(maintenance_id: int, company_id: int):
    try:
        # Verify maintenance record belongs to company
        existing_result = supabase.table("maintenancerecords").select("maintenance_id").eq("maintenance_id", maintenance_id).eq("company_id", company_id).single().execute()
        if not existing_result.data:
            raise Exception("Maintenance record not found or access denied")
        
        result = supabase.table("maintenancerecords").delete().eq("maintenance_id", maintenance_id).eq("company_id", company_id).execute()
        
        if hasattr(result, 'error') and result.error:
            raise Exception(result.error.message)
        return {"message": "Maintenance record deleted"}
    except Exception as e:
        raise Exception(f"Failed to delete maintenance record: {str(e)}")

def create_maintenance_service(data: MaintenanceCreate, company_id: int):
    try:
        # Verify car belongs to company
        car_result = supabase.table("cars").select("car_id").eq("car_id", data.car_id).eq("company_id", company_id).single().execute()
        if not car_result.data:
            raise Exception("Car not found or access denied")
        
        # Convert to dictionary and add company_id
        record = data.model_dump()
        record["company_id"] = company_id
        record["created_at"] = datetime.now(timezone.utc).isoformat()
        
        # Serialize dates
        for key, value in record.items():
            record[key] = serialize_dates(value)
        
        logger.debug("Creating maintenance record for car %s", record.get("car_id"))
        
        result = supabase.table("maintenancerecords").insert(record).execute()
        
        if hasattr(result, 'error') and result.error:
            raise Exception(str(result.error))
        
        # Return the created record with encrypted_maintenance_id
        if result.data and len(result.data) > 0:
            created_record = result.data[0]
            created_record["encrypted_maintenance_id"] = encrypt_id(created_record["maintenance_id"])
            del created_record["maintenance_id"]
            return {"message": "Maintenance record created", "data": [created_record]}
        else:
            raise Exception("No data returned from maintenance record creation")
            
    except Exception as e:
        print(f"Error creating maintenance record: {str(e)}")
        raise Exception(f"Failed to create maintenance record: {str(e)}")


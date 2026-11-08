from fastapi import APIRouter, HTTPException, Depends
from backend.utils.concurrency import offload
from backend.utils.errors import server_error
from typing import List, Dict, Any
from datetime import datetime, date, timedelta
from backend.dependencies import get_current_company_id
from backend.supabase.client import supabase

router = APIRouter()


@router.get("/events")
@offload
async def get_calendar_events(company_id: int = Depends(get_current_company_id)):
    """
    Get all calendar events including:
    - Rental end dates
    - Car registration expiry dates
    - Car insurance expiry dates
    """
    try:
        events = []
        today = date.today()

        # Get active and upcoming rentals (end dates)
        rentals_result = supabase.table("rentalrecords").select(
            "rental_id, rental_start_date, rental_end_date, car_id, client_id, contract_status"
        ).eq("company_id", company_id).execute()

        if rentals_result.data:
            # Load the cars and clients of all rentals in two queries (this used
            # to be two queries per rental)
            cars_by_id, clients_by_id = {}, {}
            car_ids = sorted({r["car_id"] for r in rentals_result.data if r.get("car_id") is not None})
            client_ids = sorted({r["client_id"] for r in rentals_result.data if r.get("client_id") is not None})
            car_lookup_failed = False
            try:
                if car_ids:
                    cars_result = supabase.table("cars").select(
                        "car_id, make, model, license_plate, color, year"
                    ).in_("car_id", car_ids).eq("company_id", company_id).execute()
                    cars_by_id = {car["car_id"]: car for car in cars_result.data or []}
            except Exception as e:
                print(f"Error fetching car details: {e}")
                car_lookup_failed = True
            try:
                if client_ids:
                    clients_result = supabase.table("clients").select(
                        "client_id, name"
                    ).in_("client_id", client_ids).eq("company_id", company_id).execute()
                    clients_by_id = {client["client_id"]: client for client in clients_result.data or []}
            except Exception as e:
                print(f"Error fetching client details: {e}")

            for rental in rentals_result.data:
                if rental.get("rental_end_date"):
                    try:
                        # Parse the datetime (with time)
                        end_date_str = rental["rental_end_date"]
                        if isinstance(end_date_str, str):
                            end_datetime = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
                        else:
                            end_datetime = end_date_str
                        
                        # Parse start date as well
                        start_date_str = rental.get("rental_start_date")
                        start_datetime = None
                        if start_date_str:
                            if isinstance(start_date_str, str):
                                start_datetime = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
                            else:
                                start_datetime = start_date_str

                        # Only include future or recent rentals (within last 30 days)
                        if end_datetime.date() >= today - timedelta(days=30):
                            # Car details for this rental
                            car_info = "Unknown Vehicle" if car_lookup_failed else ""
                            car = cars_by_id.get(rental.get("car_id"))
                            if car:
                                car_info = f"{car.get('make', '')} {car.get('model', '')} - {car.get('license_plate', '')}"

                            # Client name
                            client = clients_by_id.get(rental.get("client_id"))
                            client_name = client.get("name", "Unknown") if client else "Unknown"

                            # Calculate priority - completed rentals should not be urgent
                            contract_status = rental.get('contract_status', 'active')
                            if contract_status == 'completed':
                                priority = 'completed'
                            else:
                                days_until = (end_datetime.date() - today).days
                                priority = "normal"
                                if days_until <= 0:
                                    priority = "overdue"
                                elif days_until <= 3:
                                    priority = "urgent"
                                elif days_until <= 7:
                                    priority = "upcoming"

                            events.append({
                                "id": f"rental_{rental['rental_id']}",
                                "type": "rental_end",
                                "date": end_datetime.isoformat(),  # Full datetime with time
                                "start_date": start_datetime.isoformat() if start_datetime else None,  # Include start date
                                "title": f"Rental ends: {client_name}",
                                "description": car_info,
                                "priority": priority,
                                "car_id": rental["car_id"],
                                "rental_id": rental["rental_id"],
                                "client_name": client_name,
                                "car_make": car.get('make', ''),
                                "car_model": car.get('model', ''),
                                "license_plate": car.get('license_plate', ''),
                                "car_color": car.get('color', ''),
                                "car_year": car.get('year', ''),
                                "contract_status": contract_status
                            })
                    except (ValueError, TypeError) as e:
                        print(f"Error parsing rental date: {e}")
                        continue

        # Get all cars and check for document expiry dates
        cars_result = supabase.table("cars").select(
            "car_id, make, model, license_plate, color, year, registration_expiry_date, insurance_expiry_date"
        ).eq("company_id", company_id).execute()

        if cars_result.data:
            for car in cars_result.data:
                car_info = f"{car.get('make', '')} {car.get('model', '')} - {car.get('license_plate', '')}"

                # Registration expiry
                if car.get("registration_expiry_date"):
                    try:
                        reg_date_str = car["registration_expiry_date"]
                        if isinstance(reg_date_str, str):
                            reg_date = datetime.fromisoformat(reg_date_str.replace('Z', '+00:00')).date()
                        else:
                            reg_date = reg_date_str

                        # Calculate priority
                        days_until = (reg_date - today).days
                        priority = "normal"
                        if days_until <= 0:
                            priority = "overdue"
                        elif days_until <= 3:
                            priority = "urgent"
                        elif days_until <= 7:
                            priority = "upcoming"
                        elif days_until <= 30:
                            priority = "normal"
                        else:
                            priority = "future"

                        events.append({
                            "id": f"registration_{car['car_id']}",
                            "type": "registration_expiry",
                            "date": reg_date.isoformat(),
                            "title": f"Registration expires: {car_info}",
                            "description": f"Registration renewal needed",
                            "priority": priority,
                            "car_id": car["car_id"],
                            "car_make": car.get('make', ''),
                            "car_model": car.get('model', ''),
                            "license_plate": car.get('license_plate', ''),
                            "car_color": car.get('color', ''),
                            "car_year": car.get('year', '')
                        })
                    except (ValueError, TypeError) as e:
                        print(f"Error parsing registration date: {e}")
                        continue

                # Insurance expiry
                if car.get("insurance_expiry_date"):
                    try:
                        ins_date_str = car["insurance_expiry_date"]
                        if isinstance(ins_date_str, str):
                            ins_date = datetime.fromisoformat(ins_date_str.replace('Z', '+00:00')).date()
                        else:
                            ins_date = ins_date_str

                        # Calculate priority
                        days_until = (ins_date - today).days
                        priority = "normal"
                        if days_until <= 0:
                            priority = "overdue"
                        elif days_until <= 3:
                            priority = "urgent"
                        elif days_until <= 7:
                            priority = "upcoming"
                        elif days_until <= 30:
                            priority = "normal"
                        else:
                            priority = "future"

                        events.append({
                            "id": f"insurance_{car['car_id']}",
                            "type": "insurance_expiry",
                            "date": ins_date.isoformat(),
                            "title": f"Insurance expires: {car_info}",
                            "description": f"Insurance renewal needed",
                            "priority": priority,
                            "car_id": car["car_id"],
                            "car_make": car.get('make', ''),
                            "car_model": car.get('model', ''),
                            "license_plate": car.get('license_plate', ''),
                            "car_color": car.get('color', ''),
                            "car_year": car.get('year', '')
                        })
                    except (ValueError, TypeError) as e:
                        print(f"Error parsing insurance date: {e}")
                        continue

        # Sort events by date
        events.sort(key=lambda x: x["date"])

        return {
            "events": events,
            "total_count": len(events),
            "urgent_count": len([e for e in events if e["priority"] in ["urgent", "overdue"] and e.get("contract_status") != "completed"])
        }

    except Exception as e:
        import traceback
        print(f"[CALENDAR EVENTS ERROR] {str(e)}")
        traceback.print_exc()
        raise server_error(e, "Error fetching calendar events")

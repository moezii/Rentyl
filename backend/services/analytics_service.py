from backend.supabase.client import supabase
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from typing import Optional, Dict, Any
from backend.utils.aes_utils import encrypt_id, decrypt_id


from datetime import datetime
from typing import Optional

async def calculate_current_month_utilization(company_id: int) -> float:
    """Calculate current month fleet utilization manually"""
    try:
        # Get current month start and end dates
        now = datetime.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Get all cars for the company
        cars_result = supabase.table("cars").select("car_id").eq("company_id", company_id).execute()
        if not cars_result.data:
            return 0.0
        
        total_cars = len(cars_result.data)
        car_ids = [car["car_id"] for car in cars_result.data]
        
        # Get rentals that overlap with current month
        rentals_result = supabase.table("rentalrecords").select("car_id, rental_start_date, rental_end_date").eq("company_id", company_id).in_("car_id", car_ids).execute()
        
        if not rentals_result.data:
            return 0.0
        
        # Count unique cars with active rentals this month
        active_cars = set()
        for rental in rentals_result.data:
            try:
                start_date = datetime.fromisoformat(rental["rental_start_date"].replace("Z", "+00:00"))
                end_date = datetime.fromisoformat(rental["rental_end_date"].replace("Z", "+00:00"))
                
                # Check if rental overlaps with current month
                if start_date <= now and end_date >= month_start:
                    active_cars.add(rental["car_id"])
            except:
                continue
        
        utilization = (len(active_cars) / total_cars) * 100 if total_cars > 0 else 0.0
        return utilization
    except Exception as e:
        print(f"Error calculating current month utilization: {e}")
        return 0.0

def _as_utc(dt: datetime) -> datetime:
    """Treat naive datetimes as UTC so they can be compared with tz-aware ones."""
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)


async def calculate_month_utilization(company_id: int, month_date: str) -> float:
    """Calculate fleet utilization for a specific month manually (day-based calculation)"""
    try:
        # Parse the month date
        target_date = _as_utc(datetime.fromisoformat(month_date.replace("Z", "+00:00")))
        month_start = target_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Calculate month end
        if month_start.month == 12:
            month_end = month_start.replace(year=month_start.year + 1, month=1)
        else:
            month_end = month_start.replace(month=month_start.month + 1)

        # Get all cars for the company
        cars_result = supabase.table("cars").select("car_id").eq("company_id", company_id).execute()
        if not cars_result.data:
            return 0.0

        total_cars = len(cars_result.data)
        car_ids = [car["car_id"] for car in cars_result.data]

        # Get rentals that overlap with target month
        rentals_result = supabase.table("rentalrecords").select("car_id, rental_start_date, rental_end_date").eq("company_id", company_id).in_("car_id", car_ids).execute()

        if not rentals_result.data:
            return 0.0

        # Calculate total days rented across all cars in this month
        total_days_rented = 0
        for rental in rentals_result.data:
            try:
                start_date = _as_utc(datetime.fromisoformat(rental["rental_start_date"].replace("Z", "+00:00")))
                end_date = _as_utc(datetime.fromisoformat(rental["rental_end_date"].replace("Z", "+00:00")))

                # Check if rental overlaps with target month
                if start_date < month_end and end_date >= month_start:
                    # Calculate days rented WITHIN this specific month only
                    # Clip the rental dates to month boundaries
                    rental_start_in_month = max(start_date.date(), month_start.date())
                    rental_end_in_month = min(end_date.date(), (month_end - timedelta(days=1)).date())

                    # Add 1 because both start and end dates are inclusive
                    days_in_month = (rental_end_in_month - rental_start_in_month).days + 1
                    total_days_rented += days_in_month
            except Exception as e:
                print(f"Error processing rental: {e}")
                continue

        # Calculate days in the month
        days_in_month = (month_end - month_start).days

        # Calculate fleet utilization: (total car-days rented) / (total car-days available)
        total_car_days_available = total_cars * days_in_month
        utilization = (total_days_rented / total_car_days_available) * 100 if total_car_days_available > 0 else 0.0

        return utilization
    except Exception as e:
        print(f"Error calculating month utilization: {e}")
        return 0.0

async def calculate_month_net_income(company_id: int, month_date: str) -> float:
    """Calculate net income for a specific month manually"""
    try:
        # Parse the month date
        target_date = _as_utc(datetime.fromisoformat(month_date.replace("Z", "+00:00")))
        month_start = target_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Calculate month end
        if month_start.month == 12:
            month_end = month_start.replace(year=month_start.year + 1, month=1)
        else:
            month_end = month_start.replace(month=month_start.month + 1)
        
        # Get rental revenue for the month (using amount_paid for cash-based accounting)
        rentals_result = supabase.table("rentalrecords").select("amount_paid").eq("company_id", company_id).gte("created_at", month_start.isoformat()).lt("created_at", month_end.isoformat()).execute()

        total_revenue = sum(rental.get("amount_paid", 0) or 0 for rental in (rentals_result.data or []))

        # Get maintenance costs for the month
        maintenance_result = supabase.table("maintenancerecords").select("maintenance_cost").eq("company_id", company_id).gte("created_at", month_start.isoformat()).lt("created_at", month_end.isoformat()).execute()

        total_maintenance = sum(maintenance.get("maintenance_cost", 0) or 0 for maintenance in (maintenance_result.data or []))

        net_income = total_revenue - total_maintenance
        print(f"[NET INCOME DEBUG] Month: {month_start.strftime('%Y-%m')}")
        print(f"  Revenue: ${total_revenue:.2f} (from {len(rentals_result.data or [])} rentals)")
        print(f"  Maintenance: ${total_maintenance:.2f} (from {len(maintenance_result.data or [])} records)")
        print(f"  Net Income: ${net_income:.2f}")

        return net_income
    except Exception as e:
        print(f"Error calculating month net income: {e}")
        return 0.0

async def calculate_month_maintenance_costs(company_id: int, month_date: str) -> float:
    """Calculate maintenance costs for a specific month manually"""
    try:
        # Parse the month date
        target_date = _as_utc(datetime.fromisoformat(month_date.replace("Z", "+00:00")))
        month_start = target_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Calculate month end
        if month_start.month == 12:
            month_end = month_start.replace(year=month_start.year + 1, month=1)
        else:
            month_end = month_start.replace(month=month_start.month + 1)
        
        # Get maintenance costs for the month
        maintenance_result = supabase.table("maintenancerecords").select("maintenance_cost").eq("company_id", company_id).gte("created_at", month_start.isoformat()).lt("created_at", month_end.isoformat()).execute()
        
        return sum(maintenance.get("maintenance_cost", 0) or 0 for maintenance in (maintenance_result.data or []))
    except Exception as e:
        print(f"Error calculating month maintenance costs: {e}")
        return 0.0

async def get_car_analytics(car_id: int, company_id: int, view_type: Optional[str] = None):
    """
    Returns monthly car analytics as a list of entries for charting.
    Supports `view_type=monthly` for history and `view_type=all_time` for totals.
    """
    try:
        # Ensure company_id is an integer
        company_id = int(company_id)
        
        # Verify car belongs to company
        car_check = supabase.table("cars").select("car_id").eq("car_id", car_id).eq("company_id", company_id).single().execute()
        if not car_check.data:
            raise HTTPException(status_code=404, detail="Car not found or access denied")
        
        if view_type == "all_time":
            # All-time totals for company car
            revenue_res = supabase.table("rentalrecords").select("amount_paid").eq("car_id", car_id).eq("company_id", company_id).execute()
            maintenance_res = supabase.table("maintenancerecords").select("maintenance_cost").eq("car_id", car_id).eq("company_id", company_id).execute()

            total_revenue = sum([r["amount_paid"] or 0 for r in revenue_res.data])
            total_maintenance = sum([m["maintenance_cost"] or 0 for m in maintenance_res.data])
            net_income = total_revenue - total_maintenance

            return {
                "total_revenue": total_revenue,
                "total_maintenance": total_maintenance,
                "net_income": net_income
            }

        # Monthly analytics - use the new comprehensive monthly_car_analytics view
        try:
            # Query the new monthly_car_analytics view which combines financials and utilization
            analytics_result = supabase.table("monthly_car_analytics").select("*").eq("car_id", car_id).eq("company_id", company_id).execute()
            analytics_data = analytics_result.data or []
            
            if not analytics_data:
                print(f"No analytics data found for car {car_id}")
                return []
            
            # Transform data for frontend
            merged = []
            for record in analytics_data:
                merged.append({
                    "month": record.get("month"),
                    "year": record.get("year"),
                    "month_number": record.get("month_number"),
                    "net_income": record.get("net_income", 0),
                    "gross_revenue": record.get("income", 0),  # income is the gross revenue
                    "utilization_rate": record.get("utilization_rate_percent", 0),
                    "maintenance_cost": record.get("maintenance_costs", 0),
                    "rental_count": record.get("rental_count", 0),
                    "days_rented": record.get("days_rented", 0),
                    "days_in_month": record.get("days_in_month", 0),
                })
            
            return merged
            
        except Exception as e:
            print(f"Error fetching car analytics data: {e}")
            return []

    except Exception as e:
        print(f"Error in get_car_analytics: {e}")
        return []



async def get_fleet_analytics(month: str, company_id: int):
    """
    Get fleet analytics for a given month or current month.
    If month is current month, use the current_month_fleet_utilization_view.
    Otherwise, query fleet_utilization_view with the specified month.
    """
    # Format to get just YYYY-MM-01 for the month parameter
    try:
        # Ensure company_id is an integer
        company_id = int(company_id)
        
        # Parse the provided date
        parsed_date = datetime.strptime(month.split('T')[0] if 'T' in month else month, "%Y-%m-%d")
        formatted_month = parsed_date.strftime("%Y-%m-%dT00:00:00+00:00")
        # Get current month in same format
        current_month_date = datetime.now().replace(day=1)
        
        # Check if requested month is current month
        is_current_month = (parsed_date.year == current_month_date.year and
                            parsed_date.month == current_month_date.month)
        
        print(f"Checking month: {formatted_month} for company {company_id}, Is current: {is_current_month}")
        
        # Use the new monthly_fleet_analytics view
        try:
            # Query the new comprehensive monthly_fleet_analytics view
            analytics_res = supabase.table("monthly_fleet_analytics").select("*").eq("company_id", company_id).execute()
            
            if analytics_res.data:
                # Find the matching month in the results
                month_data = None
                for record in analytics_res.data:
                    record_month = record.get("month")
                    if record_month and record_month.startswith(formatted_month[:7]):  # Match YYYY-MM
                        month_data = record
                        break
                
                if month_data:
                    utilization = month_data.get("fleet_utilization_rate_percent", 0)
                    net_income = month_data.get("net_income", 0)
                    maintenance_costs = month_data.get("total_maintenance_costs", 0)
                    print(f"Using monthly_fleet_analytics for {formatted_month}. Utilization: {utilization}%, Net Income: {net_income}")
                else:
                    # No data for this month, use fallback calculations
                    print(f"No data in monthly_fleet_analytics for {formatted_month}, using fallback")
                    utilization = await calculate_month_utilization(company_id, formatted_month)
                    net_income = await calculate_month_net_income(company_id, formatted_month)
                    maintenance_costs = await calculate_month_maintenance_costs(company_id, formatted_month)
            else:
                # View returned no data, use fallback calculations
                print("monthly_fleet_analytics returned no data, using fallback")
                utilization = await calculate_month_utilization(company_id, formatted_month)
                net_income = await calculate_month_net_income(company_id, formatted_month)
                maintenance_costs = await calculate_month_maintenance_costs(company_id, formatted_month)
        except Exception as analytics_error:
            print(f"Error querying monthly_fleet_analytics: {analytics_error}")
            # Fallback calculation
            utilization = await calculate_month_utilization(company_id, formatted_month)
            net_income = await calculate_month_net_income(company_id, formatted_month)
            maintenance_costs = await calculate_month_maintenance_costs(company_id, formatted_month)
            
        # Note: net_income and maintenance_costs are already set above from monthly_fleet_analytics
        
        return {
            "utilization": utilization,
            "net_income": net_income,
            "maintenance_costs": maintenance_costs
        }
        
    except Exception as e:
        print(f"Error in get_fleet_analytics: {e}")
        # Fallback to empty result
        return {
            "utilization": 0,
            "net_income": 0,
            "maintenance_costs": 0
        }

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

        # Avoid None in price calculation (using amount_paid for cash-based accounting)
        total_revenue = sum(r.get("amount_paid") or 0 for r in rentals)
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
                        "encrypted_car_id": encrypt_id(car.get("car_id")),
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
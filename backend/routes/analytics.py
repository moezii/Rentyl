from fastapi import APIRouter, Query, Depends, HTTPException
from backend.utils.concurrency import offload
from backend.utils.errors import server_error
from fastapi.responses import StreamingResponse
from backend.services.analytics_service import get_car_analytics, get_fleet_analytics, get_analytics_service
from backend.services.pdf_service import generate_net_income_statement_pdf
from backend.dependencies import get_current_company_id
from backend.utils.aes_utils import encrypt_id, decrypt_id
from backend.supabase.client import supabase
from typing import Optional
import asyncio
import re

router = APIRouter(
    tags=["Analytics"]
)

@router.get("/car/{car_id}")
@offload
async def fetch_car_analytics(
    car_id: str,
    view_type: str = Query(default="monthly", enum=["monthly", "history"]),
    company_id: int = Depends(get_current_company_id)
):
    """
    Returns car analytics either monthly or full history.
    """
    decrypted_car_id = decrypt_id(car_id)
    car_data = await get_car_analytics(decrypted_car_id, company_id, view_type)
    if 'car_id' in car_data:
        car_data['encrypted_car_id'] = encrypt_id(car_data['car_id'])
    return car_data

@router.get("/fleet")
@offload
async def fetch_fleet_analytics(
    month: str = Query(..., description="Month in format YYYY-MM-DD, e.g. 2025-05-01"),
    company_id: int = Depends(get_current_company_id)
):
    """
    Returns fleet-wide analytics for a given month.
    """
    data = await get_fleet_analytics(month, company_id)
    return data  # Return the actual data object, not a list

@router.get("/dashboard")
@offload
async def get_dashboard_analytics(company_id: int = Depends(get_current_company_id)):
    """
    Returns analytics summary for dashboard: revenue, active rentals, and popular cars.
    """
    return await get_analytics_service(company_id)

@router.get("/net-income-statement/download")
@offload
async def download_net_income_statement(
    month_start: str = Query(..., description="Start month in format YYYY-MM-DD, e.g. 2025-09-01"),
    month_end: Optional[str] = Query(None, description="End month in format YYYY-MM-DD (defaults to month_start for single month)"),
    currency_symbol: str = Query("$", description="Currency symbol for display"),
    lang: str = Query("en", description="Language code for PDF content (en or ar)"),
    company_id: int = Depends(get_current_company_id)
):
    """
    Generate and download a PDF Net Income Statement for the fleet.
    Shows revenue (invoiced vs collected), maintenance costs (regular vs irregular), and net income.
    """
    try:
        # Default month_end to month_start if not provided
        if not month_end:
            month_end = month_start

        # Get company data for PDF header
        company_data = None
        try:
            company_result = supabase.table("companies").select("*").eq(
                "company_id", company_id
            ).single().execute()

            if company_result.data:
                company_data = company_result.data
            else:
                # Fallback company data
                company_data = {
                    "company_id": company_id,
                    "company_name": "Rentyl"
                }
        except Exception as e:
            print(f"Company lookup failed for ID {company_id}: {str(e)}")
            # Create fallback company data
            company_data = {
                "company_id": company_id,
                "company_name": "Rentyl"
            }

        # Generate PDF
        # PDF generation (and the Supabase queries inside it) is synchronous: run it
        # in a worker thread so it doesn't block the event loop
        pdf_buffer = await asyncio.to_thread(
            generate_net_income_statement_pdf,
            month_start=month_start,
            month_end=month_end,
            company_id=company_id,
            currency_symbol=currency_symbol,
            company_data=company_data,
            lang=lang
        )

        # Create filename
        company_name = company_data.get('company_name', 'Rentyl').replace(' ', '_')
        # Header values must be latin-1 (Arabic company names used to crash the response)
        company_name = re.sub(r'[^A-Za-z0-9_.-]', '', company_name) or 'company'
        month_start = re.sub(r'[^0-9-]', '', month_start)
        month_end = re.sub(r'[^0-9-]', '', month_end)
        if month_start == month_end:
            filename = f"net_income_statement_{company_name}_{month_start}.pdf"
        else:
            filename = f"net_income_statement_{company_name}_{month_start}_to_{month_end}.pdf"

        # Return PDF as streaming response
        pdf_buffer.seek(0)
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating net income statement: {str(e)}")
        raise server_error(e, "Failed to generate net income statement")
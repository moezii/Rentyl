# backend/routes/companies.py
from fastapi import APIRouter, HTTPException, Request, Depends
from backend.utils.errors import server_error
from backend.models.companies import CompanyCreate, Company
from backend.supabase.client import supabase
from backend.dependencies import get_current_user_with_company, require_admin
from datetime import datetime, timezone
from typing import List
import traceback
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

def create_company_service(company: CompanyCreate):
    """Create a new company"""
    try:
        data = {
            "company_name": company.company_name,
            "status": company.status or "active",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        result = supabase.table("companies").insert(data).execute()
        
        if not result.data:
            raise Exception("Failed to create company")
            
        return result.data[0]
    except Exception as e:
        raise Exception(f"Failed to create company: {str(e)}")

def get_company_by_id_service(company_id: int):
    """Get company by ID"""
    try:
        result = supabase.table("companies").select("*").eq("company_id", company_id).single().execute()
        return result.data if result.data else None
    except Exception as e:
        print(f"Error fetching company {company_id}: {str(e)}")
        return None

def get_all_companies_service():
    """Get all companies"""
    try:
        result = supabase.table("companies").select("*").execute()
        return result.data or []
    except Exception as e:
        print(f"Error fetching companies: {str(e)}")
        return []

@router.post("/", response_model=Company)
def create_company(company: CompanyCreate, admin: dict = Depends(require_admin)):
    """Create a new company (admin only, like user registration)"""
    try:
        logger.debug("Creating company")
        result = create_company_service(company)
        logger.info("Company created: company_id=%s", result.get("company_id") if isinstance(result, dict) else None)
        return result
    except Exception as e:
        print(f"Error creating company: {str(e)}")
        print(traceback.format_exc())
        raise server_error(e)

@router.get("/", response_model=List[Company])
def get_all_companies(request: Request):
    """Get all companies - admin only"""
    try:
        user_context = get_current_user_with_company(request)
        
        if user_context.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        companies = get_all_companies_service()
        return companies
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching all companies: {str(e)}")
        print(traceback.format_exc())
        raise server_error(e)

@router.get("/current")
def get_current_company(request: Request):
    """The caller's own company (used by the frontend's api.getCurrentCompany)."""
    user_context = get_current_user_with_company(request)
    company = get_company_by_id_service(user_context["company_id"])
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.get("/{company_id}")
def get_company(company_id: int, request: Request):
    """Get company details"""
    try:
        print(f"Fetching company {company_id}")
        
        user_context = get_current_user_with_company(request)
        
        # Users can only see their own company unless they're admin
        if user_context["company_id"] != company_id and user_context.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Access denied")
            
        company = get_company_by_id_service(company_id)
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        
        return company
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error fetching company {company_id}: {str(e)}")
        print(traceback.format_exc())
        raise server_error(e)
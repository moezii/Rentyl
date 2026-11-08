# backend/routes/clients.py - FIXED
from fastapi import APIRouter, HTTPException, Depends
from backend.utils.concurrency import offload
from backend.utils.errors import server_error
from backend.models.client import ClientCreate, ClientUpdate
from backend.controllers.client_controller import ClientController
from backend.dependencies import get_current_company_id
from backend.utils.aes_utils import encrypt_id

router = APIRouter()

@router.post("/")
@offload
async def create_client(client: ClientCreate, company_id: int = Depends(get_current_company_id)):
    try:
        client.company_id = company_id
        return await ClientController.create_client(client)
    except Exception as e:
        raise server_error(e)

@router.get("/")
@offload
async def get_clients(company_id: int = Depends(get_current_company_id)):
    try:
        return await ClientController.get_clients(company_id)
    except Exception as e:
        raise server_error(e)

@router.get("/{encrypted_id}/")
@offload
async def get_client(encrypted_id: str, company_id: int = Depends(get_current_company_id)):
    try:
        return await ClientController.get_client(encrypted_id, company_id)
    except Exception as e:
        raise server_error(e)

@router.put("/{encrypted_id}/")
@offload
async def update_client(encrypted_id: str, client: ClientUpdate, company_id: int = Depends(get_current_company_id)):
    try:
        return await ClientController.update_client(encrypted_id, client, company_id)
    except Exception as e:
        raise server_error(e)

@router.delete("/{encrypted_id}/")
@offload
async def delete_client(encrypted_id: str, company_id: int = Depends(get_current_company_id)):
    try:
        return await ClientController.delete_client(encrypted_id, company_id)
    except Exception as e:
        raise server_error(e)
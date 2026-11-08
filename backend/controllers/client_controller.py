# Updated backend/controllers/client_controller.py

from backend.services.client_service import (
    create_client_service,
    get_all_clients_service,
    get_client_by_id_service,
    update_client_service,
    delete_client_service,
    get_client_documents_service
)
from backend.models.client import ClientCreate, ClientUpdate
from fastapi import HTTPException
from backend.utils.errors import server_error
from backend.utils.aes_utils import encrypt_id, decrypt_id

class ClientController:
    @staticmethod
    async def create_client(client: ClientCreate):
        try:
            client_obj = await create_client_service(client, client.company_id)
            # Add encrypted_client_id for URL use, keep client_id for internal operations
            if client_obj and 'client_id' in client_obj:
                client_obj['encrypted_client_id'] = encrypt_id(client_obj['client_id'])
                # Keep client_id for internal use (e.g., creating rentals)
            return client_obj
        except Exception as e:
            raise server_error(e, "Failed to create client")

    @staticmethod
    async def get_clients(company_id: int):
        try:
            clients = await get_all_clients_service(company_id)
            # Add encrypted_client_id for URL use, keep client_id for internal operations
            for client in clients:
                if 'client_id' in client:
                    client['encrypted_client_id'] = encrypt_id(client['client_id'])
                    # Keep client_id for internal use (e.g., creating rentals)
            return clients or []
        except Exception as e:
            return []

    @staticmethod
    async def get_client(encrypted_id: str, company_id: int):
        try:
            client_id = decrypt_id(encrypted_id)
            client = await get_client_by_id_service(client_id, company_id)
            if not client:
                raise HTTPException(status_code=404, detail="Client not found")
            # Fetch documents for this client and include them in the response
            try:
                documents = await get_client_documents_service(client_id, company_id)
                if documents:
                    client["documents"] = documents
            except Exception as doc_err:
                print(f"Warning: Could not fetch client documents: {str(doc_err)}")
            # Add encrypted_client_id for URL use, keep client_id for internal operations
            if 'client_id' in client:
                client['encrypted_client_id'] = encrypt_id(client['client_id'])
                # Keep client_id for internal use (e.g., creating rentals)
            return client
        except HTTPException as e:
            raise e
        except Exception as e:
            raise server_error(e)

    @staticmethod
    async def update_client(encrypted_id: str, client: ClientUpdate, company_id: int):
        try:
            client_id = decrypt_id(encrypted_id)
            return await update_client_service(client_id, client, company_id)
        except Exception as e:
            raise server_error(e)

    @staticmethod
    async def delete_client(encrypted_id: str, company_id: int):
        try:
            client_id = decrypt_id(encrypted_id)
            return await delete_client_service(client_id, company_id)
        except Exception as e:
            raise server_error(e)
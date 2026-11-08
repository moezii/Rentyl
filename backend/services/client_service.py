# backend/services/client_service.py - FIXED
from backend.supabase.client import supabase
from backend.models.client import ClientCreate, ClientUpdate
from datetime import date, datetime, timezone
import traceback
from backend.config import BUCKET_NAME, BOOKING_DOCS_BUCKET, SIGNED_URL_TTL_SECONDS, SUPABASE_URL
from backend.utils.date_utils import serialize_date, serialize_dates
import uuid
from fastapi import HTTPException
from backend.utils.errors import server_error
import os
from backend.utils.aes_utils import encrypt_id
import logging

logger = logging.getLogger(__name__)

async def create_client_service(client: ClientCreate, company_id: int):
    try:
        data = client.model_dump()
        data["company_id"] = company_id

        # Convert any date objects to strings
        for key, value in data.items():
            data[key] = serialize_dates(value)

        data["created_at"] = datetime.now(timezone.utc).isoformat()

        logger.debug("Creating client")
        result = supabase.table("clients").insert(data).execute()

        if not result.data:
            print("No data returned from Supabase insert operation")
            raise Exception("No data returned")
        return result.data[0]
    except Exception as e:
        raise Exception(f"Failed to create client: {str(e)}")


async def get_all_clients_service(company_id: int):
    try:
        print(f"Fetching clients for company {company_id}")
        result = supabase.table("clients").select("*").eq("company_id", company_id).execute()

        print(f"Fetched {len(result.data) if result.data else 0} clients")
        clients = result.data or []
        for client in clients:
            if 'client_id' in client:
                client['encrypted_client_id'] = encrypt_id(client['client_id'])
                # Keep client_id for internal use (e.g., creating rentals)
        return clients
    except Exception as e:
        print(f"Error in get_all_clients_service: {str(e)}")
        traceback.print_exc()
        return []

async def get_client_by_id_service(client_id: int, company_id: int):
    try:
        print(f"Fetching client {client_id} for company {company_id}")
        result = supabase.table("clients").select("*").eq("client_id", client_id).eq("company_id", company_id).single().execute()
        
        if not result.data:
            print(f"No client found with ID: {client_id} for company {company_id}")
            return None
            
        client = result.data
        if 'client_id' in client:
            client['encrypted_client_id'] = encrypt_id(client['client_id'])
            # Keep client_id for internal use
        return client
    except Exception as e:
        print(f"Error in get_client_by_id_service: {str(e)}")
        traceback.print_exc()
        return None

async def update_client_service(client_id: int, client: ClientUpdate, company_id: int):
    try:
        # Verify client belongs to company
        existing_client = await get_client_by_id_service(client_id, company_id)
        if not existing_client:
            raise Exception("Client not found or access denied")
        
        valid_data = client.model_dump(exclude_none=True)
        valid_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        logger.debug("Updating client %s", client_id)
        result = supabase.table("clients").update(valid_data).eq("client_id", client_id).eq("company_id", company_id).execute()
        
        if not result.data:
            print(f"No data returned when updating client {client_id}")
            raise Exception("Database error: No data returned from update operation")
            
        return {"message": "Client updated", "data": result.data}
    except Exception as e:
        print(f"Error in update_client_service: {str(e)}")
        traceback.print_exc()
        raise Exception(f"Failed to update client: {str(e)}")

async def delete_client_service(client_id: int, company_id: int):
    try:
        # Verify client belongs to company
        existing_client = await get_client_by_id_service(client_id, company_id)
        if not existing_client:
            raise Exception("Client not found or access denied")
        
        print(f"Deleting client {client_id} for company {company_id}")
        
        # Get documents first to delete them from storage
        try:
            documents = await get_client_documents_service(client_id, company_id)
            if documents:
                # Delete each document file from storage
                for doc in documents:
                    try:
                        if "file_path" in doc:
                            for bucket in [BOOKING_DOCS_BUCKET, BUCKET_NAME]:
                                if not bucket:
                                    continue
                                try:
                                    supabase.storage.from_(bucket).remove([doc["file_path"]])
                                    break
                                except Exception:
                                    continue
                    except Exception as doc_err:
                        print(f"Warning: Could not delete document file: {str(doc_err)}")
        except Exception as doc_list_err:
            print(f"Warning: Could not fetch client documents for deletion: {str(doc_list_err)}")
        
        # Delete client (this will cascade delete documents records via foreign key)
        result = supabase.table("clients").delete().eq("client_id", client_id).eq("company_id", company_id).execute()
        
        if not result.data:
            print(f"No data returned when deleting client {client_id}")
            raise Exception("Database error: No data returned from delete operation")
            
        return {"message": "Client deleted"}
    except Exception as e:
        print(f"Error in delete_client_service: {str(e)}")
        traceback.print_exc()
        raise Exception(f"Failed to delete client: {str(e)}")

# New function to get client documents
async def get_client_documents_service(client_id: int, company_id: int):
    try:
        # Verify client belongs to company first
        client = await get_client_by_id_service(client_id, company_id)
        if not client:
            raise Exception("Client not found or access denied")
        
        print(f"Fetching documents for client {client_id} in company {company_id}")
        result = supabase.table("client_documents").select("*").eq("client_id", client_id).eq("company_id", company_id).order("uploaded_at", desc=True).execute()
        
        if not result.data:
            return []
            
        # Add signed URLs to documents (private bucket)
        documents_with_urls = []
        for doc in result.data:
            try:
                signed_url_value = None
                for bucket in [BOOKING_DOCS_BUCKET, BUCKET_NAME]:
                    if not bucket:
                        continue
                    try:
                        signed_url = supabase.storage.from_(bucket).create_signed_url(
                            doc["file_path"],
                            SIGNED_URL_TTL_SECONDS
                        )
                        signed_value = signed_url.get("signedURL") if isinstance(signed_url, dict) else None
                        if signed_value:
                            if signed_value.startswith("http"):
                                signed_url_value = signed_value
                            else:
                                base = SUPABASE_URL.rstrip("/")
                                signed_url_value = f"{base}/storage/v1/object/sign/{bucket}/{signed_value}"
                            break
                    except Exception:
                        continue
                doc_with_url = {**doc, "url": signed_url_value}
                documents_with_urls.append(doc_with_url)
            except Exception as url_err:
                print(f"Warning: Could not get URL for document {doc.get('document_id')}: {str(url_err)}")
                documents_with_urls.append(doc)
                
        return documents_with_urls
    except Exception as e:
        print(f"Error in get_client_documents_service: {str(e)}")
        traceback.print_exc()
        raise Exception(f"Failed to fetch client documents: {str(e)}")

async def upload_client_documents_service(client_id: int, files: list, company_id: int):
    try:
        # Verify client belongs to company
        client_check = supabase.table("clients").select("client_id").eq("client_id", client_id).eq("company_id", company_id).single().execute()
        if not client_check.data:
            raise HTTPException(status_code=404, detail="Client not found or access denied")
            
        # Process uploads
        document_results = []
        
        for file in files:
            # Validate file type
            allowed_types = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
            if file.content_type not in allowed_types:
                raise HTTPException(status_code=400, detail=f"Invalid file type for {file.filename}")
            
            # Create unique filename
            file_ext = os.path.splitext(file.filename)[-1]
            unique_filename = f"client_{client_id}_{uuid.uuid4()}{file_ext}"
            
            # Read file content
            file_content = await file.read()
            file_size = len(file_content)
            
            # Upload to storage
            upload_result = supabase.storage.from_(BOOKING_DOCS_BUCKET).upload(
                path=f"client_documents/{unique_filename}",
                file=file_content,
                file_options={"content-type": file.content_type}
            )
            
            signed_url = supabase.storage.from_(BOOKING_DOCS_BUCKET).create_signed_url(
                f"client_documents/{unique_filename}",
                SIGNED_URL_TTL_SECONDS
            )
            signed_value = signed_url.get("signedURL") if isinstance(signed_url, dict) else None
            if not signed_value:
                raise HTTPException(status_code=500, detail="Failed to create signed URL for document")
            if signed_value.startswith("http"):
                signed_url_value = signed_value
            else:
                base = SUPABASE_URL.rstrip("/")
                signed_url_value = f"{base}/storage/v1/object/sign/{BOOKING_DOCS_BUCKET}/{signed_value}"
            
            # Insert record with company_id
            document_data = {
                "client_id": client_id,
                "company_id": company_id,
                "name": file.filename,
                "file_path": f"client_documents/{unique_filename}",
                "file_type": file.content_type,
                "file_size": file_size,
                "uploaded_at": datetime.now(timezone.utc).isoformat()
            }
            
            doc_result = supabase.table("client_documents").insert(document_data).execute()
            
            if doc_result.data:
                document_result = {
                    "document_id": doc_result.data[0]["document_id"],
                    "name": file.filename,
                    "type": file.content_type,
                    "size": file_size,
                    "url": signed_url_value
                }
                document_results.append(document_result)
        
        return {
            "message": f"Successfully uploaded {len(document_results)} document(s)",
            "documents": document_results
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error uploading documents: {str(e)}")
        raise server_error(e, "An error occurred during document upload")

async def delete_document_service(document_id: int, company_id: int):
    try:
        # Verify document belongs to company
        document = supabase.table("client_documents").select("*").eq("document_id", document_id).eq("company_id", company_id).single().execute()
        
        if not document.data:
            raise HTTPException(status_code=404, detail="Document not found or access denied")
            
        file_path = document.data.get("file_path")
        
        # Delete from storage
        if file_path:
            storage_deleted = False
            for bucket in [BOOKING_DOCS_BUCKET, BUCKET_NAME]:
                if not bucket:
                    continue
                try:
                    supabase.storage.from_(bucket).remove([file_path])
                    storage_deleted = True
                    break
                except Exception:
                    continue
            if not storage_deleted:
                print("Warning: Could not delete file from storage")
        
        # Delete from database
        delete_result = supabase.table("client_documents").delete().eq("document_id", document_id).eq("company_id", company_id).execute()
        
        return {"message": "Document deleted successfully"}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error deleting document: {str(e)}")
        raise server_error(e, "An error occurred while deleting the document")

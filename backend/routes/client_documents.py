# This is the correct version to use - backend/routes/client_documents.py for FastAPI

from fastapi import APIRouter, HTTPException, File, UploadFile, Form, BackgroundTasks, Depends
from backend.utils.concurrency import offload
from backend.utils.errors import server_error
from backend.dependencies import get_current_company_id
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict, Any
import os
import shutil
import tempfile
import uuid
from datetime import datetime, timezone

from backend.supabase.client import supabase
from backend.config import BOOKING_DOCS_BUCKET, SIGNED_URL_TTL_SECONDS, SUPABASE_URL, BUCKET_NAME
import traceback
from backend.utils.aes_utils import decrypt_id
from backend.routes.upload import validate_document_file, MIME_TYPE_MAP

router = APIRouter()

# Helper function to validate file types
def validate_file_type(file: UploadFile) -> bool:
    allowed_types = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
    return file.content_type in allowed_types

# Upload endpoint for client documents
@router.post("/clients/documents/")
@offload
async def upload_client_documents(
    background_tasks: BackgroundTasks,
    client_id: str = Form(...),
    files: List[UploadFile] = File(...),
    company_id: int = Depends(get_current_company_id)
):
    try:
        # Decrypt the encrypted client_id
        raw_client_id = decrypt_id(client_id)
        # Validate client exists and belongs to the caller's company
        client_check = (
            supabase.table("clients").select("client_id")
            .eq("client_id", raw_client_id)
            .eq("company_id", company_id)
            .execute()
        )
        if not client_check.data:
            raise HTTPException(status_code=404, detail="Client not found")
            
        # Validate file types (declared type, then name/size/magic bytes)
        validated_files = []
        for file in files:
            if not validate_file_type(file):
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid file type for {file.filename}. Only PDF, JPG, JPEG, and PNG are allowed."
                )
            content = await file.read()
            file_ext = validate_document_file(file, content)
            validated_files.append((file, content, file_ext))
        
        # Process uploads
        document_results = []
        
        for file, file_content, file_ext in validated_files:
            # Create a unique filename (extension validated above)
            unique_filename = f"client_{raw_client_id}_{uuid.uuid4()}{file_ext}"
            content_type = MIME_TYPE_MAP.get(file_ext, "application/octet-stream")
            file_size = len(file_content)

            # Upload file to Supabase Storage
            try:
                upload_result = supabase.storage.from_(BOOKING_DOCS_BUCKET).upload(
                    path=f"client_documents/{unique_filename}",
                    file=file_content,
                    file_options={"content-type": content_type}
                )
                
                signed_url = supabase.storage.from_(BOOKING_DOCS_BUCKET).create_signed_url(
                    f"client_documents/{unique_filename}",
                    SIGNED_URL_TTL_SECONDS
                )
                signed_value = signed_url.get("signedURL") if isinstance(signed_url, dict) else None
                if not signed_value:
                    raise Exception("Failed to create signed URL")
                if signed_value.startswith("http"):
                    signed_url_value = signed_value
                else:
                    base = SUPABASE_URL.rstrip("/")
                    signed_url_value = f"{base}/storage/v1/object/sign/{BOOKING_DOCS_BUCKET}/{signed_value}"
                
                # Insert record in client_documents table
                document_data = {
                    "client_id": raw_client_id,
                    "company_id": company_id,  # Add company_id to document data
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
                
            except Exception as e:
                print(f"Error uploading {file.filename}: {str(e)}")
                traceback.print_exc()
                # Continue with next file
        
        return {
            "message": f"Successfully uploaded {len(document_results)} document(s)",
            "documents": document_results
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error uploading documents: {str(e)}")
        traceback.print_exc()
        raise server_error(e, "An error occurred during document upload")

# Get documents for a client
@router.get("/clients/{client_id}/documents/")
@offload
async def get_client_documents(client_id: str, company_id: int = Depends(get_current_company_id)):
    # Authenticated + company-scoped: the response contains signed URLs to
    # customers' ID and driving-licence scans.
    try:
        # Decrypt the encrypted client_id
        raw_client_id = decrypt_id(client_id)
        # Fetch documents from database
        result = (
            supabase.table("client_documents").select("*")
            .eq("client_id", raw_client_id)
            .eq("company_id", company_id)
            .order("uploaded_at", desc=True)
            .execute()
        )
        
        if not result.data:
            return []
            
        # Add public URLs to documents
        documents_with_urls = []
        for doc in result.data:
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
            
        return documents_with_urls
        
    except Exception as e:
        print(f"Error fetching client documents: {str(e)}")
        traceback.print_exc()
        raise server_error(e, "An error occurred while fetching documents")

# Delete a document - simplified version
@router.delete("/{document_id}/")
@offload
async def delete_document(document_id: int, company_id: int = Depends(get_current_company_id)):
    """Delete a client document by ID"""
    try:
        # First, check if the document exists and belongs to the company
        document_check = supabase.table("client_documents") \
            .select("*") \
            .eq("document_id", document_id) \
            .eq("company_id", company_id) \
            .execute()
        
        if not document_check.data:
            raise HTTPException(status_code=404, detail="Document not found or you don't have permission to delete it")
        
        # Get the file path before deleting the record
        file_path = document_check.data[0]["file_path"]
        
        # Delete from database
        delete_result = supabase.table("client_documents") \
            .delete() \
            .eq("document_id", document_id) \
            .eq("company_id", company_id) \
            .execute()
        
        # Try to delete the file from storage (if it fails, we still deleted the database record)
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
            # Continue execution - we don't want to fail the whole request if just the storage deletion fails
        
        # Return a simple dictionary - FastAPI will convert it to a JSON response
        return {"message": "Document deleted successfully"}
    
    except HTTPException as he:
        # Re-raise HTTP exceptions
        raise he
    except Exception as e:
        print(f"Error deleting document: {str(e)}")
        traceback.print_exc()
        raise server_error(e, "An error occurred while deleting the document")

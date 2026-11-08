import os
import traceback
from uuid import uuid4
from backend.supabase.client import supabase
from backend.config import BUCKET_NAME
from fastapi import UploadFile, HTTPException
from backend.utils.file_validation import validate_image_file, get_safe_filename, FileValidationError
import logging

logger = logging.getLogger(__name__)

# backend/utils/upload.py - Secure image upload with comprehensive validation
async def upload_image(image: UploadFile) -> str:
    if not image:
        return None
        
    try:
        # Comprehensive file validation - protects against all major upload vulnerabilities
        try:
            validated_content = validate_image_file(image)
        except FileValidationError as e:
            raise HTTPException(status_code=400, detail=f"File validation failed: {str(e)}")
        
        # Generate secure filename - protects against directory traversal
        filename = get_safe_filename(image.filename)
        
        # Upload to Supabase with validated content
        print(f"Uploading validated image {filename} to bucket {BUCKET_NAME}")
        result = supabase.storage.from_(BUCKET_NAME).upload(
            path=filename,
            file=validated_content,
            file_options={"content-type": image.content_type}
        )
        

        # Get public URL
        url = supabase.storage.from_(BUCKET_NAME).get_public_url(filename)
        print(f"Generated public URL: {url}")
        
        if not url:
            raise Exception("Failed to generate public URL")

        return url
    except HTTPException:
        # Re-raise HTTPException as-is
        raise
    except Exception as e:
        print(f"Error in upload_image: {str(e)}")
        traceback.print_exc()
        raise Exception(f"Image upload failed: {str(e)}")

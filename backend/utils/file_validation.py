import os
from fastapi import HTTPException, UploadFile
from typing import Optional

# File size limit: 5MB
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB in bytes

# Allowed image formats
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png'}
ALLOWED_MIME_TYPES = {'image/jpeg', 'image/png'}

# Magic bytes for image validation
MAGIC_BYTES = {
    'jpeg': [b'\xFF\xD8\xFF'],
    'png': [b'\x89PNG\r\n\x1a\n']
}

class FileValidationError(Exception):
    """Custom exception for file validation errors"""
    pass

def validate_file_extension(filename: str) -> None:
    """
    Validates file extension against whitelist.
    Protects against: Malicious file extensions (.php, .exe, etc.) and double extensions (.png.php)
    """
    if not filename:
        raise FileValidationError("Filename is required")
    
    filename_lower = filename.lower()
    
    # Check that filename ends with allowed extensions only - protects against double extensions
    allowed_patterns = ['.jpg$', '.jpeg$', '.png$']
    import re
    
    valid_extension = False
    for pattern in allowed_patterns:
        if re.search(pattern, filename_lower):
            valid_extension = True
            break
    
    if not valid_extension:
        raise FileValidationError(f"Invalid file extension. Filename must end with .jpg, .jpeg, or .png only")

def validate_mime_type(content_type: str) -> None:
    """
    Validates MIME type against whitelist.
    Protects against: MIME type spoofing attacks
    """
    if not content_type:
        raise FileValidationError("Content type is required")
    
    if content_type not in ALLOWED_MIME_TYPES:
        raise FileValidationError(f"Invalid MIME type. Only {', '.join(ALLOWED_MIME_TYPES)} are allowed")

def validate_file_size(file_size: int) -> None:
    """
    Validates file size against maximum limit.
    Protects against: DoS attacks through large file uploads
    """
    if file_size > MAX_FILE_SIZE:
        raise FileValidationError(f"File size exceeds maximum limit of {MAX_FILE_SIZE // (1024*1024)}MB")

def validate_magic_bytes(file_content: bytes, filename: str) -> None:
    """
    Validates file content using magic bytes.
    Protects against: Malicious files disguised as images
    """
    if not file_content:
        raise FileValidationError("File content is empty")
    
    file_ext = os.path.splitext(filename.lower())[1]
    
    # Check magic bytes based on file extension
    if file_ext in ['.jpg', '.jpeg']:
        if not any(file_content.startswith(magic) for magic in MAGIC_BYTES['jpeg']):
            raise FileValidationError("Invalid JPEG file: Magic bytes do not match")
    elif file_ext == '.png':
        if not any(file_content.startswith(magic) for magic in MAGIC_BYTES['png']):
            raise FileValidationError("Invalid PNG file: Magic bytes do not match")

def validate_image_file(upload_file: UploadFile) -> bytes:
    """
    Comprehensive image file validation.
    Protects against: All major upload vulnerabilities
    
    Returns: Validated file content as bytes
    Raises: FileValidationError for any validation failure
    """
    if not upload_file:
        raise FileValidationError("No file provided")
    
    # Validate filename
    if not upload_file.filename:
        raise FileValidationError("Filename is required")
    
    # Read file content
    file_content = upload_file.file.read()
    upload_file.file.seek(0)  # Reset file pointer
    
    # Validate file size
    validate_file_size(len(file_content))
    
    # Validate file extension
    validate_file_extension(upload_file.filename)
    
    # Validate MIME type
    validate_mime_type(upload_file.content_type)
    
    # Validate magic bytes
    validate_magic_bytes(file_content, upload_file.filename)
    
    return file_content

def get_safe_filename(original_filename: str) -> str:
    """
    Generates a safe filename with validated extension.
    Protects against: Directory traversal and filename injection
    """
    if not original_filename:
        raise FileValidationError("Original filename is required")
    
    # Validate extension first
    validate_file_extension(original_filename)
    
    # Extract and validate extension
    file_ext = os.path.splitext(original_filename.lower())[1]
    
    # Generate safe filename with UUID
    from uuid import uuid4
    safe_filename = f"{uuid4()}{file_ext}"
    
    return safe_filename
"""
Upload Routes

Handles file uploads for the application with enterprise-grade security validation.

Security features:
- File size validation (max 5MB)
- MIME type validation (server-controlled, not client-controlled)
- Magic bytes verification
- Filename sanitization (prevents path traversal, null bytes, double extensions)
- Image dimension/pixel count validation (prevents decompression bombs)
- Metadata stripping (removes EXIF, GPS, thumbnails)
- Advanced PDF security (deep inspection with pikepdf)
- PDF page count and complexity limits (max 100 pages)
- Progressive JPEG protection (forces baseline encoding)
- Embedded executable detection
- SHA-256 checksum for deduplication
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from backend.utils.concurrency import offload
from backend.dependencies import get_current_user_with_company
from backend.utils.errors import server_error
from backend.utils.rate_limit import upload_limiter
from backend.utils.upload import upload_image
import os
import hashlib
from uuid import uuid4
from backend.supabase.client import supabase, supabase_admin
from backend.config import BOOKING_DOCS_BUCKET, SIGNED_URL_TTL_SECONDS, SUPABASE_URL
from backend.utils.document_upload_cache import register_upload
from io import BytesIO

# Optional imports with graceful fallback
try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    print("Warning: Pillow not installed. Image validation will be limited.")

try:
    import pikepdf
    PIKEPDF_AVAILABLE = True
except ImportError:
    PIKEPDF_AVAILABLE = False
    print("Warning: pikepdf not installed. PDF validation will be limited.")

router = APIRouter()

# Security constants
MAX_DOCUMENT_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_DOCUMENT_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png'}

# Image safety limits
MAX_IMAGE_PIXELS = 25_000_000
MAX_IMAGE_DIMENSION = 8192

# PDF limits
MAX_PDF_PAGES = 100

# Magic bytes
DOCUMENT_MAGIC_BYTES = {
    'pdf': [b'%PDF-'],
    'jpeg': [b'\xFF\xD8\xFF'],
    'png': [b'\x89PNG\r\n\x1a\n']
}

# Real MIME types (do NOT trust client upload headers)
MIME_TYPE_MAP = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png'
}


def compute_file_hash(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


# --------------------------------------------
# IMAGE VALIDATION & SANITIZATION
# --------------------------------------------
def validate_image_safely(content: bytes, file_ext: str) -> bytes:
    if not PIL_AVAILABLE:
        return content

    try:
        img = Image.open(BytesIO(content))
        width, height = img.size

        # Pixel + dimension limits
        if width > MAX_IMAGE_DIMENSION or height > MAX_IMAGE_DIMENSION:
            raise HTTPException(400, "Image dimensions too large")

        if width * height > MAX_IMAGE_PIXELS:
            raise HTTPException(400, "Image pixel count too large")

        # Strip metadata by rewriting raw pixel data
        clean_img = Image.new(img.mode, img.size)
        clean_img.putdata(list(img.getdata()))

        output = BytesIO()

        if file_ext in ['.jpg', '.jpeg']:
            clean_img.save(output, format="JPEG", quality=95, optimize=True, progressive=False)
        elif file_ext == '.png':
            clean_img.save(output, format="PNG", optimize=True)
        else:
            raise HTTPException(400, "Unsupported image format")

        return output.getvalue()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, "Invalid or corrupted image")


# --------------------------------------------
# PDF VALIDATION & SANITIZATION
# --------------------------------------------
def validate_pdf_safely(content: bytes) -> bytes:
    # Quick raw-content scanning
    dangerous_patterns = [
        (b'/JavaScript', "JavaScript"),
        (b'/JS', "JavaScript"),
        (b'/Launch', "Launch actions"),
        (b'/EmbeddedFile', "Embedded files"),
        (b'/AA', "Additional Actions"),
        (b'/OpenAction', "OpenAction"),
        (b'/AcroForm', "AcroForm actions"),
    ]

    lower = content.lower()
    for pattern, name in dangerous_patterns:
        if pattern.lower() in lower:
            raise HTTPException(400, f"PDF contains {name} (security risk)")

    if not PIKEPDF_AVAILABLE:
        return content

    try:
        pdf = pikepdf.open(BytesIO(content))

        # Page count check
        if len(pdf.pages) > MAX_PDF_PAGES:
            raise HTTPException(400, f"PDF has too many pages (max {MAX_PDF_PAGES})")

        # Embedded JS check (page-level)
        for page in pdf.pages:
            if '/JS' in page or '/JavaScript' in page:
                raise HTTPException(400, "PDF contains JavaScript (security risk)")

        # Document-level JS check
        if '/Names' in pdf.Root:
            names = pdf.Root.Names
            if names and '/JavaScript' in names:
                raise HTTPException(400, "PDF contains document-level JavaScript")

        # METADATA FIX (prevents your 'clear' crash)
        try:
            pdf.docinfo = pikepdf.Dictionary()  # Replace instead of clearing
        except Exception:
            pass

        # Save sanitized PDF
        output = BytesIO()
        pdf.save(output)
        return output.getvalue()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, "Invalid or corrupted PDF")


# --------------------------------------------
# GENERIC FILE VALIDATION
# --------------------------------------------
def validate_document_file(upload_file: UploadFile, content: bytes) -> str:
    if not upload_file.filename:
        raise HTTPException(400, "No file provided")

    filename = upload_file.filename.strip()
    filename = "".join(ch for ch in filename if ch not in "\r\n\t")

    if '\x00' in filename:
        raise HTTPException(400, "Invalid filename: null byte detected")

    if '..' in filename or '/' in filename or '\\' in filename:
        raise HTTPException(400, "Invalid filename: path traversal detected")

    if filename.startswith('.'):
        raise HTTPException(400, "Invalid filename: hidden files not allowed")

    if len(filename) > 255:
        raise HTTPException(400, "Filename too long")

    filename_lower = filename.lower()
    file_ext = os.path.splitext(filename_lower)[1]

    if file_ext not in ALLOWED_DOCUMENT_EXTENSIONS:
        raise HTTPException(400, "Invalid file extension")

    # Double extension check
    if filename_lower.count('.') > 1:
        parts = filename_lower.split('.')
        for part in parts[:-1]:
            if part in ['exe', 'js', 'php', 'asp', 'pif', 'vbs', 'cmd', 'bat', 'sh', 'scr']:
                raise HTTPException(400, "Invalid filename: double extension detected")

    if len(content) == 0:
        raise HTTPException(400, "File is empty")

    if len(content) > MAX_DOCUMENT_SIZE:
        raise HTTPException(400, "File too large")

    # Magic byte validation
    if file_ext == '.pdf':
        if not any(content.startswith(m) for m in DOCUMENT_MAGIC_BYTES['pdf']):
            raise HTTPException(400, "Invalid PDF: magic bytes mismatch")

    if file_ext in ['.jpg', '.jpeg']:
        if not any(content.startswith(m) for m in DOCUMENT_MAGIC_BYTES['jpeg']):
            raise HTTPException(400, "Invalid JPEG: magic bytes mismatch")

    if file_ext == '.png':
        if not any(content.startswith(m) for m in DOCUMENT_MAGIC_BYTES['png']):
            raise HTTPException(400, "Invalid PNG: magic bytes mismatch")

    # Basic executable signature check
    for pattern in [b'MZ', b'\x7fELF', b'<script', b'<?php', b'<%', b'exec(', b'eval(', b'system(']:
        if pattern.lower() in content[:1024].lower():
            raise HTTPException(400, "File contains potentially malicious content")

    return file_ext


# --------------------------------------------
# MAIN ROUTE: DOCUMENT UPLOAD
# --------------------------------------------
@router.post("/document")
@offload
async def upload_document(file: UploadFile = File(...), _rl: None = Depends(upload_limiter)):
    try:
        content = await file.read()

        file_ext = validate_document_file(file, content)

        # Apply sanitization
        if file_ext in ['.jpg', '.jpeg', '.png']:
            sanitized = validate_image_safely(content, file_ext)
        elif file_ext == '.pdf':
            sanitized = validate_pdf_safely(content)
        else:
            sanitized = content

        file_hash = compute_file_hash(sanitized)
        safe_filename = f"document_{uuid4()}{file_ext}"
        content_type = MIME_TYPE_MAP.get(file_ext, "application/octet-stream")

        bucket = BOOKING_DOCS_BUCKET
        storage_path = f"booking_documents/{safe_filename}"
        # Server-side (service-role) client for public booking uploads
        supabase_admin.storage.from_(bucket).upload(
            storage_path,
            sanitized,
            file_options={
                "content-type": content_type,
                "cache-control": "3600",
                "upsert": "false"
            }
        )

        # Use admin client for signed URL creation
        signed_url = supabase_admin.storage.from_(bucket).create_signed_url(
            storage_path,
            SIGNED_URL_TTL_SECONDS
        )
        signed_value = signed_url.get("signedURL") if isinstance(signed_url, dict) else None
        if not signed_value:
            raise Exception("Failed to get signed URL")
        if signed_value.startswith("http"):
            url = signed_value
        else:
            base = SUPABASE_URL.rstrip("/")
            url = f"{base}/storage/v1/object/sign/{bucket}/{signed_value}"

        upload_token = register_upload(file_hash, url)

        return {
            "success": True,
            "url": url,
            "path": storage_path,
            "filename": safe_filename,
            "hash": file_hash,
            "upload_token": upload_token,
            "size": len(sanitized),
        }

    except HTTPException as e:
        print(f"Validation error: {e.detail}")
        raise
    except Exception as e:
        print("Upload error:", e)
        raise server_error(e, "Failed to upload document")


@router.post("/validate-document")
@offload
async def validate_document(file: UploadFile = File(...), _rl: None = Depends(upload_limiter)):
    try:
        content = await file.read()

        file_ext = validate_document_file(file, content)

        # Apply sanitization checks without uploading
        if file_ext in ['.jpg', '.jpeg', '.png']:
            validate_image_safely(content, file_ext)
        elif file_ext == '.pdf':
            validate_pdf_safely(content)

        return {
            "success": True
        }

    except HTTPException as e:
        print(f"Validation error: {e.detail}")
        raise
    except Exception as e:
        print("Validation error:", e)
        raise server_error(e, "Failed to validate document")


# --------------------------------------------
# IMAGE UPLOAD (legacy route)
# --------------------------------------------
@router.post("/image")
@offload
async def upload_image_endpoint(
    file: UploadFile = File(...),
    user_context: dict = Depends(get_current_user_with_company),
    _rl: None = Depends(upload_limiter),
):
    # Authenticated only: it writes to the public car-image bucket
    try:
        url = await upload_image(file)
        return {"success": True, "url": url}

    except HTTPException:
        raise
    except Exception as e:
        raise server_error(e, "Failed to upload image")

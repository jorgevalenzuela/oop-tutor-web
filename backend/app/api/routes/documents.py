"""
Document management API routes.
"""
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse

from app.services import document_service

router = APIRouter()


@router.get("/documents")
async def list_documents():
    """List all uploaded documents."""
    documents = document_service.list_documents()
    return JSONResponse(documents)


@router.post("/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload a new document (JSON or text file)."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    # Validate file type
    allowed_extensions = {'.json', '.txt', '.md'}
    ext = '.' + file.filename.split('.')[-1].lower() if '.' in file.filename else ''
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
        )

    content = await file.read()
    result = document_service.upload_document(file.filename, content)

    return JSONResponse(result)


@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a document by ID."""
    success = document_service.delete_document(doc_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")

    return JSONResponse({"status": "success", "message": "Document deleted"})

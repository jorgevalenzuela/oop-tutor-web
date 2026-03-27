"""
Document service for handling file uploads and document management.
"""
import json
import uuid
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime


# Path to store uploaded documents metadata
UPLOADS_DIR = Path(__file__).parent.parent.parent / "uploads"
UPLOADS_METADATA_FILE = UPLOADS_DIR / "metadata.json"


def ensure_uploads_dir():
    """Ensure the uploads directory exists."""
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    if not UPLOADS_METADATA_FILE.exists():
        with open(UPLOADS_METADATA_FILE, "w", encoding="utf-8") as f:
            json.dump([], f)


def load_metadata() -> List[Dict[str, Any]]:
    """Load the uploads metadata."""
    ensure_uploads_dir()
    if UPLOADS_METADATA_FILE.exists():
        with open(UPLOADS_METADATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save_metadata(metadata: List[Dict[str, Any]]):
    """Save the uploads metadata."""
    ensure_uploads_dir()
    with open(UPLOADS_METADATA_FILE, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)


def list_documents() -> List[Dict[str, Any]]:
    """List all uploaded documents."""
    return load_metadata()


def upload_document(filename: str, content: bytes) -> Dict[str, Any]:
    """
    Upload a document and add it to the knowledge base.

    For now, this stores the file and metadata. Integration with
    the vector store would be added here.
    """
    ensure_uploads_dir()

    doc_id = str(uuid.uuid4())
    created_at = datetime.now().isoformat()

    # Parse the content
    try:
        if filename.endswith('.json'):
            data = json.loads(content.decode('utf-8'))
            if isinstance(data, list):
                topic_count = len(data)
            elif isinstance(data, dict):
                topic_count = 1
            else:
                topic_count = 0
        else:
            # Text file - count lines or treat as single entry
            text = content.decode('utf-8')
            topic_count = len(text.strip().split('\n\n')) if text.strip() else 0
    except Exception:
        topic_count = 0

    # Save the file
    file_path = UPLOADS_DIR / f"{doc_id}_{filename}"
    with open(file_path, "wb") as f:
        f.write(content)

    # Add to metadata
    metadata = load_metadata()
    doc_info = {
        "id": doc_id,
        "filename": filename,
        "filepath": str(file_path),
        "created_at": created_at,
        "topic_count": topic_count,
    }
    metadata.append(doc_info)
    save_metadata(metadata)

    return {
        "status": "success",
        "count": topic_count,
        "message": f"Uploaded {filename} with {topic_count} topics",
    }


def delete_document(doc_id: str) -> bool:
    """Delete a document by ID."""
    metadata = load_metadata()

    # Find and remove the document
    updated_metadata = []
    deleted = False

    for doc in metadata:
        if doc["id"] == doc_id:
            # Delete the file
            filepath = Path(doc.get("filepath", ""))
            if filepath.exists():
                filepath.unlink()
            deleted = True
        else:
            updated_metadata.append(doc)

    if deleted:
        save_metadata(updated_metadata)

    return deleted

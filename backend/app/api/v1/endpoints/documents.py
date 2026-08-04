import logging
from typing import List, Dict, Any
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from app.services.document_processor import document_processor
from app.services.vector_store import vector_store_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(file: UploadFile = File(...)):
    """
    Upload a document (.pdf, .docx, .txt), extract text, chunk it,
    and store vector embeddings in the in-memory vector store.
    """
    allowed_extensions = ["pdf", "docx", "doc", "txt", "md"]
    filename = file.filename or "uploaded_document.txt"
    extension = filename.split(".")[-1].lower()

    if extension not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type .{extension}. Allowed types: {', '.join(allowed_extensions)}"
        )

    try:
        contents = await file.read()
        chunks = document_processor.process_and_chunk(contents, filename)

        if not chunks:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No readable text could be extracted from the document."
            )

        stored_count = vector_store_service.add_chunks(chunks)

        return {
            "message": f"Successfully processed '{filename}'.",
            "filename": filename,
            "chunks_count": stored_count
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error handling upload for {filename}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process document: {str(e)}"
        )


@router.get("/list")
async def list_documents():
    """List all indexed documents."""
    docs = vector_store_service.get_uploaded_documents()
    return {"documents": docs}


@router.delete("/{filename}", status_code=status.HTTP_200_OK)
async def delete_document(filename: str):
    """
    Remove all vector chunks belonging to the specified document filename.
    """
    removed = vector_store_service.delete_document(filename)

    if removed == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{filename}' not found in the index."
        )

    return {
        "message": f"Document '{filename}' deleted successfully.",
        "chunks_removed": removed
    }

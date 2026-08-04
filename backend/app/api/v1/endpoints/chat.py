import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from app.services.rag_chain import rag_chain_service

logger = logging.getLogger(__name__)
router = APIRouter()

class ChatQueryRequest(BaseModel):
    query: str = Field(..., example="What is the main topic of the document?")
    top_k: Optional[int] = Field(4, ge=1, le=10)

class SourceCitation(BaseModel):
    text: str
    filename: str
    page: int
    score: float

class ChatQueryResponse(BaseModel):
    answer: str
    sources: List[SourceCitation]

@router.post("/query", response_model=ChatQueryResponse, status_code=status.HTTP_200_OK)
async def query_chat(request: ChatQueryRequest):
    """
    RAG Query Endpoint: Accepts user question, retrieves matching document passages,
    and returns GPT-4o grounded answer with source citations.
    """
    if not request.query.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query prompt cannot be empty."
        )

    try:
        result = rag_chain_service.generate_answer(request.query, top_k=request.top_k)
        return ChatQueryResponse(
            answer=result["answer"],
            sources=result["sources"]
        )
    except Exception as e:
        logger.error(f"Error executing chat query: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating answer: {str(e)}"
        )

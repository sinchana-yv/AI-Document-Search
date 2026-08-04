from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

router = APIRouter()


class DashboardSummary(BaseModel):
    user_name: str
    total_documents: int
    indexed_chunks: int
    chat_messages: int


@router.get("/summary", response_model=DashboardSummary, status_code=status.HTTP_200_OK)
def get_dashboard_summary():
    from app.services.vector_store import vector_store_service

    return DashboardSummary(
        user_name="Guest User",
        total_documents=len(vector_store_service.get_uploaded_documents()),
        indexed_chunks=len(vector_store_service.in_memory_store),
        chat_messages=0,
    )

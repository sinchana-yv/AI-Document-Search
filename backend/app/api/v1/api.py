from fastapi import APIRouter
from app.api.v1.endpoints import documents, chat, dashboard

api_router = APIRouter()
api_router.include_router(documents.router, prefix="/documents", tags=["Documents"])
api_router.include_router(chat.router, prefix="/chat", tags=["RAG Chat"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])

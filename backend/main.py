"""
Main Entry Point for the RAG Document Search Chatbot Backend API.
Built with FastAPI, CORS middleware, and RAG document/chat endpoints.
"""

import logging
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.config import settings
from app.api.v1.api import api_router

# Set up logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Initialize FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Production-ready RAG API built with FastAPI, PostgreSQL, Pinecone, and Local LLMs",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS (Cross-Origin Resource Sharing)
origins = [
    "http://localhost:3000",  # Next.js frontend local server
    "http://127.0.0.1:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 Router
app.include_router(api_router, prefix=settings.API_V1_STR)


class HealthResponse(BaseModel):
    status: str
    message: str
    version: str


@app.get("/", status_code=status.HTTP_200_OK)
async def root():
    """Root endpoint welcoming API consumers."""
    return {"message": "Welcome to AI Document Search Chatbot API (RAG)"}


@app.get("/health", response_model=HealthResponse, status_code=status.HTTP_200_OK)
async def health_check():
    """Health check endpoint to verify backend service status."""
    logger.info("Health check endpoint accessed.")
    return HealthResponse(
        status="online",
        message="Backend API is running cleanly.",
        version="1.0.0",
    )

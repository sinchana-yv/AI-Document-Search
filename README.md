# Production AI Document Search Chatbot (RAG System)

A production-grade Retrieval-Augmented Generation (RAG) platform built with Next.js, FastAPI, PostgreSQL + pgvector, Pinecone, and OpenAI GPT-4.

## System Architecture Overview

```text
[ Next.js Frontend ] <---> [ FastAPI Backend ] <---> [ PostgreSQL + pgvector ]
                                  |
                                  +-------------> [ Pinecone Vector DB ]
                                  |
                                  +-------------> [ Redis Cache ]
                                  |
                                  +-------------> [ OpenAI GPT-4 / Embeddings ]
```

## Production Folder Structure

```
rag-chatbot/
├── backend/            # FastAPI Python backend (API routes, RAG pipeline, Auth, ORM)
├── frontend/           # Next.js 14 React frontend (Tailwind CSS, UI components, pages)
├── database/           # Alembic migrations & raw SQL schemas (PostgreSQL + pgvector)
├── docker/             # Local Docker Compose setup (Postgres + Redis services)
├── docs/               # System architecture & API documentation
├── .github/            # GitHub Actions CI/CD workflows
├── .gitignore          # Version control ignore definitions
└── README.md           # Master project documentation
```

## Quick Start (Phase 1 Setup)

1. **Backend Virtual Environment & Setup**:
   ```bash
   cd backend
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   pip install -r requirements.txt
   uvicorn main:app --reload --port 8000
   ```

2. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Backend Health Check API**: `http://localhost:8000/health`
4. **Interactive Swagger Docs**: `http://localhost:8000/docs`
5. **Frontend Web UI**: `http://localhost:3000`

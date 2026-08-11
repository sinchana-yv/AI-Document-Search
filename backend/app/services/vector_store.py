import json
import logging
import os
import re
import numpy as np
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


class VectorStoreService:
    def __init__(self, store_path: str | None = None):
        self.store_path = store_path or os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "vector_store.json")
        self.in_memory_store: List[Dict[str, Any]] = []
        self._embedding_model = None
        self._load_from_disk()

    def _get_embedding_model(self):
        """Lazy-load HuggingFace embedding model on first use."""
        if self._embedding_model is None:
            logger.info("Loading FastEmbed embedding model (BAAI/bge-small-en-v1.5) for fast CPU inference...")
            from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
            self._embedding_model = FastEmbedEmbeddings(
                model_name="BAAI/bge-small-en-v1.5"
            )
            logger.info("Embedding model loaded successfully.")
        return self._embedding_model

    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        model = self._get_embedding_model()
        embeddings = model.embed_documents(texts)
        return embeddings

    def _load_from_disk(self) -> None:
        if not self.store_path:
            return

        try:
            os.makedirs(os.path.dirname(self.store_path), exist_ok=True)
            if os.path.exists(self.store_path):
                with open(self.store_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self.in_memory_store = [
                    {
                        "chunk_id": item.get("chunk_id"),
                        "vector": np.array(item.get("vector", []), dtype=np.float32),
                        "text": item.get("text", ""),
                        "filename": item.get("filename", ""),
                        "page": item.get("page", 1),
                    }
                    for item in data
                ]
                logger.info(f"Loaded {len(self.in_memory_store)} chunks from {self.store_path}")
        except Exception as e:
            logger.warning(f"Could not load vector store from disk: {e}")
            self.in_memory_store = []

    def _save_to_disk(self) -> None:
        if not self.store_path:
            return

        try:
            os.makedirs(os.path.dirname(self.store_path), exist_ok=True)
            with open(self.store_path, "w", encoding="utf-8") as f:
                json.dump([
                    {
                        "chunk_id": item["chunk_id"],
                        "vector": item["vector"].tolist(),
                        "text": item["text"],
                        "filename": item["filename"],
                        "page": item["page"],
                    }
                    for item in self.in_memory_store
                ], f)
        except Exception as e:
            logger.warning(f"Could not save vector store to disk: {e}")

    def add_chunks(self, chunks: List[Dict[str, Any]]) -> int:
        if not chunks:
            return 0

        texts = [chunk["text"] for chunk in chunks]
        embeddings = self.generate_embeddings(texts)

        for chunk, emb in zip(chunks, embeddings):
            self.in_memory_store.append({
                "chunk_id": chunk["chunk_id"],
                "vector": np.array(emb, dtype=np.float32),
                "text": chunk["text"],
                "filename": chunk["filename"],
                "page": chunk["page"]
            })

        self._save_to_disk()
        logger.info(f"Stored {len(chunks)} embedded chunks in memory and on disk.")
        return len(chunks)

    def delete_document(self, filename: str) -> int:
        """Remove all chunks belonging to a given filename."""
        before_count = len(self.in_memory_store)
        self.in_memory_store = [
            item for item in self.in_memory_store
            if item["filename"] != filename
        ]
        self._save_to_disk()
        removed = before_count - len(self.in_memory_store)
        logger.info(f"Deleted {removed} chunks for document '{filename}'.")
        return removed

    def similarity_search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        if not self.in_memory_store:
            return []

        query_embedding = self.generate_embeddings([query])[0]
        q_vec = np.array(query_embedding, dtype=np.float32)
        q_norm = np.linalg.norm(q_vec)
        query_terms = re.findall(r"[a-zA-Z0-9]+", query.lower())
        query_lower = query.lower()
        is_count_query = any(token in query_lower for token in ["how many", "how much", "number", "total", "count", "questions are there"])

        results = []
        for item in self.in_memory_store:
            doc_vec = item["vector"]
            doc_norm = np.linalg.norm(doc_vec)
            score = float(np.dot(q_vec, doc_vec) / (q_norm * doc_norm + 1e-10))

            text_lower = (item["text"] or "").lower()
            keyword_hits = sum(1 for term in query_terms if term and term in text_lower)
            if keyword_hits:
                score += 0.08 * keyword_hits

            if is_count_query:
                if re.search(r"\b(?:there are|total|count|contains|includes|contains|consists of)\b", text_lower):
                    score += 0.25
                if re.search(r"\b\d+\b", text_lower):
                    score += 0.20
                if "question" in text_lower or "questions" in text_lower:
                    score += 0.15

            if any(token in text_lower for token in ["there are", "questions", "total", "count", "number", "contains", "includes"]):
                score += 0.02

            results.append({
                "text": item["text"],
                "filename": item["filename"],
                "page": item["page"],
                "score": round(score, 4)
            })

        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]

    def get_uploaded_documents(self) -> List[Dict[str, Any]]:
        filenames = set(item["filename"] for item in self.in_memory_store)
        return [{"filename": fn} for fn in sorted(filenames)]


vector_store_service = VectorStoreService()

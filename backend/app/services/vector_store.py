import logging
import numpy as np
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


class VectorStoreService:
    def __init__(self):
        self.in_memory_store: List[Dict[str, Any]] = []
        self._embedding_model = None

    def _get_embedding_model(self):
        """Lazy-load sentence-transformers model on first use."""
        if self._embedding_model is None:
            logger.info("Loading local embedding model 'all-MiniLM-L6-v2'...")
            from sentence_transformers import SentenceTransformer
            self._embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
            logger.info("Embedding model loaded successfully.")
        return self._embedding_model

    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        model = self._get_embedding_model()
        embeddings = model.encode(texts, convert_to_numpy=True)
        return embeddings.tolist()

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

        logger.info(f"Stored {len(chunks)} embedded chunks in memory.")
        return len(chunks)

    def delete_document(self, filename: str) -> int:
        """Remove all chunks belonging to a given filename."""
        before_count = len(self.in_memory_store)
        self.in_memory_store = [
            item for item in self.in_memory_store
            if item["filename"] != filename
        ]
        removed = before_count - len(self.in_memory_store)
        logger.info(f"Deleted {removed} chunks for document '{filename}'.")
        return removed

    def similarity_search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        if not self.in_memory_store:
            return []

        query_embedding = self.generate_embeddings([query])[0]
        q_vec = np.array(query_embedding, dtype=np.float32)
        q_norm = np.linalg.norm(q_vec)

        results = []
        for item in self.in_memory_store:
            doc_vec = item["vector"]
            doc_norm = np.linalg.norm(doc_vec)
            score = float(np.dot(q_vec, doc_vec) / (q_norm * doc_norm + 1e-10))
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

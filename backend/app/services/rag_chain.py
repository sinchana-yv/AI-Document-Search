import logging
from typing import List, Dict, Any
from app.services.vector_store import vector_store_service

logger = logging.getLogger(__name__)

# Confidence threshold — answers below this score fall back to best-chunk display
QA_SCORE_THRESHOLD = 0.15


class RAGChainService:
    def __init__(self):
        self._qa_pipeline = None

    def _get_qa_pipeline(self):
        """Lazy-load extractive QA model on first use."""
        if self._qa_pipeline is None:
            logger.info("Loading extractive QA model 'deepset/roberta-base-squad2'...")
            from transformers import pipeline
            self._qa_pipeline = pipeline(
                "question-answering",
                model="deepset/roberta-base-squad2",
            )
            logger.info("QA model loaded successfully.")
        return self._qa_pipeline

    def _build_combined_context(self, docs: List[Dict[str, Any]]) -> str:
        """Merge retrieved chunks into one context block for the QA model."""
        parts = []
        for doc in docs:
            parts.append(doc["text"])
        return "\n\n".join(parts)

    def generate_answer(self, query: str, top_k: int = 5) -> Dict[str, Any]:
        # 1. Retrieve top-k relevant chunks via cosine similarity
        relevant_docs = vector_store_service.similarity_search(query, top_k=top_k)

        if not relevant_docs:
            return {
                "answer": "No relevant documents found. Please upload a document first, then ask a question about its contents.",
                "sources": []
            }

        # 2. Combine context from all retrieved chunks
        combined_context = self._build_combined_context(relevant_docs)

        # Limit to 3000 chars to stay within model token limits
        if len(combined_context) > 3000:
            combined_context = combined_context[:3000]

        # 3. Run extractive QA — finds the exact answer span in the context
        try:
            qa = self._get_qa_pipeline()
            result = qa(question=query, context=combined_context)

            answer_text = result["answer"].strip()
            confidence = result["score"]

            logger.info(f"QA answer: '{answer_text}' (confidence={confidence:.3f})")

            # If confidence is too low, enrich the answer with source context
            if confidence < QA_SCORE_THRESHOLD or len(answer_text) < 3:
                top_doc = relevant_docs[0]
                answer_text = (
                    f"{answer_text}\n\n"
                    f"**Most relevant passage** (from *{top_doc['filename']}*, page {top_doc['page']}):\n"
                    f"> {top_doc['text'][:600]}"
                )

        except Exception as e:
            logger.error(f"QA pipeline error: {str(e)}")
            # Hard fallback: return the best-matching chunk
            top_doc = relevant_docs[0]
            answer_text = (
                f"Based on '{top_doc['filename']}' (page {top_doc['page']}):\n\n"
                f"{top_doc['text']}"
            )

        return {
            "answer": answer_text,
            "sources": relevant_docs
        }


rag_chain_service = RAGChainService()

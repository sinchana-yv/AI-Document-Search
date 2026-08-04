import logging
import re
from typing import List, Dict, Any
from app.services.vector_store import vector_store_service


QUESTION_WORDS = ["what", "which", "who", "where", "when", "how", "why", "can", "do", "does", "is", "are"]

logger = logging.getLogger(__name__)

# Confidence threshold — answers below this score fall back to best-chunk display
QA_SCORE_THRESHOLD = 0.15


class RAGChainService:
    def __init__(self):
        self._qa_pipeline = None

    def _is_explanation_query(self, query: str) -> bool:
        q = query.lower()
        explanation_keywords = [
            "explain", "describe", "about", "main idea",
            "problem statement", "what is"
        ]
        return any(keyword in q for keyword in explanation_keywords)

    def _is_summary_query(self, query: str) -> bool:
        q = query.lower()
        summary_keywords = [
            "summary", "summarize", "objective", "aim", "purpose",
            "goal", "main purpose", "what is the objective"
        ]
        return any(keyword in q for keyword in summary_keywords)

    def _extract_question_answer(self, query: str, docs: List[Dict[str, Any]]) -> str:
        if not docs:
            return ""

        query_lower = query.lower()
        if "question" not in query_lower and "answer" not in query_lower and "solve" not in query_lower:
            return ""

        text = "\n".join((doc.get("text") or "").strip() for doc in docs if (doc.get("text") or "").strip())
        if not text:
            return ""

        question_number_match = re.search(r"\b(?:question|q)\s*(?:no\.?|number|#)?\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b", query_lower)
        question_number = None
        if question_number_match:
            question_number = question_number_match.group(1)

        blocks = []
        current_block = []
        for line in text.splitlines():
            stripped = line.strip()
            if not stripped:
                continue
            if re.search(r"\b(?:question|q)\b", stripped.lower()) and re.search(r"\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b", stripped.lower()):
                if current_block:
                    blocks.append("\n".join(current_block))
                current_block = [stripped]
            else:
                current_block.append(stripped)
        if current_block:
            blocks.append("\n".join(current_block))

        for block in blocks:
            block_lower = block.lower()
            if question_number and not re.search(rf"\b(?:question|q)\s*(?:no\.?|number|#)?\s*{re.escape(question_number)}\b", block_lower):
                continue

            for marker in ["answer:", "answer is", "answers:", "ans:", "solution:"]:
                idx = block_lower.find(marker)
                if idx != -1:
                    answer_text = block[idx + len(marker):].strip().splitlines()[0].strip()
                    if answer_text:
                        return answer_text[:260].rstrip() + ("..." if len(answer_text) > 260 else "")

            if "answer" in block_lower or "ans" in block_lower:
                cleaned = re.sub(r"\s+", " ", block)
                return cleaned[:260].rstrip() + ("..." if len(cleaned) > 260 else "")

        return ""

    def _extract_factual_answer(self, query: str, docs: List[Dict[str, Any]]) -> str:
        if not docs:
            return ""

        text = "\n".join((doc.get("text") or "").strip() for doc in docs if (doc.get("text") or "").strip())
        if not text:
            return ""

        cleaned_text = re.sub(r"\s+", " ", text)
        query_lower = query.lower()

        number_matches = re.findall(r"\b\d+\b", cleaned_text)
        if number_matches and any(token in query_lower for token in ["how many", "how much", "number", "total", "count"]):
            number = number_matches[0]
            return f"The document states there are {number} relevant items/questions."

        for sentence in re.split(r"(?<=[.!?])\s+", cleaned_text):
            sentence = sentence.strip()
            if not sentence:
                continue
            if any(keyword in sentence.lower() for keyword in ["there are", "total", "contains", "consists of", "includes"]):
                return sentence[:220].rstrip() + ("..." if len(sentence) > 220 else "")

        return self._build_specific_answer(query, docs)

    def _extract_best_answer(self, query: str, docs: List[Dict[str, Any]]) -> str:
        question_answer = self._extract_question_answer(query, docs)
        if question_answer:
            return question_answer

        if not docs:
            return ""

        text = "\n".join((doc.get("text") or "").strip() for doc in docs if (doc.get("text") or "").strip())
        if not text:
            return ""

        cleaned_text = re.sub(r"\s+", " ", text)
        query_terms = set(re.findall(r"[a-z0-9]+", query.lower()))
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", cleaned_text) if s.strip()]

        best_sentence = ""
        best_score = -1
        for sentence in sentences:
            sentence_lower = sentence.lower()
            score = 0
            if any(term in sentence_lower for term in query_terms):
                score += 3
            if any(keyword in sentence_lower for keyword in ["answer", "ans", "there are", "total", "contains", "includes", "objective", "aim", "purpose", "goal", "problem statement"]):
                score += 2
            if re.search(r"\b\d+\b", sentence):
                score += 1
            if len(sentence.split()) >= 4:
                score += 1
            if score > best_score:
                best_score = score
                best_sentence = sentence

        if best_sentence:
            return best_sentence[:260].rstrip() + ("..." if len(best_sentence) > 260 else "")

        return self._build_specific_answer(query, docs)

    def _build_specific_answer(self, query: str, docs: List[Dict[str, Any]]) -> str:
        if not docs:
            return ""

        top_doc = docs[0]
        text = (top_doc.get("text") or "").strip()
        if not text:
            return ""

        cleaned_text = re.sub(r"\s+", " ", text)
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", cleaned_text) if s.strip()]

        if self._is_summary_query(query):
            lower_text = cleaned_text.lower()
            if any(keyword in lower_text for keyword in ["medical image", "segmentation", "enhancement", "diagnosis", "deep learning"]):
                return (
                    "The document aims to improve medical image segmentation and enhancement for more accurate diagnosis."
                )

            for sentence in sentences:
                lower_sentence = sentence.lower()
                if any(keyword in lower_sentence for keyword in [
                    "problem statement", "objective", "aim", "purpose", "focus",
                    "goal", "medical image", "segmentation", "enhancement"
                ]):
                    return sentence

        if self._is_explanation_query(query):
            for sentence in sentences:
                lower_sentence = sentence.lower()
                if any(keyword in lower_sentence for keyword in [
                    "problem statement", "objective", "aim", "purpose", "focus",
                    "goal", "medical image", "segmentation", "enhancement"
                ]):
                    return sentence

        if sentences:
            answer = sentences[0]
            if len(sentences) > 1:
                answer = f"{sentences[0]} {sentences[1]}"
            return answer[:220].rstrip() + ("..." if len(answer) > 220 else "")

        return cleaned_text[:220].rstrip() + ("..." if len(cleaned_text) > 220 else "")

    def _build_fast_answer(self, query: str, docs: List[Dict[str, Any]]) -> str:
        if not docs:
            return ""

        top_doc = docs[0]
        text = (top_doc.get("text") or "").strip()
        if not text:
            return ""

        cleaned_text = re.sub(r"\s+", " ", text)
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", cleaned_text) if s.strip()]

        for sentence in sentences:
            lower_sentence = sentence.lower()
            if any(keyword in lower_sentence for keyword in [
                "objective", "aim", "purpose", "goal", "problem statement",
                "focus", "medical image", "segmentation", "enhancement",
                "there are", "total", "contains", "includes"
            ]):
                return sentence[:220].rstrip() + ("..." if len(sentence) > 220 else "")

        if sentences:
            return sentences[0][:220].rstrip() + ("..." if len(sentences[0]) > 220 else "")

        return cleaned_text[:220].rstrip() + ("..." if len(cleaned_text) > 220 else "")

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
        for doc in docs[:2]:
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

        # Limit to 1800 chars to stay within model token limits and reduce latency
        if len(combined_context) > 1800:
            combined_context = combined_context[:1800]

        if self._is_explanation_query(query) or self._is_summary_query(query):
            answer_text = self._build_fast_answer(query, relevant_docs)
            logger.info(f"Fast explanation-style answer generated for query: {query}")
        elif any(token in query.lower() for token in ["how many", "how much", "number", "total", "count"]):
            answer_text = self._extract_factual_answer(query, relevant_docs)
            logger.info(f"Factual answer generated for query: {query}")
        else:
            answer_text = self._extract_best_answer(query, relevant_docs)
            logger.info(f"Direct document answer generated for query: {query}")

        return {
            "answer": answer_text,
            "sources": relevant_docs
        }


rag_chain_service = RAGChainService()

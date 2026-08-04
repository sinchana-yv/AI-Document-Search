from app.services.rag_chain import RAGChainService


def test_build_fast_answer_returns_short_concise_answer():
    service = RAGChainService()
    docs = [
        {
            "text": "The objective of the document is to improve medical image segmentation accuracy using deep learning for automated diagnosis.",
            "filename": "Medical Imaging Study.pdf",
            "page": 1,
        }
    ]

    answer = service._build_fast_answer("what is the objective of the document", docs)

    assert len(answer.split()) < 30
    assert "objective" in answer.lower()
    assert "segmentation" in answer.lower()


def test_build_specific_answer_for_explain_queries():
    service = RAGChainService()
    docs = [
        {
            "text": "The problem statement focuses on medical image enhancement and segmentation using deep learning techniques for accurate diagnosis.",
            "filename": "Problem Statement of Medical Image Enhancement and segmentation.pdf",
            "page": 1,
        }
    ]

    answer = service._build_specific_answer("explain about the problem statement", docs)

    assert "problem statement" in answer.lower()
    assert "medical image" in answer.lower()
    assert "based on" not in answer.lower()
    assert len(answer.split()) < 40


def test_extract_best_answer_prefers_sentence_with_query_terms():
    service = RAGChainService()
    docs = [
        {
            "text": "Course: Digital Design and Computer Organization (BCSPCC303)",
            "filename": "BCSPCC303 QUESTION BANK.docx",
            "page": 1,
        },
        {
            "text": "There are 25 questions in total for this course.",
            "filename": "BCSPCC303 QUESTION BANK.docx",
            "page": 1,
        },
    ]

    answer = service._extract_best_answer("how many questions are there in total", docs)

    assert "25" in answer
    assert "question" in answer.lower()


def test_extract_factual_answer_for_question_count_queries():
    service = RAGChainService()
    docs = [
        {
            "text": "There are 25 questions in total for this course. Each unit contains 5 questions.",
            "filename": "BCSPCC303 QUESTION BANK.docx",
            "page": 1,
        }
    ]

    answer = service._extract_factual_answer("how many questions are there in total", docs)

    assert "25" in answer
    assert "question" in answer.lower()

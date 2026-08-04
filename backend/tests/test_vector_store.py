from app.services.vector_store import VectorStoreService


def test_vector_store_persists_chunks_across_reinitialization(tmp_path):
    store_path = tmp_path / "vector_store.json"

    service = VectorStoreService(store_path=str(store_path))
    service.generate_embeddings = lambda texts: [[1.0, 0.0] for _ in texts]

    service.add_chunks([
        {
            "chunk_id": "doc1_c1",
            "text": "This is a test chunk",
            "filename": "sample.pdf",
            "page": 1,
        }
    ])

    reloaded_service = VectorStoreService(store_path=str(store_path))

    assert len(reloaded_service.in_memory_store) == 1
    assert reloaded_service.in_memory_store[0]["filename"] == "sample.pdf"
    assert reloaded_service.in_memory_store[0]["text"] == "This is a test chunk"


def test_similarity_search_prefers_keyword_match_when_embeddings_are_tied(tmp_path):
    store_path = tmp_path / "vector_store.json"

    service = VectorStoreService(store_path=str(store_path))
    service.generate_embeddings = lambda texts: [[1.0, 1.0] for _ in texts]

    service.add_chunks([
        {
            "chunk_id": "doc1_c1",
            "text": "Course: Digital Design and Computer Organization (BCSPCC303)",
            "filename": "BCSPCC303 QUESTION BANK.docx",
            "page": 1,
        },
        {
            "chunk_id": "doc1_c2",
            "text": "There are 25 questions in total for this course.",
            "filename": "BCSPCC303 QUESTION BANK.docx",
            "page": 1,
        },
    ])

    results = service.similarity_search("how many questions are there in total", top_k=1)

    assert results[0]["text"].startswith("There are 25")


def test_similarity_search_prioritizes_number_sentences_for_count_queries(tmp_path):
    store_path = tmp_path / "vector_store.json"

    service = VectorStoreService(store_path=str(store_path))
    service.generate_embeddings = lambda texts: [[1.0, 1.0] for _ in texts]

    service.add_chunks([
        {
            "chunk_id": "doc1_c1",
            "text": "Course: Digital Design and Computer Organization (BCSPCC303)",
            "filename": "BCSPCC303 QUESTION BANK.docx",
            "page": 1,
        },
        {
            "chunk_id": "doc1_c2",
            "text": "There are 25 questions in total for this course.",
            "filename": "BCSPCC303 QUESTION BANK.docx",
            "page": 1,
        },
    ])

    results = service.similarity_search("how many questions are there", top_k=2)

    assert results[0]["text"].startswith("There are 25")

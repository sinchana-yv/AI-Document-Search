import io
import logging
from typing import List, Dict, Any
from pypdf import PdfReader
import docx
from langchain_text_splitters import RecursiveCharacterTextSplitter

logger = logging.getLogger(__name__)

class DocumentProcessor:
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""]
        )

    def extract_text(self, file_bytes: bytes, filename: str) -> List[Dict[str, Any]]:
        """
        Extracts text from bytes according to file type.
        Returns list of pages/sections with metadata.
        """
        extension = filename.split(".")[-1].lower()
        extracted_pages = []

        try:
            if extension == "pdf":
                pdf_reader = PdfReader(io.BytesIO(file_bytes))
                for idx, page in enumerate(pdf_reader.pages):
                    text = page.extract_text() or ""
                    if text.strip():
                        extracted_pages.append({
                            "text": text,
                            "page": idx + 1,
                            "filename": filename
                        })
            elif extension in ["docx", "doc"]:
                doc = docx.Document(io.BytesIO(file_bytes))
                full_text = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
                if full_text:
                    extracted_pages.append({
                        "text": full_text,
                        "page": 1,
                        "filename": filename
                    })
            elif extension in ["txt", "md"]:
                full_text = file_bytes.decode("utf-8", errors="ignore")
                if full_text.strip():
                    extracted_pages.append({
                        "text": full_text,
                        "page": 1,
                        "filename": filename
                    })
            else:
                raise ValueError(f"Unsupported file type extension: .{extension}")

        except Exception as e:
            logger.error(f"Error processing file {filename}: {str(e)}")
            raise e

        return extracted_pages

    def process_and_chunk(self, file_bytes: bytes, filename: str) -> List[Dict[str, Any]]:
        """
        Extracts text and chunks it into smaller semantic pieces for vector search.
        """
        pages = self.extract_text(file_bytes, filename)
        chunks = []

        chunk_id = 0
        for page_data in pages:
            text = page_data["text"]
            page_num = page_data["page"]
            split_texts = self.text_splitter.split_text(text)

            for snippet in split_texts:
                chunk_id += 1
                chunks.append({
                    "chunk_id": f"{filename}_c{chunk_id}",
                    "text": snippet,
                    "filename": filename,
                    "page": page_num,
                })

        return chunks

document_processor = DocumentProcessor()

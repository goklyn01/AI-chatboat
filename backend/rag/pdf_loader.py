from typing import List

import pdfplumber

def load_pdf_text(pdf_path: str) -> str:
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            text += page_text + "\n"
    return text


def chunk_text(text: str, max_tokens: int = 500) -> List[str]:
    """
    Very simple text chunking based on character length as a proxy for tokens.
    In a production system you might use a tokenizer instead.
    """
    words = text.split()
    chunks: List[str] = []
    current: List[str] = []
    current_len = 0

    for w in words:
        current.append(w)
        current_len += len(w) + 1
        if current_len >= max_tokens:
            chunks.append(" ".join(current))
            current = []
            current_len = 0

    if current:
        chunks.append(" ".join(current))

    return chunks

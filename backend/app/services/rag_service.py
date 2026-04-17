"""
Shared RAG service — retrieval + answer generation used by both
/api/query (Explore mode) and /api/socratic/chat (Guided Discovery mode).
"""

import re
from typing import List, Any

from app.services import retriever_service, query_service
from app.services.guardrail import response_is_valid, FALLBACK_RESPONSE


def parse_structured_response(raw_response: str) -> dict:
    """Parse LLM response into 4 structured sections."""
    sections = {"english": "", "oop": "", "uml": "", "csharp": ""}
    pattern = r'###\s*(ENGLISH|OOP|UML|CSHARP)\s*\n(.*?)(?=###\s*(?:ENGLISH|OOP|UML|CSHARP)|$)'
    matches = re.findall(pattern, raw_response, re.DOTALL | re.IGNORECASE)
    for section_name, content in matches:
        key = section_name.lower()
        if key in sections:
            sections[key] = content.strip()
    return sections


async def get_rag_context(concept: str) -> List[Any]:
    """Retrieve knowledge base documents for a concept."""
    return await retriever_service.retrieve(concept)


async def generate_rag_answer(question: str) -> dict:
    """Run RAG retrieval + LLM chain for a question. Returns 4-section dict.
    Retries once on malformed output; falls back to FALLBACK_RESPONSE."""
    reviews = await retriever_service.retrieve(question)
    result = await query_service.run_chain(question, reviews)
    answer = parse_structured_response(str(result))

    if not response_is_valid(answer):
        result2 = await query_service.run_chain(question, reviews)
        answer2 = parse_structured_response(str(result2))
        if response_is_valid(answer2):
            return answer2
        return FALLBACK_RESPONSE

    return answer

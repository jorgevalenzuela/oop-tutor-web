import asyncio
import re
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse

from app.services import retriever_service
from app.services import query_service
from app.services.guardrail import classify_input, response_is_valid, FALLBACK_RESPONSE
from app.models.schemas import StructuredAnswer, StructuredQueryResponse

router = APIRouter()


def parse_structured_response(raw_response: str) -> StructuredAnswer:
    """Parse LLM response into 4 structured sections."""
    sections = {
        "english": "",
        "oop": "",
        "uml": "",
        "csharp": ""
    }

    pattern = r'###\s*(ENGLISH|OOP|UML|CSHARP)\s*\n(.*?)(?=###\s*(?:ENGLISH|OOP|UML|CSHARP)|$)'
    matches = re.findall(pattern, raw_response, re.DOTALL | re.IGNORECASE)

    for section_name, content in matches:
        key = section_name.lower()
        if key in sections:
            sections[key] = content.strip()

    return StructuredAnswer(**sections)


async def _run_query(question: str) -> dict:
    """Run retrieval + chain and return parsed answer dict. Returns fallback on parse failure."""
    reviews = await retriever_service.retrieve(question)
    result = await query_service.run_chain(question, reviews)
    raw_response = str(result)
    parsed = parse_structured_response(raw_response)
    answer = {
        "english": parsed.english,
        "oop": parsed.oop,
        "uml": parsed.uml,
        "csharp": parsed.csharp,
    }

    # Structural output validation: retry once if malformed
    if not response_is_valid(answer):
        result2 = await query_service.run_chain(question, reviews)
        raw2 = str(result2)
        parsed2 = parse_structured_response(raw2)
        answer2 = {
            "english": parsed2.english,
            "oop": parsed2.oop,
            "uml": parsed2.uml,
            "csharp": parsed2.csharp,
        }
        if response_is_valid(answer2):
            return answer2
        return FALLBACK_RESPONSE

    return answer


@router.post("/query")
async def query_endpoint(payload: dict):
    """Query endpoint that returns structured 4-column response."""
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="payload must be a JSON object")
    question = payload.get("question")
    if not question:
        raise HTTPException(status_code=400, detail="missing 'question' field")

    # Semantic input guardrail
    guard = await classify_input(question)
    if not guard.allow:
        return JSONResponse({
            "question": question,
            "answer": guard.response,
            "raw_response": "",
        })

    answer = await _run_query(question)

    return JSONResponse({
        "question": question,
        "answer": answer,
        "raw_response": "",
    })


@router.post("/query/stream")
async def query_stream(payload: dict):
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="payload must be a JSON object")
    question = payload.get("question")
    if not question:
        raise HTTPException(status_code=400, detail="missing 'question' field")

    # Semantic input guardrail
    guard = await classify_input(question)
    if not guard.allow:
        import json as _json

        async def blocked_gen():
            yield f"data: {_json.dumps({'chunk': str(guard.response)})}\n\n"

        return StreamingResponse(blocked_gen(), media_type="text/event-stream")

    reviews = await retriever_service.retrieve(question)
    result = await query_service.run_chain(question, reviews)

    async def event_generator():
        text = str(result)
        chunk_size = 256
        for i in range(0, len(text), chunk_size):
            chunk = text[i : i + chunk_size]
            yield f"data: {{\"chunk\": {repr(chunk)} }}\n\n"
            await asyncio.sleep(0.05)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

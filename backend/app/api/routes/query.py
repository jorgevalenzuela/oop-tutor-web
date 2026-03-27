import asyncio
import re
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse

from app.services import retriever_service
from app.services import query_service
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

    # Pattern to match sections: ### ENGLISH, ### OOP, ### UML, ### CSHARP
    pattern = r'###\s*(ENGLISH|OOP|UML|CSHARP)\s*\n(.*?)(?=###\s*(?:ENGLISH|OOP|UML|CSHARP)|$)'
    matches = re.findall(pattern, raw_response, re.DOTALL | re.IGNORECASE)

    for section_name, content in matches:
        key = section_name.lower()
        if key in sections:
            sections[key] = content.strip()

    return StructuredAnswer(**sections)


@router.post("/query")
async def query_endpoint(payload: dict):
    """Query endpoint that returns structured 4-column response."""
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="payload must be a JSON object")
    question = payload.get("question")
    if not question:
        raise HTTPException(status_code=400, detail="missing 'question' field")

    # Retrieve context documents (async to avoid blocking)
    reviews = await retriever_service.retrieve(question)

    # Run chain in async wrapper
    result = await query_service.run_chain(question, reviews)

    # Parse raw response into structured format
    raw_response = str(result)
    structured_answer = parse_structured_response(raw_response)

    return JSONResponse({
        "question": question,
        "answer": {
            "english": structured_answer.english,
            "oop": structured_answer.oop,
            "uml": structured_answer.uml,
            "csharp": structured_answer.csharp
        },
        "raw_response": raw_response
    })


@router.post("/query/stream")
async def query_stream(payload: dict):
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="payload must be a JSON object")
    question = payload.get("question")
    if not question:
        raise HTTPException(status_code=400, detail="missing 'question' field")

    # Retrieve docs and run chain to get full response
    reviews = await retriever_service.retrieve(question)
    result = await query_service.run_chain(question, reviews)

    # Stream the result in small chunks as SSE
    async def event_generator():
        text = str(result)
        chunk_size = 256
        for i in range(0, len(text), chunk_size):
            chunk = text[i : i + chunk_size]
            yield f"data: {{\"chunk\": {repr(chunk)} }}\n\n"
            await asyncio.sleep(0.05)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

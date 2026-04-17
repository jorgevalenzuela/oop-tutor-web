import asyncio
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse

from app.services import retriever_service
from app.services import query_service
from app.services.guardrail import classify_input
from app.services.rag_service import generate_rag_answer
from app.models.schemas import StructuredQueryResponse

router = APIRouter()


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

    answer = await generate_rag_answer(question)

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

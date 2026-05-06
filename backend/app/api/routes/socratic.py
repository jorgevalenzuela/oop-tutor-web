"""
POST /api/socratic/chat — Guided Discovery (Socratic-Zuela) endpoint.

Applies the input guardrail only at steps 3-4 (Bridge / Formalize), then
delegates to socratic_service.get_socratic_response() which runs Jorge
Valenzuela's 6-step pedagogical method.

Does NOT modify /api/query — fully additive.
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from app.services.guardrail import classify_input
from app.services.socratic_service import get_socratic_response

router = APIRouter()


@router.post("/socratic/chat")
async def socratic_chat(payload: dict):
    """
    Request body:
        concept       str   — OOP concept being explored
        step          int   — current step 1-6 (default 1)
        bloom_level   int   — Bloom's taxonomy level 1-6 (default 3)
        history       list  — [{role: "user"|"assistant", content: str}]
        student_message str — student's latest message (empty string for step-1 opener)

    Returns:
        message, step, tone, is_complete, reward?, related_concept?, exam_nudge?
    """
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="payload must be a JSON object")

    concept = payload.get("concept", "").strip()
    step = payload.get("step", 1)
    bloom_level = payload.get("bloom_level", 3)
    history = payload.get("history", [])
    student_message = payload.get("student_message", "").strip()

    if not concept:
        raise HTTPException(status_code=400, detail="missing 'concept' field")

    if not isinstance(step, int) or step < 1 or step > 6:
        raise HTTPException(status_code=400, detail="'step' must be an integer 1-6")

    if not isinstance(history, list):
        raise HTTPException(status_code=400, detail="'history' must be a list")

    # Short affirmatives (≤3 words or common acknowledgement phrases) are always
    # safe — guardrailing "yes", "ok", "i see" as off-topic would break the flow.
    SHORT_AFFIRMATIVES = {
        "yes", "no", "sure", "okay", "ok", "right", "exactly",
        "i see", "makes sense", "got it", "agreed", "correct",
        "yep", "nope", "yeah", "nah", "interesting", "true",
    }

    # Guardrail window: steps 3-4 only (Bridge and Formalize).
    # Steps 1-2: free association — any response is valid by design.
    # Steps 5-6: Implement and Confirm — student is wrapping up; expressions
    #   like "I want to code this" or "can I explain it to a friend?" are
    #   completion signals, not off-topic messages.
    _is_short_affirmative = (
        student_message.lower().strip() in SHORT_AFFIRMATIVES
        or len(student_message.split()) <= 3
    )
    if student_message and 3 <= step <= 4 and not _is_short_affirmative:
        guard = await classify_input(student_message)
        if not guard.allow:
            fallback_msg = (
                guard.response.get("english", "Please keep your messages related to OOP concepts.")
                if guard.response
                else "Please keep your messages related to OOP concepts."
            )
            return JSONResponse({
                "message": fallback_msg,
                "step": step,
                "tone": "patient_professor",
                "is_complete": False,
                "related_concept": None,
                "exam_nudge": None,
            })

    result = await get_socratic_response(
        concept=concept,
        step=step,
        bloom_level=int(bloom_level),
        history=history,
        student_message=student_message,
    )

    return JSONResponse(result)

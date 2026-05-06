"""
Socratic service — Jorge Valenzuela's 6-step guided discovery dialogue.

Tone selection:
  bloom 1-2  → curious_colleague
  bloom 3-4  → patient_professor
  bloom 5-6  → socratic_challenger
  message < 10 words → curious_colleague (override)
  message is confident + detailed → socratic_challenger (override)

Step prompts encode the 6-step pedagogical method.
LLM is instructed to return JSON: { message, is_complete, related_concept, exam_nudge }
Reward (3-pane: english, oop, csharp) is generated via the shared RAG pipeline
when is_complete=True.
"""

import json
import os
from typing import List, Optional

import anyio

from app.services.rag_service import get_rag_context, generate_rag_answer

# ─── Tone constants ───────────────────────────────────────────────────────────

TONE_CURIOUS = "curious_colleague"
TONE_PATIENT = "patient_professor"
TONE_CHALLENGER = "socratic_challenger"

_TONE_INSTRUCTIONS = {
    TONE_CURIOUS: (
        "Tone: Be a curious colleague — warm, enthusiastic, exploratory. "
        "Use short questions and light encouragement. Keep it conversational."
    ),
    TONE_PATIENT: (
        "Tone: Be a patient professor — calm, methodical, supportive. "
        "Explain clearly without rushing. Build understanding step by step."
    ),
    TONE_CHALLENGER: (
        "Tone: Be a Socratic challenger — probe with deeper questions, "
        "push for precision and specificity, celebrate good reasoning."
    ),
}

# ─── Step prompts ─────────────────────────────────────────────────────────────

_STEP_PROMPTS = {
    1: (
        'Step 1 — Activate: Open with "What comes to mind when you hear [concept]?" '
        "Encourage any initial association, right or wrong. Be non-judgmental."
    ),
    2: (
        "Step 2 — Anchor: Offer a concrete real-world or physical analogy that connects "
        "to the concept. Make it tangible and relatable to everyday life."
    ),
    3: (
        "Step 3 — Bridge: Connect the real-world example to the OOP domain. Use "
        "transitional language to guide the student from the analogy to the abstraction."
    ),
    4: (
        "Step 4 — Formalize: Introduce OOP terms and principles related to the concept "
        "(e.g. encapsulation, inheritance, abstraction, polymorphism). Be precise."
    ),
    5: (
        "Step 5 — Implement: Guide the student toward thinking about how this concept "
        "appears in C# code. Ask questions rather than giving answers. Hint at syntax."
    ),
    6: (
        'Step 6 — Confirm: Ask "Is the concept clearer now? How do you feel about '
        'your understanding?" If the student expresses confidence or satisfaction, '
        "set is_complete to true. Also set it to true if you've already confirmed "
        "understanding in a prior turn at step 6."
    ),
}

# ─── System prompt template ───────────────────────────────────────────────────

_SYSTEM_PROMPT = """You are an OOP tutor guiding a student through a structured discovery dialogue about "{concept}".

Current step: {step} of 6
{step_instruction}

{tone_instruction}

Knowledge base context for "{concept}":
{context}

Conversation so far:
{history}

Instructions:
- Respond with ONE focused message appropriate to the current step.
- Stay at step {step} — do not skip ahead.
- Keep responses concise: 2-4 sentences for steps 1-5; up to 6 sentences for step 4 and 6.
- Never mention step numbers or the 6-step method to the student.
- If the conversation is at step 6 and the student has confirmed understanding, set is_complete to true.
- When setting is_complete to true, you may suggest a related_concept (e.g. "Polymorphism") and an exam_nudge (short encouraging sentence).

Important: You have no memory of previous concept sessions. Each concept
starts fresh. If the student references a previous conversation, acknowledge
it warmly and briefly: "Each concept session starts fresh for me, but that's
actually great — it means we build on what you already know! You mentioned
[concept] — let's connect that to what we're exploring now."
Then continue the dialogue naturally using the connection the student made.

Respond with ONLY this JSON (no markdown, no explanation outside the JSON):
{{"message": "your response here", "is_complete": false, "related_concept": null, "exam_nudge": null}}"""

# ─── Tone selection ───────────────────────────────────────────────────────────

_CONFIDENT_MARKERS = {
    "because", "therefore", "specifically", "for example", "such as",
    "means that", "is defined as", "in other words", "which means",
    "can be described as", "allows us to",
}


def _select_tone(bloom_level: int, student_message: str) -> str:
    words = student_message.strip().split()
    if len(words) < 10:
        return TONE_CURIOUS
    msg_lower = student_message.lower()
    is_confident = any(m in msg_lower for m in _CONFIDENT_MARKERS) and len(words) > 15
    if is_confident:
        return TONE_CHALLENGER
    if bloom_level <= 2:
        return TONE_CURIOUS
    if bloom_level <= 4:
        return TONE_PATIENT
    return TONE_CHALLENGER


# ─── Synchronous Claude call ──────────────────────────────────────────────────

def _call_claude_sync(
    concept: str,
    step: int,
    bloom_level: int,
    history: List[dict],
    student_message: str,
    context_text: str,
) -> dict:
    """
    Synchronous Anthropic API call — runs in a thread via anyio.
    Returns safe fallback dict on any error.
    """
    try:
        import anthropic

        api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        if not api_key:
            return _fallback_response(concept, step)

        tone = _select_tone(bloom_level, student_message)

        # Build history string
        history_lines = []
        for msg in history:
            role_label = "Tutor" if msg.get("role") == "assistant" else "Student"
            history_lines.append(f"{role_label}: {msg.get('content', '')}")
        if student_message.strip():
            history_lines.append(f"Student: {student_message}")
        history_text = "\n".join(history_lines) if history_lines else "(conversation just started)"

        prompt = _SYSTEM_PROMPT.format(
            concept=concept,
            step=step,
            step_instruction=_STEP_PROMPTS.get(step, _STEP_PROMPTS[6]),
            tone_instruction=_TONE_INSTRUCTIONS[tone],
            context=context_text[:1500] if context_text else "(no context available)",
            history=history_text,
        )

        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )

        raw = message.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        data = json.loads(raw)
        return {
            "message": str(data.get("message", "")),
            "is_complete": bool(data.get("is_complete", False)),
            "related_concept": data.get("related_concept"),
            "exam_nudge": data.get("exam_nudge"),
            "tone": tone,
        }

    except Exception:
        return _fallback_response(concept, step)


def _fallback_response(concept: str, step: int) -> dict:
    if step == 1:
        msg = f"What comes to mind when you hear the term \"{concept}\"?"
    elif step == 6:
        msg = "Is the concept clearer now? How do you feel about your understanding so far?"
    else:
        msg = f"Let's continue exploring \"{concept}\". What connections are you making so far?"
    return {
        "message": msg,
        "is_complete": False,
        "related_concept": None,
        "exam_nudge": None,
        "tone": TONE_CURIOUS,
    }


# ─── Public async API ─────────────────────────────────────────────────────────

async def get_socratic_response(
    concept: str,
    step: int,
    bloom_level: int,
    history: List[dict],
    student_message: str,
) -> dict:
    """
    Generate a Socratic dialogue response for a given step.

    Returns::

        {
          message: str,
          step: int,
          tone: str,
          is_complete: bool,
          reward?: { english, oop, csharp },   # only when is_complete=True
          related_concept?: str | None,
          exam_nudge?: str | None,
        }
    """
    # Retrieve knowledge base context for the concept
    docs = await get_rag_context(concept)
    context_text = "\n".join(str(doc) for doc in docs[:3]) if docs else ""

    result = await anyio.to_thread.run_sync(
        lambda: _call_claude_sync(
            concept, step, bloom_level, history, student_message, context_text
        )
    )

    response: dict = {
        "message": result["message"],
        "step": step,
        "tone": result.get("tone", TONE_CURIOUS),
        "is_complete": result["is_complete"],
        "related_concept": result.get("related_concept"),
        "exam_nudge": result.get("exam_nudge"),
    }

    # Generate 3-pane reward when dialogue completes
    if result["is_complete"]:
        reward_raw = await generate_rag_answer(
            f"Explain {concept} in Object-Oriented Programming with C# code examples"
        )
        response["reward"] = {
            "english": reward_raw.get("english", ""),
            "oop": reward_raw.get("oop", ""),
            "csharp": reward_raw.get("csharp", ""),
        }

    return response

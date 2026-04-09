# OOP Tutor Web

> *"Teaching OOP the way a professor would — in four layers:
> plain English, object-oriented thinking, visual UML, and working C# code."*

A full-stack AI-powered learning and assessment platform for
Object-Oriented Programming. Students explore concepts through
an interactive 3D concept map, get structured AI responses,
demonstrate mastery through an adaptive exam engine, and earn
verifiable certificates of completion.

Built by Jorge Valenzuela — CS Professor & Software Engineer.

---

## What It Does

### For Students
- **3D Concept Map** — navigate 28 OOP concepts visually.
  Click any node to ask the tutor. The map colors by mastery level
  as you progress.
- **Four-Pane Response** — every question answered in four layers:
  plain English · OOP thinking · UML diagram · C# code
- **Guardrails** — AI-powered semantic guardrail ensures all
  interactions stay focused on OOP concepts
- **OOP Comprehensive Exam** — adaptive exam engine with AI grading.
  Variable length — stops when mastery is determined.
- **Bloom's Taxonomy** — exam questions progress through 6 cognitive
  levels: Remember → Understand → Apply → Analyze → Evaluate → Create
- **Progress Tracking** — collapsible concept hierarchy showing
  mastery per concept across all attempts
- **Certificate of Completion** — generated as a PDF when all
  concepts are mastered. Publicly verifiable.
- **Discussion Board** — post questions, get responses from the
  instructor. All interaction stays within the platform.

### For Instructors
- **Question Bank** — AI generates questions per concept, difficulty,
  and Bloom's level. Instructor reviews and approves before going live.
- **Mastery Configuration** — configure score thresholds, consecutive
  correct requirements, and minimum Bloom's level per concept
- **Instructor Dashboard** — class analytics, Bloom's performance
  breakdown, student progress table, CSV export
- **Certificate Management** — issue or revoke certificates manually
- **Feedback Dashboard** — tutor response ratings and flagged questions

---

## Architecture
```
frontend/          React + TypeScript + Vite (port 5173)
backend/           Python + FastAPI + RAG tutor (port 8000)
assessment/        Node.js + Express + SQLite (port 3002)
```

**Three services, one monorepo:**
- The RAG tutor backend handles concept queries via
  Ollama + LangChain + Chroma, with Claude API semantic guardrail
- The assessment backend handles auth, exams, mastery,
  certificates, and feedback via Claude API
- The frontend connects to both

**Guardrail pipeline:**
Student input → Claude haiku classifier (meta/injection/off-topic/OOP)
→ if OOP: RAG pipeline → 4-section structured response

**Assessment pipeline:**
Student answer → Claude API grading → Bloom's level check →
mastery algorithm (score ≥ 80% AND 3 consecutive correct at
min Bloom's level) → certificate

---

## Stack

**Frontend**
- React + TypeScript + Vite + Tailwind CSS
- Three.js — 3D interactive concept map
- Monaco Editor — C# code writing questions
- Mermaid.js — UML diagram rendering
- dnd-kit — concept matching drag and drop

**RAG Backend**
- Python + FastAPI + Uvicorn
- LangChain + Ollama (llama3.2) + Chroma
- mxbai-embed-large embeddings
- Claude API (claude-haiku) — semantic guardrail

**Assessment Backend**
- Node.js + Express + TypeScript
- SQLite via better-sqlite3
- Claude API (claude-sonnet) — question generation + grading
- Nodemailer — magic link auth + discussion notifications
- PDFKit — certificate generation

---

## Quick Start

**Prerequisites:** Ollama running locally, Node.js 22.5+, Python 3.13
```bash
# Terminal 1 — RAG backend
cd backend
python3.13 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Terminal 2 — Assessment backend
cd assessment
cp .env.example .env   # fill in API keys
npm install
npm run dev

# Terminal 3 — Frontend
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

**Environment variables needed:**
- `backend/.env` — ANTHROPIC_API_KEY (for guardrail)
- `assessment/.env` — ANTHROPIC_API_KEY, EMAIL_* (for magic link + notifications)

**First time setup:**
1. Log in with your email (magic link sent to inbox)
2. Update role to INSTRUCTOR if needed
3. Run seed script: `cd assessment && npx ts-node scripts/seed-questions.ts`
4. Approve questions in Settings → Question Bank

---

## Assessment Features

| Feature | Details |
|---|---|
| Authentication | Magic link — email + 6-digit code, no passwords |
| Question types | Multiple choice, free-form, code writing, concept matching |
| Bloom's levels | 6 levels: Remember, Understand, Apply, Analyze, Evaluate, Create |
| AI grading | MC/matching graded locally, free-form/code via Claude API |
| Difficulty | Adapts per attempt: L1 → L1-2 → ALL → L2-3 → L3 only |
| Bloom's mapping | Attempt 1: L1-2, Attempt 2: L1-3, 3-5: All, 6-8: L3-5, 9+: L5-6 |
| Mastery | Score ≥ 80% AND 3 consecutive correct at min Bloom's level (default: Apply) |
| Guardrail | Claude semantic classifier — meta/injection/off-topic detection |
| Certificate | PDF with concept scores, verification code, instructor signature |
| Verification | Public endpoint — no auth required |

---

## Release History

| Version | What shipped |
|---|---|
| v1.0.0 | Original text input RAG tutor |
| v2.0.0 | 3D concept map with accessibility features |
| v2.1.0 | Magic link auth + AI question bank |
| v2.2.0 | Exam engine + AI grading |
| v2.3.0 | Mastery algorithm + progress tracking + settings |
| v2.4.0 | Certificate generation + PDF |
| v2.5.0 | Instructor + TA dashboard + CSV export |
| v2.6.0 | Guardrails + feedback module + Bloom's taxonomy |

---

## Part of AI-SDLC

This project was built following the **AI-SDLC framework** —
a structured approach to software engineering in the age of AI.
Every significant decision is documented in the
[Decision Intelligence System](https://github.com/jorgevalenzuela/decision-intelligence).

See [DECISIONS.md](./DECISIONS.md) for the decision log.

---

## Author

**Jorge Valenzuela** — Computer Science Professor & Software Engineer
Building at the intersection of AI, education, and software engineering.
GitHub: [jorgevalenzuela](https://github.com/jorgevalenzuela)
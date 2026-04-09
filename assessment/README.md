# OOP Tutor Web

> *"Teaching OOP the way a professor would — in four layers:
> plain English, object-oriented thinking, visual UML, and working C# code."*

A full-stack AI-powered learning and assessment platform for 
Object-Oriented Programming. Students explore concepts through 
an interactive 3D concept map, get structured AI responses, 
and demonstrate mastery through an adaptive exam engine. 
Instructors monitor progress, manage content, and issue 
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
- **OOP Comprehensive Exam** — adaptive exam engine with AI grading. 
  Variable length — stops when mastery is determined.
- **Progress Tracking** — collapsible concept hierarchy showing 
  mastery per concept across all attempts
- **Certificate of Completion** — generated as a PDF when all 
  concepts are mastered. Publicly verifiable.

### For Instructors
- **Question Bank** — AI generates questions per concept and 
  difficulty. Instructor reviews and approves before going live.
- **Mastery Configuration** — configure score thresholds and 
  consecutive correct requirements per concept
- **Instructor Dashboard** — class analytics, student progress 
  table, student detail view, CSV export
- **Certificate Management** — issue or revoke certificates manually

---

## Architecture
```
frontend/          React + TypeScript + Vite (port 5173)
backend/           Python + FastAPI + RAG tutor (port 8000)
assessment/        Node.js + Express + SQLite (port 3002)
```

**Three services, one monorepo:**
- The RAG tutor backend handles concept queries via 
  Ollama + LangChain + Chroma
- The assessment backend handles auth, exams, mastery, 
  and certificates via Claude API
- The frontend connects to both

**RAG pipeline:**
Student question → Chroma vector search (k=5) → 
LangChain prompt → llama3.2 → 4-section structured response

**Assessment pipeline:**
Student answer → Claude API grading → mastery algorithm 
(score ≥ 80% AND 3 consecutive correct) → certificate

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

**Assessment Backend**
- Node.js + Express + TypeScript
- SQLite via better-sqlite3
- Claude API (claude-sonnet-4-20250514) — question generation + grading
- Nodemailer — magic link authentication
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

**First time setup:**
1. Log in with your email (magic link sent to inbox)
2. Update your role to INSTRUCTOR in the DB if needed
3. Generate questions: Settings → Mastery Thresholds
4. Or run: `cd assessment && npx ts-node src/seed-questions.ts`

---

## Assessment Features

| Feature | Details |
|---|---|
| Authentication | Magic link — email + 6-digit code, no passwords |
| Question types | Multiple choice, free-form, code writing, concept matching |
| AI grading | MC/matching graded locally, free-form/code via Claude API |
| Difficulty | Adapts per attempt: L1 → L1-2 → ALL → L2-3 → L3 only |
| Mastery | Score ≥ 80% AND 3 consecutive correct per concept |
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
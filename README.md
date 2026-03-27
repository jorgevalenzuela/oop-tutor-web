# OOP Tutor Web

> *"Teaching OOP the way a professor would — in four layers: 
> plain English, object-oriented thinking, visual UML, and working C# code."*

An AI-powered web tutor for Object-Oriented Programming concepts, 
built on RAG architecture with a local LLM and vector database. 
Designed to teach OOP the way an experienced professor would — 
structured, layered, and pedagogically intentional.

## Why This Exists

Most AI tools answer questions generically. This tutor answers 
OOP questions the way a professor teaches — breaking every concept 
into four deliberate layers that build on each other. The result 
is not just an answer, but a complete learning experience.

This tool was built to support CS students learning OOP concepts 
in any course at any institution. It is course-agnostic by design.

## The Four-Pane Response

Every question gets answered in four structured panes:

| Pane | What it is/does |
|---|---|
| **English** | Plain language explanation — no jargon |
| **OOP** | Object-oriented thinking — concepts, principles, patterns |
| **UML** | Visual UML diagram — rendered from Mermaid.js |
| **C#** | Working code example with syntax highlighting |

This structure is intentional — it mirrors how an experienced 
professor scaffolds a concept from intuition to implementation.

## Architecture

- **RAG (Retrieval Augmented Generation)** — questions are matched 
  against a curated knowledge base using vector similarity search
- **Static knowledge base** — OOP concepts don't change. 
  The knowledge base is curated by the instructor, not scraped 
  from the web. This is a feature, not a limitation.
- **100% local** — no cloud APIs, no data leaves your machine
- **Knowledge graph** — visual map of OOP concept relationships

## Stack

**Frontend**
- React + TypeScript + Vite
- Tailwind CSS — lavender/purple custom theme
- Mermaid.js — UML class diagram rendering
- Prism.js — C# syntax highlighting
- React Flow + Dagre — knowledge concept graph

**Backend**
- FastAPI + Python
- LangChain — chain orchestration and prompt templates
- Ollama + llama3.2 — local LLM inference
- Chroma — local vector database
- mxbai-embed-large — local embedding model

## Quick Start

Make sure Ollama is running first:
```bash
ollama serve
ollama pull llama3.2
ollama pull mxbai-embed-large
```

Terminal 1 — Backend:
```bash
cd backend
python3.13 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
# API running at http://localhost:8000
```

Terminal 2 — Frontend:
```bash
cd frontend
npm install
npm run dev
# App running at http://localhost:5173
```

## Roadmap

- [ ] Load instructor's own teaching materials as knowledge base
- [ ] Quiz and assessment module
- [ ] Student progress tracking
- [ ] Cloud API option for faster inference
- [ ] Multi-language support beyond C#

## Part of AI-SDLC


Engineering decisions made during construction are tracked 
in the [Decision Intelligence System](https://github.com/jorgevalenzuela/decision-intelligence) 
and documented in [DECISIONS.md](./DECISIONS.md).

## Author

Jorge Valenzuela — Computer Science Professor & Software Engineer  
Building at the intersection of AI, education, and software engineering.
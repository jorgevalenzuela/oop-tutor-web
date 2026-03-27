# OOP Tutor Web — Technology Stack

## Frontend

| Category | Technology | Version/Notes |
|---|---|---|
| Framework | React | 18.x |
| Language | TypeScript | 5.x |
| Build Tool | Vite | 5.x |
| Styling | Tailwind CSS | 3.x — lavender/purple custom theme |
| UI Components | Radix UI | Dialog, primitives |
| Icons | Lucide React | — |
| HTTP Client | Axios | — |
| UML Rendering | Mermaid.js | Renders class diagrams to SVG |
| Syntax Highlighting | Prism.js | C# language support |
| Graph Visualization | React Flow + Dagre | Knowledge concept graph |

## Backend

| Category | Technology | Version/Notes |
|---|---|---|
| Framework | FastAPI | Python async web framework |
| ASGI Server | Uvicorn | Runs FastAPI |
| Async Utilities | AnyIO | Thread offloading for LLM calls |
| Data Validation | Pydantic | Request/response schemas |

## AI / LLM

| Category | Technology | Version/Notes |
|---|---|---|
| LLM Runtime | Ollama | Runs models locally |
| Language Model | llama3.2 | Local, no cloud API needed |
| Embedding Model | mxbai-embed-large | Local via Ollama |
| AI Framework | LangChain | Chain orchestration, prompt templates |
| LLM Integration | langchain-ollama | OllamaLLM + OllamaEmbeddings |

## Database / Storage

| Category | Technology | Version/Notes |
|---|---|---|
| Vector Database | Chroma | Persistent local storage |
| Embedding Store | Chroma + LangChain | k=5 similarity retrieval (RAG) |

## Architecture Pattern

- **RAG (Retrieval-Augmented Generation)**: User question → Chroma vector similarity search (k=5) → retrieved context + question → llama3.2 → structured 4-section response
- **Structured Output**: LLM prompted to always return exactly 4 sections: `### ENGLISH`, `### OOP`, `### UML`, `### CSHARP`
- **Response Parsing**: Regex extracts sections from raw LLM output
- **100% Local**: No cloud APIs — everything runs on the local machine

## Project Structure

```
oop-tutor-web/
├── frontend/          # React + Vite + TypeScript
│   └── src/
│       ├── components/
│       │   ├── query/     # QueryInput, FourColumnView, UMLDiagram, CodeBlock
│       │   ├── graph/     # Knowledge graph (React Flow)
│       │   └── settings/  # Document management
│       └── services/
│           └── api.ts     # Axios API client
└── backend/           # FastAPI + LangChain
    ├── app/
    │   ├── api/routes/    # query.py, graph.py, documents.py
    │   ├── services/      # query_service.py, retriever_service.py
    │   └── models/        # Pydantic schemas
    └── local_langchain_core/
        ├── main.py        # LangChain chain + prompt
        └── vector.py      # Chroma retriever setup
```

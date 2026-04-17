from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import query as query_router
from app.api.routes import graph as graph_router
from app.api.routes import documents as documents_router
from app.api.routes import socratic as socratic_router

app = FastAPI(title="CIS501 Assistant Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(query_router.router, prefix="/api")
app.include_router(graph_router.router, prefix="/api")
app.include_router(documents_router.router, prefix="/api")
app.include_router(socratic_router.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)

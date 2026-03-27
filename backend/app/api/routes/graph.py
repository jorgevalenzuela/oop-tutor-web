"""
Graph API routes for knowledge graph visualization.
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from app.services import graph_service

router = APIRouter()


@router.get("/graph/concepts")
async def get_concepts():
    """Get all concepts as nodes and edges for graph visualization."""
    graph_data = graph_service.extract_concept_graph()
    return JSONResponse(graph_data)


@router.get("/graph/concept/{topic}")
async def get_concept_detail(topic: str):
    """Get detailed information about a specific concept."""
    concept = graph_service.get_concept_detail(topic)
    if concept is None:
        raise HTTPException(status_code=404, detail=f"Concept '{topic}' not found")
    return JSONResponse(concept)

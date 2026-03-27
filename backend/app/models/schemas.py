"""
Pydantic models for request/response schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List


class QueryRequest(BaseModel):
    """Request model for query endpoint"""
    question: str = Field(..., min_length=1, description="The question to ask")


class QueryResponse(BaseModel):
    """Response model for query endpoint"""
    question: str
    answer: str
    retrieved_docs: Optional[List[dict]] = None


class StructuredAnswer(BaseModel):
    """Structured answer with 4 columns"""
    english: str = ""
    oop: str = ""
    uml: str = ""
    csharp: str = ""


class StructuredQueryResponse(BaseModel):
    """Response model for structured query endpoint"""
    question: str
    answer: StructuredAnswer
    raw_response: Optional[str] = None


class GraphNode(BaseModel):
    """Graph node model"""
    id: str
    label: str
    topic: str
    level: Optional[str] = None
    subject: Optional[str] = None
    definition: Optional[str] = None


class GraphEdge(BaseModel):
    """Graph edge model"""
    source: str
    target: str
    type: str  # "related", "contrasts", etc.


class GraphResponse(BaseModel):
    """Response model for graph concepts endpoint"""
    nodes: List[GraphNode]
    edges: List[GraphEdge]


class DocumentUploadResponse(BaseModel):
    """Response model for document upload"""
    status: str
    count: int
    message: Optional[str] = None


class HealthResponse(BaseModel):
    """Response model for health check"""
    status: str
    message: str

"""
Graph service for extracting knowledge graph data from the knowledge base.
"""
import json
from pathlib import Path
from typing import List, Dict, Any, Set


# Path to the knowledge base JSON file
KNOWLEDGE_BASE_PATH = Path(__file__).parent.parent.parent / "langchain_local_backup" / "starter_OOC_knowledge_base.json"


def load_knowledge_base() -> List[Dict[str, Any]]:
    """Load the knowledge base JSON file."""
    if not KNOWLEDGE_BASE_PATH.exists():
        return []
    with open(KNOWLEDGE_BASE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def extract_concept_graph() -> Dict[str, Any]:
    """
    Extract nodes and edges from the knowledge base for graph visualization.

    Returns a dictionary with:
    - nodes: List of node objects with id, label, topic, level, subject, definition
    - edges: List of edge objects with source, target, type
    """
    documents = load_knowledge_base()

    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []
    seen_nodes: Set[str] = set()

    for doc in documents:
        topic = doc.get("Topic", "")
        if not topic or topic in seen_nodes:
            continue

        seen_nodes.add(topic)

        # Create node for this topic
        nodes.append({
            "id": topic,
            "label": topic,
            "topic": topic,
            "level": doc.get("Level", ""),
            "subject": doc.get("Main-Subject", ""),
            "sub_subject": doc.get("Sub-Subject", ""),
            "definition": doc.get("Definition", ""),
            "content": doc.get("Content", ""),
            "key_concepts": doc.get("Key-Concepts", []),
        })

        # Create edges for Related-Topics
        for related in doc.get("Related-Topics", []):
            if related:
                edges.append({
                    "source": topic,
                    "target": related,
                    "type": "related"
                })

        # Create edges for Contrast-With
        for contrast in doc.get("Contrast-With", []):
            if contrast:
                edges.append({
                    "source": topic,
                    "target": contrast,
                    "type": "contrasts"
                })

    # Add placeholder nodes for targets that don't exist as main topics
    edge_targets = set()
    for edge in edges:
        edge_targets.add(edge["target"])

    for target in edge_targets:
        if target not in seen_nodes:
            nodes.append({
                "id": target,
                "label": target,
                "topic": target,
                "level": "",
                "subject": "",
                "sub_subject": "",
                "definition": "",
                "content": "",
                "key_concepts": [],
            })
            seen_nodes.add(target)

    return {"nodes": nodes, "edges": edges}


def get_concept_detail(topic: str) -> Dict[str, Any] | None:
    """Get detailed information about a specific concept/topic."""
    documents = load_knowledge_base()

    for doc in documents:
        if doc.get("Topic", "").lower() == topic.lower():
            return {
                "id": doc.get("Topic"),
                "label": doc.get("Topic"),
                "topic": doc.get("Topic"),
                "level": doc.get("Level", ""),
                "subject": doc.get("Main-Subject", ""),
                "sub_subject": doc.get("Sub-Subject", ""),
                "definition": doc.get("Definition", ""),
                "content": doc.get("Content", ""),
                "key_concepts": doc.get("Key-Concepts", []),
                "related_topics": doc.get("Related-Topics", []),
                "contrast_with": doc.get("Contrast-With", []),
                "examples": doc.get("Examples", []),
                "learning_goal": doc.get("Learning-Goal", ""),
                "common_misconceptions": doc.get("Common-Misconceptions", []),
                "question_prompts": doc.get("Question-Prompts", []),
            }

    return None

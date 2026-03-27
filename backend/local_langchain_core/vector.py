from langchain_ollama import OllamaEmbeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document
import os
import json
from pathlib import Path
import pandas as pd

# Get the directory where this file is located
_THIS_DIR = Path(__file__).parent.parent

# 1. Load JSON file
json_path = _THIS_DIR / "langchain_local_backup" / "starter_OOC_knowledge_base.json"
df = pd.read_json(json_path)

# 2. Convert rows into Document objects with metadata
db_location = str(_THIS_DIR / "langchain_local_backup" / "chrome_langchain_db_v2")
add_documents = not os.path.exists(db_location)
if add_documents:
    documents = []
    ids = []

    for i, row in df.iterrows():
        text_content = (
            f"Definition: {row.get('Definition', '')}\n"
            f"Content: {row.get('Content', '')}\n"
            f"Definition: {str(i)}"
        )

        # Convert lists to JSON strings for Chroma compatibility
        metadata = {
            "Main-Subject": row.get("Main-Subject", ""),
            "Sub-Subject": row.get("Sub-Subject", ""),
            "Topic": row.get("Topic", ""),
            "Key-Concepts": json.dumps(row.get("Key-Concepts", [])),
            "Level": row.get("Level", ""),
            "Learning-Goal": row.get("Learning-Goal", ""),
            "Contrast-With": json.dumps(row.get("Contrast-With", [])),
            "Question-Prompts": json.dumps(row.get("Question-Prompts", [])),
            "Related-Topics": json.dumps(row.get("Related-Topics", [])),
            "References": json.dumps(row.get("References", []))
        }
        ids.append(str(i))
        documents.append(Document(page_content=text_content, metadata=metadata))

# 3. Initialize embeddings
embeddings = OllamaEmbeddings(model="mxbai-embed-large")

# 4. Create Chroma database
vector_store = Chroma(
    collection_name="OO_concepts",
    persist_directory=db_location,
    embedding_function=embeddings
)

if add_documents:
    vector_store.aadd_documents(documents=documents, ids=ids)

retriever = vector_store.as_retriever(
    search_kwargs={"k": 2}
)

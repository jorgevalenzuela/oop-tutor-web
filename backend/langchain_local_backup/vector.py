#from langchain_ollama import OllamaEmbeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document
import os
import pandas as pd

#from langchain.schema import Document
#from langchain.vectorstores import Chroma
#from langchain.embeddings import OpenAIEmbeddings  # replace with Ollama embeddings
from langchain_ollama import OllamaEmbeddings

# 1. Load JSON file
df = pd.read_json("starter_OOC_knowledge_base.json")

# 2. Convert rows into Document objects with metadata
db_location = "./chrome_langchain_db"
add_documents = not os.path.exists(db_location)
if add_documents:
    documents = []
    ids = []

    for i, row in df.iterrows():
        # Combine relevant fields for embedding (so retrieval is richer)
        text_content = (
            f"Definition: {row.get('Definition', '')}\n"
            f"Content: {row.get('Content', '')}\n"
            #f"Examples: {', '.join(row.get('Examples', [])) if isinstance(row.get('Examples', list)) else row.get('Examples', '')}\n"
            #Sf"Common Misconceptions: {', '.join(row.get('Common-Misconceptions', [])) if isinstance(row.get('Common-Misconceptions', list)) else row.get('Common-Misconceptions', '')}\n"
            f"Definition: {str(i)}"
        )
        
        # Keep structured metadata
        metadata = {
            "Main-Subject": row.get("Main-Subject", ""),
            "Sub-Subject": row.get("Sub-Subject", ""),
            "Topic": row.get("Topic", ""),
            "Key-Concepts": row.get("Key-Concepts", []),
            "Level": row.get("Level", ""),
            "Learning-Goal": row.get("Learning-Goal", ""),
            "Contrast-With": row.get("Contrast-With", []),
            "Question-Prompts": row.get("Question-Prompts", []),
            "Related-Topics": row.get("Related-Topics", []),
            "References": row.get("References", [])
        }
        ids.append(str(i))
        documents.append(Document(page_content=text_content, metadata=metadata))

# 3. Initialize embeddings (swap this out for Ollama if using locally)
embeddings = OllamaEmbeddings(model="mxbai-embed-large")

# 4. Create Chroma database
#db = Chroma.from_documents(documents, embeddings, collection_name="ai_tutor_ood")
vector_store = Chroma(
    collection_name="OO_concepts",
    persist_directory=db_location,
    embedding_function=embeddings
)

if add_documents:
    vector_store.aadd_documents(documents=documents, ids=ids)

retriever = vector_store.as_retriever(
    search_kwargs={"k": 5}
)

'''
# 5. Example query
query = "What is the difference between a class and an object?"
#results = db.similarity_search(query, k=2)

for r in results:
    print("Retrieved text:\n", r.page_content)
    print("Metadata:\n", r.metadata)
    print("----")

'''
















'''
df = pd.read_csv("realistic_restaurant_reviews.csv")
embeddings = OllamaEmbeddings(model="mxbai-embed-large")

db_location = "./chrome_langchain_db"
add_documents = not os.path.exists(db_location)

if add_documents:
    documents = []
    ids = []

    for i, row in df.iterrows():
        document = Document(
            page_content=row["Title"] + " " + row["Review"],
            metadata={"rating": row["Rating"], "date": row["Date"]},
            id=str(i)
        )
        ids.append(str(i))
        documents.append(document)

vector_store = Chroma(
    collection_name="restaurant_reviews",
    persist_directory=db_location,
    embedding_function=embeddings
)

if add_documents:
    vector_store.aadd_documents(documents=documents, ids=ids)

retriever = vector_store.as_retriever(
    search_kwargs={"k": 5}
)
'''
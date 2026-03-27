from typing import List, Any
import anyio

from local_langchain_core import get_retriever


def retrieve_sync(query: str) -> List[Any]:
    """Synchronous retrieval."""
    retr = get_retriever()
    if retr is None:
        raise RuntimeError("Retriever not initialized")
    return retr.invoke(query)


async def retrieve(query: str) -> List[Any]:
    """Async wrapper to avoid blocking the event loop."""
    return await anyio.to_thread.run_sync(retrieve_sync, query)

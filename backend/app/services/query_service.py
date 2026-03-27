from typing import Any, Dict
import anyio

from local_langchain_core import get_chain


def run_chain_sync(question: str, reviews: Any) -> Dict:
    """Synchronously invoke the chain and return the result object/text."""
    chain = get_chain()
    # Use the same invoke call pattern as original script
    return chain.invoke({"reviews": reviews, "question": question})


async def run_chain(question: str, reviews: Any):
    """Async wrapper that runs chain in thread to avoid blocking the event loop."""
    return await anyio.to_thread.run_sync(run_chain_sync, question, reviews)

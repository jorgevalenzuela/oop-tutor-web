from langchain_ollama.llms import OllamaLLM
from langchain_core.prompts import ChatPromptTemplate
from vector import retriever

# Construct model and prompt/template
model = OllamaLLM(model="llama3.2")

template = """
You are an expert in answering questions about object oriented design concepts and oop concepts
Here are some relevant reviews: {reviews}
Here is the question to answer: {question}
"""
prompt = ChatPromptTemplate.from_template(template)

# Build the chain pipeline (prompt -> model)
chain = prompt | model


def get_chain():
    """Return the prepared chain object."""
    return chain


def get_retriever():
    """Return the retriever instance from the local vector module."""
    return retriever


if __name__ == "__main__":
    # Run interactive dashboard/REPL only when executed as a script
    from dashboard import Application

    app = Application()
    app.mainloop()

    while True:
        print("\n\n------------------------------------------------------------")
        question = input("Ask your question (q to quit): ")
        if question == "q":
            break

        reviews = retriever.invoke(question)

        result = chain.invoke({"reviews": reviews, "question": question})
        print(result)
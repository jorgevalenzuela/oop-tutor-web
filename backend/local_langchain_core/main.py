from langchain_ollama.llms import OllamaLLM
from langchain_core.prompts import ChatPromptTemplate
from .vector import retriever

# Construct model and prompt/template
model = OllamaLLM(model="llama3.2")

template = """You are an OOP tutor. You MUST always answer using EXACTLY these 4 sections in this order. Never skip any section.

### ENGLISH
Explain in 2-3 plain language sentences anyone can understand.

### OOP
Explain using 2-3 sentences with proper OOP technical terminology.

### UML
Always provide a Mermaid class diagram relevant to the question. Use classDiagram syntax.
```mermaid
classDiagram
    class ClassName {{
        +String attribute
        +method()
    }}
```

### CSHARP
Always provide a short C# code example relevant to the question.
```csharp
// example code here
```

Context: {reviews}
Question: {question}
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

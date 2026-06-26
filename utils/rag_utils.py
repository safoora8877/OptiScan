# utils/rag_utils.py
import os
from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_groq import ChatGroq


# Global variable to cache the RAG system
_rag_system = None

def load_rag_system():
    """Load and cache the RAG system"""
    global _rag_system

    if _rag_system is not None:
        return _rag_system

    print("Loading RAG system...")

    print("Loading RAG system...")

    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

    if os.path.exists("chroma_db"):
        vectorstore = Chroma(persist_directory="chroma_db", embedding_function=embeddings)
    else:
        # Load all MDs from rag_documents folder
        loader = DirectoryLoader("rag_documents/", glob="**/*.md", loader_cls=TextLoader)
        documents = loader.load()

        # Split documents into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len
        )
        texts = text_splitter.split_documents(documents)

        vectorstore = Chroma.from_documents(
            documents=texts,
            embedding=embeddings,
            persist_directory="chroma_db"  # Saves locally
        )

    # Groq LLM
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        temperature=0.3,
        max_tokens=1024
    )

    _rag_system = {"vectorstore": vectorstore, "llm": llm}
    return _rag_system


def get_rag_response(question: str):
    """Get response from RAG system"""
    rag = load_rag_system()
    
    # Retrieve documents
    docs = rag["vectorstore"].similarity_search(question, k=5)
    context = "\n\n".join([doc.page_content for doc in docs])
    
    # Custom Prompt for Medical Context
    prompt = f"""You are an experienced ophthalmologist and patient educator named Dr. Vision.
    You are helpful, accurate, empathetic, and professional.

    Use the following context to answer the user's question.
    If the user is a patient, explain in simple, clear language.
    If the user is a doctor, you can use more technical/medical terms.

    Guidelines:
    - Stay strictly within the provided context.
    - If information is not available in context, say "I don't have enough information about this. Please consult latest medical literature."
    - If more details are needed (e.g., symptoms duration, age, medical history), politely ask for them.
    - Always add a disclaimer: "This is not a substitute for professional medical advice."

    Context: {context}

    Question: {question}

    Answer:"""
    
    response = rag["llm"].invoke(prompt)
    return response.content
from typing import List, Dict, Any
import os
import ollama
from groq import Groq
from huggingface_hub import InferenceClient


OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
HUGGINGFACE_API_KEY = os.getenv("HUGGINGFACE_API_KEY")
HF_MODEL = "meta-llama/Llama-3.2-3B-Instruct"

groq_client = None
if GROQ_API_KEY:
    try:
        groq_client = Groq(api_key=GROQ_API_KEY)
        print("INFO: Groq client initialized. Using Cloud AI as primary.")
    except Exception as e:
        print(f"WARNING: Groq initialization failed: {e}. Defaulting to Local AI.")

hf_client = None
if HUGGINGFACE_API_KEY:
    try:
        hf_client = InferenceClient(api_key=HUGGINGFACE_API_KEY)
        print("INFO: Hugging Face client initialized.")
    except Exception as e:
        print(f"WARNING: Hugging Face initialization failed: {e}")

SYSTEM_PROMPT = """
You are an educational assistant operating inside a secure RBAC-based system.
You MUST answer strictly based on the provided context, which is derived from PDF course material.
If the answer is not contained in the context, clearly say you do not have enough information
instead of guessing or hallucinating.
IMPORTANT: You must always answer in the language requested by the user. If the requested language is Hindi, you must transliterate technical terms or keep them in English if commonly used, but the explanation must be in Hindi.
"""

def generate_completion(messages: List[Dict[str, str]]) -> str:
    """
    Hybrid generation: Try Groq (Cloud) first, fallback to Ollama (Local).
    """
    
    if groq_client:
        try:
            
            completion = groq_client.chat.completions.create(
                model="llama3-8b-8192",
                messages=messages,
                temperature=0.1,
            )
            return completion.choices[0].message.content
        except Exception as e:
            print(f"WARNING: Groq Cloud failed ({e}). Falling back to next available...")

    # Fallback 1: Hugging Face (Cloud)
    if hf_client:
        try:
            # Using chat completion API from huggingface_hub
            completion = hf_client.chat_completion(
                model=HF_MODEL,
                messages=messages,
                max_tokens=500
            )
            return completion.choices[0].message.content
        except Exception as e:
            print(f"WARNING: Hugging Face Cloud failed ({e}). Falling back to Local AI...")
    
    
    try:
        response = ollama.chat(model=OLLAMA_MODEL, messages=messages)
        return response['message']['content']
    except Exception as e:
        
        print(f"ERROR: Local AI failed: {e}")
        return "I apologize, but I'm currently unable to generate a response due to technical issues (AI Service Unavailable)."


def rewrite_query(query: str) -> str:
    """
    Rewrite the user query for better retrieval quality.
    """
    prompt = (
        f"Rewrite the following learner question to be clear, concise, and retrieval-friendly.\n"
        f"Keep the meaning the same. Output ONLY the rewritten question.\n\nQuestion: {query}"
    )
    messages = [{'role': 'user', 'content': prompt}]
    return generate_completion(messages).strip()


def role_prompt(role: str) -> str:
    if role == "student":
        return (
            "You are helping a student. "
            "Explain the concepts directly to the student using simple, engaging language. "
            "If the context contains lesson plans or teaching instructions, rephrase them as learning activities for the student. "
            "Do NOT talk *about* the student or the lesson; talk *to* the student. "
            "Use concrete examples and step-by-step explanations."
        )
    return (
        "You are helping a teacher. "
        "Provide deep explanations, pedagogical insights, and possible ways to teach or assess the topic. "
        "You may suggest questions or summaries."
    )





def generate_answer(role: str, context: str, question: str, language: str = "English") -> str:
    """
    Generate final answer with system, role, and context prompts.
    """
    final_user_message = (
        f"ROLE:\n{role_prompt(role)}\n\n"
        f"CONTEXT (from PDFs):\n{context}\n\n"
        f"USER QUESTION:\n{question}\n\n"
        f"TARGET LANGUAGE:\n{language}\n\n"
        "Answer as instructed above in the target language."
    )
    
    messages = [
        {'role': 'system', 'content': SYSTEM_PROMPT.strip()},
        {'role': 'user', 'content': final_user_message}
    ]
    
    return generate_completion(messages)

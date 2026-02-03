import os
from pathlib import Path
from typing import Dict, List

from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

# Load environment variables from .env file
load_dotenv()

# Get the project root directory (parent of Backend folder)
# In AI-chatboat/backend/main.py, parent is AI-chatboat
PROJECT_ROOT = Path(__file__).parent.parent

from auth import auth as auth_utils, models, schemas
from database import Base, engine, get_db
from rag.pdf_loader import load_pdf_text, chunk_text
from rag.vector_store import VectorStore, embed_query
from rag.advanced_nlp import rewrite_query, generate_answer
from rbac.roles import role_required


app = FastAPI(title="RBAC Educational Chatbot")

app.add_middleware(
    CORSMiddleware,
    # Using regex to allow any localhost port (robust for dev environment where ports change)
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?", 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)



# Dynamic PDF Discovery
# Looks for structure: std/{standard}/{Subject}/{Chapter}.pdf
# PROJECT_ROOT is AI-chatboat
STD_DIR = PROJECT_ROOT / "std"

VECTOR_STORES: Dict[str, Dict[str, VectorStore]] = {}

def get_available_content(standard: str = None) -> Dict[str, Dict[str, str]]:
    """
    Scans the std directory for content.
    If standard is provided, returns subjects/chapters for that standard.
    Returns: { "subject_name": { "chapter_name": "absolute_path_to_pdf" } }
    """
    content_map = {}
    
    if not STD_DIR.exists():
        return content_map

    # If standard is specified, look only in that folder
    if not standard:
        return content_map

    std_path = STD_DIR / standard
    if not std_path.exists():
        return content_map

    # Scan subjects (subdirectories in std/{standard})
    for subject_path in std_path.iterdir():
        if subject_path.is_dir():
            subject_name = subject_path.name
            chapters = {}
            # Scan chapters (PDF files in std/{standard}/{subject})
            for file_path in subject_path.glob("*.pdf"):
                chapter_name = file_path.stem  # filename without extension
                chapters[chapter_name] = str(file_path.resolve())
            
            if chapters:
                content_map[subject_name] = chapters
    
    return content_map


def get_vector_store(subject: str, chapter: str, standard: str) -> VectorStore:
    # Key needs to include standard now to avoid collisions between standards
    store_key = f"{standard}_{subject}_{chapter}".lower()
    
    # Check memory cache first
    if store_key in VECTOR_STORES:
        return VECTOR_STORES[store_key]

    # Resolve path dynamically
    content = get_available_content(standard)
    
    # Case insensitive lookup
    subject_map = {k.lower(): k for k in content.keys()}
    s_key = subject.lower()
    
    if s_key not in subject_map:
         raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subject '{subject}' not found for Standard {standard}",
        )
    
    real_subject_name = subject_map[s_key]
    chapters_map = {k.lower(): k for k in content[real_subject_name].keys()}
    c_key = chapter.lower()

    if c_key not in chapters_map:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chapter '{chapter}' not found in {real_subject_name} (Std {standard})",
        )

    pdf_path = content[real_subject_name][chapters_map[c_key]]
    
    try:
        raw_text = load_pdf_text(pdf_path)
        chunks = chunk_text(raw_text)
        store = VectorStore(chunks)
        VECTOR_STORES[store_key] = store
        return store
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load PDF: {str(e)}"
        )


@app.post("/signup", response_model=schemas.Token)
def signup(data: dict, db: Session = Depends(get_db)):
    """
    Create a new user account. Accepts {"email", "password", "role", "standard"}.
    Role must be "student" or "teacher".
    Standard is required if role is student.
    """
    email = data.get("email")
    password = data.get("password")
    role = data.get("role", "student")  # Default to student
    standard = data.get("standard")

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required")
    
    if role not in ["student", "teacher"]:
        raise HTTPException(status_code=400, detail="Role must be 'student' or 'teacher'")

    if role == "student" and not standard:
         raise HTTPException(status_code=400, detail="Standard is required for students")

    # Check if user already exists
    existing_user = db.query(models.User).filter(models.User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create new user
    hashed_password = auth_utils.get_password_hash(password)
    new_user = models.User(
        email=email,
        hashed_password=hashed_password,
        role=role,
        standard=standard
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Return token immediately after signup
    access_token = auth_utils.create_access_token({
        "sub": new_user.email, 
        "role": new_user.role,
        "standard": new_user.standard
    })
    return schemas.Token(access_token=access_token)


@app.post("/login", response_model=schemas.LoginResponse)
def login(data: dict, db: Session = Depends(get_db)):
    """
    Basic JSON login accepting {"email", "password"}.
    Returns a JWT embedding the user role and standard.
    """
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required")

    user = auth_utils.authenticate_user(db, email=email, password=password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    access_token = auth_utils.create_access_token({
        "sub": user.email, 
        "role": user.role,
        "standard": user.standard
    })
    # Return custom dict to match Frontend expectation: { "token": ..., "role": ... }
    return {"token": access_token, "role": user.role}


@app.post("/forgot-password")
def forgot_password(data: dict, db: Session = Depends(get_db)):
    """
    Resets user password. Accepts {"email", "new_password"}.
    """
    email = data.get("email")
    new_password = data.get("new_password")
    
    if not email or not new_password:
        raise HTTPException(status_code=400, detail="Email and new password required")

    # Find user
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User with this email not found")
    
    # Verify/Hash password and update
    # In a real app, you would send a reset email. 
    # For now, we allow direct reset as per the demo requirement.
    hashed_password = auth_utils.get_password_hash(new_password)
    user.hashed_password = hashed_password
    db.commit()
    
    return {"message": "Password updated successfully"}


@app.get("/subjects", response_model=List[schemas.Subject])
def list_subjects(
    user: schemas.UserRead = Depends(auth_utils.get_current_user),
    standard: str = None
):
    """
    Return all available subjects and chapters.
    If user is a student, automatically uses their standard.
    If user is teacher or admin, can optionally pass 'standard' query param,
    but defaults to scanning all or a default logic.
    For now, we enforce standard from user profile if student.
    """
    target_standard = standard
    
    if user.role == "student":
        target_standard = user.standard
        if not target_standard:
             # Should not happen ideally if validation works, but handle gracefully
             return []
    
    # If no standard specified/found, return empty list or maybe default to something?
    # Requirement: "standard must get automatically selected from the user login info"
    if not target_standard:
        return []

    content = get_available_content(target_standard)
    
    subjects: List[schemas.Subject] = []
    for subject_name, chapters in content.items():
        subjects.append(
            schemas.Subject(
                name=subject_name,
                chapters=list(chapters.keys()),
            )
        )
    return subjects


# --- Chat History Endpoints ---

@app.post("/sessions", response_model=schemas.ChatSessionRead)
def create_session(
    session_in: schemas.ChatSessionCreate,
    user: schemas.UserRead = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    """Start a new chat session."""
    # Default title if not provided
    title = session_in.title or f"{session_in.subject} - {session_in.chapter}"
    
    # Resolve standard
    std = session_in.standard
    if not std and user.role == "student":
        std = user.standard

    new_session = models.ChatSession(
        user_id=user.id,
        subject=session_in.subject,
        chapter=session_in.chapter,
        standard=std,
        language=session_in.language,
        title=title
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session


@app.get("/sessions", response_model=List[schemas.ChatSessionRead])
def list_sessions(
    user: schemas.UserRead = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    """List all chat sessions for the current user, ordered by newest first."""
    sessions = (
        db.query(models.ChatSession)
        .filter(models.ChatSession.user_id == user.id)
        .order_by(models.ChatSession.created_at.desc())
        .all()
    )
    return sessions


@app.get("/sessions/{session_id}", response_model=schemas.ChatSessionRead)
def get_session(
    session_id: int,
    user: schemas.UserRead = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific session with its messages."""
    session = (
        db.query(models.ChatSession)
        .filter(models.ChatSession.id == session_id, models.ChatSession.user_id == user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Manually fetch messages to ensure they are attached (strict mode)
    messages = (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.session_id == session_id)
        .order_by(models.ChatMessage.created_at.asc())
        .all()
    )
    session.messages = messages
    return session


@app.post("/sessions/{session_id}/message", response_model=schemas.ChatResponse)
def send_message_to_session(
    session_id: int,
    payload: schemas.ChatMessageCreate,
    user: schemas.UserRead = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Send a user message to an existing session and get an AI response.
    Saves both messages to the database.
    """
    # 1. Verify Session
    session = (
        db.query(models.ChatSession)
        .filter(models.ChatSession.id == session_id, models.ChatSession.user_id == user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # 2. Save User Message
    user_msg = models.ChatMessage(
        session_id=session.id,
        role="user",
        content=payload.content
    )
    db.add(user_msg)
    db.commit()

    # 3. Generate AI Response (Reuse existing logic)
    try:
        # Load vector store (caches internally)
        store = get_vector_store(session.subject, session.chapter, session.standard)
        
        # Rewrite query using Ollama
        rewritten = rewrite_query(payload.content)

        # Embed rewritten query
        query_emb = embed_query(rewritten)
        
        # Search
        results = store.search(query_emb, top_k=5)
        retrieved_chunks: List[str] = [chunk for chunk, _ in results]
        
        answer_text = ""
        
        if not retrieved_chunks:
            answer_text = "I could not find any relevant information in the course material for this question."
        else:
            context_text = "\n\n".join(retrieved_chunks)
            # Generate answer using Ollama
            answer_text = generate_answer(user.role, context_text, payload.content, session.language)

        # 4. Save AI Message
        ai_msg = models.ChatMessage(
            session_id=session.id,
            role="assistant",
            content=answer_text
        )
        db.add(ai_msg)
        db.commit()

        return schemas.ChatResponse(answer=answer_text)

    except Exception as e:
        print(f"Error in chat session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred: {str(e)}"
        )


@app.post("/chat", response_model=schemas.ChatResponse)
def chat(
    payload: schemas.ChatRequest,
    user: schemas.UserRead = Depends(role_required("student", "teacher")),
):
    """
    Role-aware chat endpoint using Local AI (Ollama + SentenceTransformers).
    """
    # This endpoint is deprecated and might not work well with standard unless we assume something.
    # Using user.standard if available.
    std = user.standard if hasattr(user, 'standard') else "9" # Fallback? or Error?
    if not std:
         # If no standard, we might fail. For now, let's try to grab from payload if we add it to ChatRequest
         # But ChatRequest doesn't have it.
         raise HTTPException(status_code=400, detail="Standard not found for user")

    try:
        
        store = get_vector_store(payload.subject, payload.chapter, std)
        
        print(f"\n=== DEBUG: Chat Request ===")
        print(f"Subject: {payload.subject}, Chapter: {payload.chapter}")
        print(f"Question: {payload.question}")
        print(f"User Role: {user.role}")
        
        
        rewritten = rewrite_query(payload.question)
        print(f"Rewritten Query: {rewritten}")

        
        query_emb = embed_query(rewritten)
        
            
        results = store.search(query_emb, top_k=5)
        retrieved_chunks: List[str] = [chunk for chunk, _ in results]
        
        print(f"\n=== Retrieved {len(retrieved_chunks)} chunks ===")
        for i, (chunk, distance) in enumerate(results):
            print(f"Chunk {i+1} (distance: {distance:.4f}): {chunk[:200]}...")

        if not retrieved_chunks:
            print("WARNING: No chunks retrieved!")
            return schemas.ChatResponse(
                answer="I could not find any relevant information in the course material for this question."
            )

        # 4) SKIP Compression (Cost Optimization)
        # We pass raw chunks directly to the model.
        context_text = "\n\n".join(retrieved_chunks)
        print(f"\n=== Context (Raw Chunks) ===")
        print(f"{context_text[:500]}...")

        # 5) Generate answer using Ollama
        answer_text = generate_answer(user.role, context_text, payload.question, payload.language)
        print(f"\n=== Generated Answer ===")
        try:
            print(f"{answer_text[:300]}...")
        except UnicodeEncodeError:
            print(f"{answer_text[:300].encode('utf-8', errors='ignore').decode('ascii', errors='ignore')}... (Unicode chars hidden)")

        return schemas.ChatResponse(answer=answer_text)

    except Exception as e:
        print(f"General Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while processing your request: {str(e)}"
        )


# --- Student Dashboard Endpoints ---

@app.get("/student/stats")
def get_student_stats(
    token: str = None, 
    user: schemas.UserRead = Depends(auth_utils.get_current_user), 
    db: Session = Depends(get_db)
):
    """
    Returns statistics for the dashboard.
    """
    
    # 1. Get Chapters count
    available_content = get_available_content(user.standard)
    total_chapters = 0
    subjects_data = []
    
    for sub, chapters in available_content.items():
        count = len(chapters)
        total_chapters += count
        subjects_data.append({"name": sub, "progress": 0}) 
        
    # 2. Get Recent Activity (Chat Sessions)
    recent_sessions = (
        db.query(models.ChatSession)
        .filter(models.ChatSession.user_id == user.id)
        .order_by(models.ChatSession.created_at.desc())
        .limit(5)
        .all()
    )
    
    recent_activity = []
    for s in recent_sessions:
        recent_activity.append({
            "task": f"Chatted about {s.subject} - {s.chapter}",
            "date": s.created_at.strftime("%Y-%m-%d")
        })

    if not recent_activity:
        recent_activity.append({"task": "Joined RBAS Chatbot", "date": "Just now"})

    return {
        "student_name": f"Student ({user.email})",
        "accuracy": 85, 
        "chapters": total_chapters,
        "recommendation": "Keep exploring your chapters!",
        "subjects": subjects_data,
        "recent_activity": recent_activity
    }


@app.post("/student/ask-ai-doubt")
def ask_ai_doubt(
    data: dict,
    user: schemas.UserRead = Depends(auth_utils.get_current_user), 
):
    question = data.get("question", "")
    if not question:
         return {"answer": "Please ask a question."}

    # "Global Search" across all chapters of the standard
    print(f"Global search for: {question} (Std {user.standard})")
    
    try:
        content = get_available_content(user.standard)
        all_results = []
        
        # Rewrite once
        rewritten = rewrite_query(question)
        query_emb = embed_query(rewritten)

        # Iterate all chapters
        for sub, chapters in content.items():
            for chap in chapters.keys():
                try:
                    # Load store
                    store = get_vector_store(sub, chap, user.standard)
                    # Search
                    # We get (text, distance)
                    results = store.search(query_emb, top_k=2) # Get top 2 from each
                    for txt, dist in results:
                        all_results.append((dist, txt))
                except Exception as err:
                    pass
        
        all_results.sort(key=lambda x: x[0])
        
        # Take top 5 globally
        top_chunks = [txt for dist, txt in all_results[:5]]
        
        if not top_chunks:
            return {"answer": "I could not find any relevant information in your course materials."}
            
        context_text = "\n\n".join(top_chunks)
        
        # Generate Answer
        answer = generate_answer(user.role, context_text, question, "English")
        
        return {"answer": answer}

    except Exception as e:
        print(f"Global search error: {e}")
        return {"answer": "I encountered an error while searching your books. Please try again."}

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import models, auth, database

app = FastAPI()


models.Base.metadata.create_all(bind=database.engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = database.SessionLocal()
    try: 
        yield db
    finally: 
        db.close()



@app.post("/register")
def register(user_data: dict, db: Session = Depends(get_db)):
    # Prevent duplicate emails
    existing_user = db.query(models.User).filter(models.User.email == user_data.get("email")).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create primary User record
    new_user = models.User(
        name=user_data.get("name"),
        email=user_data.get("email"),
        password=user_data.get("password"),
        role=user_data.get("role"),
        class_level=user_data.get("class") if user_data.get("role") == "student" else None
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create initial Progress for students 
    if new_user.role == "student":
        initial_progress = models.Progress(
            student_id=new_user.id,
            accuracy=0,
            chapters_completed=0
        )
        db.add(initial_progress)
        db.commit()

    return {"message": "User created successfully"}

@app.post("/login")
def login(user_data: dict, db: Session = Depends(get_db)):
    email = user_data.get("email")
    password = user_data.get("password")
    
    user = db.query(models.User).filter(models.User.email == email).first()
    
    # Simple password check (for demo purposes only)
    if not user or user.password != password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = auth.create_access_token(data={"sub": user.email, "id": user.id, "role": user.role})
    return {"token": token, "role": user.role}

# STUDENT

@app.get("/student/stats")
def get_student_stats(token: str, db: Session = Depends(get_db)):
    payload = auth.decode_token(token)
    user_id = payload.get("id")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    stats = db.query(models.Progress).filter(models.Progress.student_id == user_id).first()
    
    return {
        "student_name": user.name if user else "Student",
        "accuracy": stats.accuracy if stats else 0,
        "chapters": stats.chapters_completed if stats else 0,
        "recommendation": "Start a new lesson to get AI suggestions!",
        "subjects": [
            {"name": "Mathematics", "progress": 0},
            {"name": "Science", "progress": 0},
            {"name": "History", "progress": 0}
        ],
        "recent_activity": [{"task": "Joined CoreAI", "date": "Just now"}]
    }

@app.post("/student/ask-ai-doubt")
def ask_ai_doubt(data: dict):
    question = data.get("question", "").lower()
    if "photosynthesis" in question:
        answer = "Plants transform sunlight into chemical energy using chlorophyll!"
    else:
        answer = "I'm looking into that. Why not check your course materials for Chapter 1?"
    return {"answer": answer}

# TEACHER

@app.get("/teacher/analytics")
def get_teacher_analytics(token: str, db: Session = Depends(get_db)):
    payload = auth.decode_token(token)
    if payload.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Unauthorized")

    # Join Users with their Progress
    results = db.query(models.User, models.Progress).outerjoin(
        models.Progress, models.User.id == models.Progress.student_id
    ).filter(models.User.role == "student").all()

    student_list = []
    total_acc = 0
    for user, prog in results:
        acc = prog.accuracy if prog else 0
        total_acc += acc
        student_list.append({
            "id": user.id, "name": user.name, "email": user.email,
            "class": user.class_level, "accuracy": acc, 
            "chapters": prog.chapters_completed if prog else 0
        })

    avg = round(total_acc/len(student_list), 1) if student_list else 0
    return {
        "total_students": len(student_list),
        "average_accuracy": avg,
        "students": student_list
    }

# PASSWORD RESET

@app.post("/forgot-password")
def forgot_password(data: dict, db: Session = Depends(get_db)):
    email = data.get("email")
    new_password = data.get("new_password")
    
    # Find user by email
    user = db.query(models.User).filter(models.User.email == email).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User with this email not found")
    
    # Update password
    user.password = new_password
    db.commit()
    
    return {"message": "Password updated successfully"}
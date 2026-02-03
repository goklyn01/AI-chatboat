from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    password: str
    role: str  # "student" or "teacher"
    standard: Optional[str] = None


class UserRead(UserBase):
    id: int
    role: str
    standard: Optional[str] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginResponse(BaseModel):
    token: str
    role: str


class TokenData(BaseModel):
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    standard: Optional[str] = None


# Existing ChatRequest kept for backward compatibility if needed, 
# but new flow will likely use session-based interaction.
class ChatRequest(BaseModel):
    subject: str
    chapter: str
    question: str
    language: Optional[str] = "English"


class ChatResponse(BaseModel):
    answer: str


class Subject(BaseModel):
    name: str
    chapters: List[str]


# --- Chat History Schemas ---

class ChatMessageBase(BaseModel):
    role: str
    content: str


class ChatMessageCreate(ChatMessageBase):
    pass


class ChatMessageRead(ChatMessageBase):
    id: int
    session_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ChatSessionBase(BaseModel):
    subject: str
    chapter: str
    standard: Optional[str] = None
    language: str = "English"
    title: Optional[str] = None


class ChatSessionCreate(ChatSessionBase):
    pass


class ChatSessionRead(ChatSessionBase):
    id: int
    user_id: int
    created_at: datetime
    messages: List[ChatMessageRead] = []

    class Config:
        from_attributes = True

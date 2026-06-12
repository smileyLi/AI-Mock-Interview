from pydantic import BaseModel, Field, ConfigDict, AliasChoices
from typing import Optional, List
from datetime import datetime


class ChatRequest(BaseModel):
    session_id: str
    user_message: str


class ChatResponse(BaseModel):
    reply: str
    session_id: str


class StartInterviewRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    session_id: Optional[str] = None
    resume_text: Optional[str] = Field(
        "",
        description="解析后的简历全文（可选，不传则使用保存的简历或无简历模式）",
        validation_alias=AliasChoices("resume_text", "resumeText"),
    )
    job_role: str = Field(
        default="java_backend",
        description="岗位类型：java_backend 或 web_frontend",
        validation_alias=AliasChoices("job_role", "jobRole"),
    )


class ResumeInfoResponse(BaseModel):
    exists: bool
    text: str = ""
    filename: str = ""
    saved_at: str = ""
    char_count: int = 0


class SaveResumeResponse(BaseModel):
    success: bool
    message: str = ""


class ResumeExistsResponse(BaseModel):
    exists: bool


class ParseResumeResponse(BaseModel):
    text: str
    truncated: bool = False
    filename: str = ""


class StartInterviewResponse(BaseModel):
    session_id: str
    first_question: str


class EndInterviewRequest(BaseModel):
    session_id: str


class EndInterviewResponse(BaseModel):
    summary: str


class Message(BaseModel):
    role: str
    content: str


class InterviewRecord(BaseModel):
    session_id: str
    created_at: str
    updated_at: str
    messages: List[Message]
    summary: str
    job_role: str = "java_backend"


class InterviewListResponse(BaseModel):
    interviews: List[InterviewRecord]
    total: int


class DeleteInterviewRequest(BaseModel):
    session_id: str


class DeleteInterviewResponse(BaseModel):
    success: bool
    message: str

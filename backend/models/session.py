from typing import List, Dict
from datetime import datetime
from pydantic import BaseModel, Field

class Message(BaseModel):
    role: str
    content: str
    timestamp: datetime

class InterviewSession(BaseModel):
    session_id: str
    user_id: str
    created_at: datetime
    last_active: datetime
    history: List[Message] = Field(default_factory=list)

    user_turn_count: int = 0
    bank_started: bool = False
    bank_question_texts: List[str] = Field(default_factory=list)
    current_question_index: int = 0
    bank_turns_on_current: int = 0

    resume_plain_text: str = ""

    job_role: str = "java_backend"

    def add_message(self, role: str, content: str):
        self.history.append(Message(
            role=role,
            content=content,
            timestamp=datetime.now()
        ))
        self.last_active = datetime.now()
    
    def get_history_for_llm(self) -> List[Dict[str, str]]:
        return [{"role": msg.role, "content": msg.content} for msg in self.history]

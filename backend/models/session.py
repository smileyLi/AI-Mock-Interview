from typing import List, Dict
from datetime import datetime
from pydantic import BaseModel

class Message(BaseModel):
    """单条消息"""
    role: str  # "user" 或 "assistant"
    content: str
    timestamp: datetime

class InterviewSession(BaseModel):
    """面试会话"""
    session_id: str
    created_at: datetime
    last_active: datetime
    history: List[Message] = []
    
    def add_message(self, role: str, content: str):
        """添加消息到历史"""
        self.history.append(Message(
            role=role,
            content=content,
            timestamp=datetime.now()
        ))
        self.last_active = datetime.now()
    
    def get_history_for_llm(self) -> List[Dict[str, str]]:
        """转换为LLM需要的格式"""
        return [{"role": msg.role, "content": msg.content} for msg in self.history]
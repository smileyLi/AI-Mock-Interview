from typing import Dict, Optional
from ..models.session import InterviewSession
from ..services.llm_service import LLMService
from ..utils.history_manager import HistoryManager
import uuid
from datetime import datetime

class InterviewService:
    """面试业务逻辑服务"""

    def __init__(self):
        self.llm_service = LLMService()
        self.sessions: Dict[str, InterviewSession] = {}
        self.history_manager = HistoryManager()

    def start_interview(self, session_id: Optional[str] = None) -> tuple[str, str]:
        """
        开始面试
        :return: (session_id, first_question)
        """
        if not session_id:
            session_id = str(uuid.uuid4())[:8]

        session = InterviewSession(
            session_id=session_id,
            created_at=datetime.now(),
            last_active=datetime.now()
        )

        first_question = self.llm_service.get_first_question()

        session.add_message("assistant", first_question)
        self.sessions[session_id] = session

        return session_id, first_question

    def chat(self, session_id: str, user_message: str) -> str:
        """
        处理用户消息
        :return: AI回复
        """
        session = self.sessions.get(session_id)
        if not session:
            session_id, _ = self.start_interview(session_id)
            session = self.sessions[session_id]

        session.add_message("user", user_message)

        history = session.get_history_for_llm()

        reply = self.llm_service.chat(history, user_message)

        session.add_message("assistant", reply)

        return reply

    def end_interview(self, session_id: str) -> str:
        """
        结束面试，返回总结并保存到历史
        """
        session = self.sessions.get(session_id)
        if not session:
            return "未找到面试会话。"

        history = session.get_history_for_llm()

        summary = self.llm_service.end_interview(history)

        messages = [{"role": msg.role, "content": msg.content} for msg in session.history]

        if session_id in self.sessions:
            existing = self.history_manager.get_interview(session_id)
            if existing:
                self.history_manager.update_interview(session_id, messages, summary)
            else:
                self.history_manager.add_interview(session_id, messages, summary)

        del self.sessions[session_id]

        return summary

    def get_all_interviews(self) -> list:
        """获取所有面试历史"""
        return self.history_manager.get_interviews()

    def get_interview(self, session_id: str) -> Optional[dict]:
        """获取指定会话的面试历史"""
        return self.history_manager.get_interview(session_id)

    def delete_interview(self, session_id: str) -> bool:
        """删除指定的面试历史"""
        return self.history_manager.delete_interview(session_id)

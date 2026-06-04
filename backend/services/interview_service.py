from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from typing import Dict, Optional

from ..config import Config
from ..logger import get_logger
from ..models.session import InterviewSession
from ..prompts.system_prompt import build_question_bank_addon, build_resume_addon
from ..rag.question_bank import sample_random_question_texts
from ..rag.rag_service import RAGService
from ..services.llm_service import LLMService
from ..utils.history_manager import HistoryManager
from ..utils.resume_manager import ResumeManager


class InterviewService:
    """面试业务逻辑服务 - 支持多用户"""

    SESSION_EXPIRE_MINUTES = 120

    def __init__(self) -> None:
        self.llm_service = LLMService()
        self.sessions: Dict[str, InterviewSession] = {}
        self.history_manager = HistoryManager()
        self.resume_manager = ResumeManager()
        self.rag_service: Optional[RAGService] = None
        self.logger = get_logger(__name__)
        if Config.RAG_ENABLED:
            try:
                self.rag_service = RAGService()
            except Exception as e:
                self.logger.warning(f"RAG 服务初始化失败（将在无 RAG 检索模式下运行）: {e}")
                self.rag_service = None

    def _cleanup_expired_sessions(self):
        expired_keys = []
        now = datetime.utcnow()
        expire_threshold = timedelta(minutes=self.SESSION_EXPIRE_MINUTES)
        for session_id, session in self.sessions.items():
            if now - session.last_active > expire_threshold:
                expired_keys.append(session_id)
        for key in expired_keys:
            del self.sessions[key]
        if expired_keys:
            self.logger.info(f"已清理 {len(expired_keys)} 个过期会话")

    def _get_session(self, user_id: str, session_id: str) -> InterviewSession:
        self._cleanup_expired_sessions()
        session = self.sessions.get(session_id)
        if not session:
            raise ValueError("会话不存在或已结束，请先开始面试")
        if session.user_id != user_id:
            raise ValueError("无权访问此会话")
        return session

    def start_interview(
        self,
        user_id: str,
        session_id: Optional[str],
        resume_text: str = "",
        job_role: str = "java_backend",
        use_saved_resume: bool = True
    ) -> tuple[str, str]:
        if job_role not in Config.SUPPORTED_JOB_ROLES:
            raise ValueError(
                f"不支持的岗位类型: {job_role}。"
                f"支持的岗位: {', '.join(Config.SUPPORTED_JOB_ROLES)}"
            )

        if not session_id:
            session_id = str(uuid.uuid4())[:8]

        self._cleanup_expired_sessions()

        if session_id in self.sessions:
            existing = self.sessions[session_id]
            if existing.user_id != user_id:
                raise ValueError("会话ID已被其他用户使用")
            return session_id, existing.history[0].content if existing.history else "请继续面试"

        raw = (resume_text or "").strip()
        
        if not raw and use_saved_resume and Config.RESUME_STORAGE_ENABLED:
            saved_resume = self.resume_manager.load_resume(user_id)
            if saved_resume:
                raw = saved_resume.get("text", "").strip()

        stored = raw[: Config.RESUME_MAX_CHARS] if raw else ""
        session = InterviewSession(
            session_id=session_id,
            user_id=user_id,
            created_at=datetime.utcnow(),
            last_active=datetime.utcnow(),
            resume_plain_text=stored,
            job_role=job_role,
        )

        resume_addon = build_resume_addon(stored) if stored else None
        first_question = self.llm_service.get_first_question(
            job_role=job_role,
            resume_addon=resume_addon
        )

        session.add_message("assistant", first_question)
        self.sessions[session_id] = session

        return session_id, first_question

    def chat(self, user_id: str, session_id: str, user_message: str) -> str:
        session = self._get_session(user_id, session_id)

        session.add_message("user", user_message)
        session.user_turn_count += 1

        if session.bank_started and session.bank_question_texts:
            session.bank_turns_on_current += 1
            max_per = Config.MAX_USER_REPLIES_PER_BANK_QUESTION
            nq = len(session.bank_question_texts)
            if session.bank_turns_on_current > max_per and session.current_question_index < nq - 1:
                session.current_question_index += 1
                session.bank_turns_on_current = 1
        elif (
            Config.QUESTION_BANK_ENABLED
            and not session.bank_started
            and session.user_turn_count >= Config.MIN_USER_ROUNDS_BEFORE_BANK
        ):
            texts, _total = sample_random_question_texts(
                Config.RAG_DB_DIR,
                Config.RAG_COLLECTION,
                session.job_role,
                Config.QUESTION_BANK_SAMPLE_SIZE,
                Config.QUESTION_BANK_MAX_CHARS_PER_ITEM,
                domain=session.job_role,
            )
            if texts:
                session.bank_started = True
                session.bank_question_texts = texts
                session.current_question_index = 0
                session.bank_turns_on_current = 1

        history = session.get_history_for_llm()

        bank_addon = None
        if session.bank_started and session.bank_question_texts:
            bank_addon = build_question_bank_addon(
                session.bank_question_texts,
                session.current_question_index,
                session.bank_turns_on_current,
                Config.MAX_USER_REPLIES_PER_BANK_QUESTION,
            )

        resume_addon = None
        if session.resume_plain_text and not session.bank_started:
            resume_addon = build_resume_addon(session.resume_plain_text)

        rag_context = ""
        if self.rag_service and Config.RAG_ENABLED and not (
            session.bank_started and session.bank_question_texts
        ):
            try:
                k = max(1, Config.RAG_TOP_K)
                chunks = self.rag_service.query(
                    user_message,
                    n_results=k,
                    domain=session.job_role
                )
                rag_context = self.rag_service.format_context(chunks)
                max_chars = Config.RAG_CONTEXT_MAX_CHARS
                if max_chars > 0 and len(rag_context) > max_chars:
                    rag_context = rag_context[:max_chars] + "\n...(已截断)"
            except Exception as e:
                self.logger.error(f"RAG 检索失败: {e}")

        reply = self.llm_service.chat(
            history,
            user_message,
            rag_context,
            job_role=session.job_role,
            question_bank_addon=bank_addon,
            resume_addon=resume_addon,
        )

        session.add_message("assistant", reply)
        return reply

    def end_interview(self, user_id: str, session_id: str) -> str:
        try:
            session = self._get_session(user_id, session_id)
        except ValueError:
            return "未找到面试会话或无权访问。"

        history = session.get_history_for_llm()
        summary = self.llm_service.end_interview(
            history,
            job_role=session.job_role,
            resume_plain_text=session.resume_plain_text or None,
        )

        messages = [{"role": msg.role, "content": msg.content} for msg in session.history]

        existing = self.history_manager.get_interview(user_id, session_id)
        if existing:
            self.history_manager.update_interview(user_id, session_id, messages, summary, session.job_role)
        else:
            self.history_manager.add_interview(user_id, session_id, messages, summary, session.job_role)

        del self.sessions[session_id]
        return summary

    def get_all_interviews(self, user_id: str) -> list:
        return self.history_manager.get_interviews(user_id)

    def get_interview(self, user_id: str, session_id: str) -> Optional[dict]:
        return self.history_manager.get_interview(user_id, session_id)

    def delete_interview(self, user_id: str, session_id: str) -> bool:
        return self.history_manager.delete_interview(user_id, session_id)

    def save_resume(self, user_id: str, text: str, filename: str = "") -> bool:
        if Config.RESUME_STORAGE_ENABLED:
            return self.resume_manager.save_resume(user_id, text, filename)
        return False

    def load_saved_resume(self, user_id: str):
        if Config.RESUME_STORAGE_ENABLED:
            return self.resume_manager.load_resume(user_id)
        return None

    def delete_saved_resume(self, user_id: str) -> bool:
        if Config.RESUME_STORAGE_ENABLED:
            return self.resume_manager.delete_resume(user_id)
        return False

    def has_saved_resume(self, user_id: str) -> bool:
        if Config.RESUME_STORAGE_ENABLED:
            return self.resume_manager.has_resume(user_id)
        return False

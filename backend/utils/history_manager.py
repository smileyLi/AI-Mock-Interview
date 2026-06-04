import json
from typing import List, Optional
from datetime import datetime
from pathlib import Path

from ..config import DATA_DIR


class HistoryManager:
    """面试历史数据管理器 - 支持多用户"""

    def __init__(self, data_dir: Optional[str] = None):
        self.data_dir = Path(data_dir) if data_dir else DATA_DIR
        self.history_file = self.data_dir / "interview_history.json"
        self._ensure_data_dir()
        self._ensure_history_file()

    def _ensure_data_dir(self):
        self.data_dir.mkdir(parents=True, exist_ok=True)

    def _ensure_history_file(self):
        if not self.history_file.exists():
            self._save_history([])

    def _load_history(self) -> List[dict]:
        try:
            with open(self.history_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return []

    def _save_history(self, history: List[dict]):
        with open(self.history_file, "w", encoding="utf-8") as f:
            json.dump(history, f, ensure_ascii=False, indent=2)

    def add_interview(self, user_id: str, session_id: str, messages: List[dict], summary: str = "", job_role: str = "java_backend") -> dict:
        history = self._load_history()
        interview = {
            "user_id": user_id,
            "session_id": session_id,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "messages": messages,
            "summary": summary,
            "job_role": job_role
        }
        history.insert(0, interview)
        self._save_history(history)
        return interview

    def update_interview(self, user_id: str, session_id: str, messages: List[dict], summary: str = "", job_role: Optional[str] = None):
        history = self._load_history()
        for interview in history:
            if interview["session_id"] == session_id and interview["user_id"] == user_id:
                interview["messages"] = messages
                interview["updated_at"] = datetime.utcnow().isoformat()
                if summary:
                    interview["summary"] = summary
                if job_role:
                    interview["job_role"] = job_role
                break
        self._save_history(history)

    def get_interviews(self, user_id: str) -> List[dict]:
        history = self._load_history()
        user_interviews = []
        for i in history:
            if i.get("user_id") == user_id:
                if "job_role" not in i:
                    i["job_role"] = "java_backend"
                user_interviews.append(i)
        return user_interviews

    def get_interview(self, user_id: str, session_id: str) -> Optional[dict]:
        history = self._load_history()
        for i in history:
            if i.get("session_id") == session_id and i.get("user_id") == user_id:
                if "job_role" not in i:
                    i["job_role"] = "java_backend"
                return i
        return None

    def delete_interview(self, user_id: str, session_id: str) -> bool:
        history = self._load_history()
        original_length = len(history)
        new_history = []
        for i in history:
            if not (i.get("session_id") == session_id and i.get("user_id") == user_id):
                new_history.append(i)
        if len(new_history) < original_length:
            self._save_history(new_history)
            return True
        return False

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict

from ..config import Config
from ..logger import get_logger


class ResumeManager:
    """简历持久化管理器 - 支持多用户"""

    def __init__(self):
        self.storage_dir = Path(Config.RESUME_STORAGE_DIR)
        self.logger = get_logger(__name__)
        self._ensure_dir()

    def _ensure_dir(self):
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def _get_user_file(self, user_id: str) -> Path:
        return self.storage_dir / f"resume_{user_id}.json"

    def save_resume(self, user_id: str, text: str, filename: str = "") -> bool:
        if not text or not text.strip():
            return False
        resume_data = {
            "text": text.strip(),
            "filename": filename,
            "saved_at": datetime.utcnow().isoformat(),
            "char_count": len(text.strip())
        }
        try:
            user_file = self._get_user_file(user_id)
            with open(user_file, "w", encoding="utf-8") as f:
                json.dump(resume_data, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            self.logger.error(f"保存简历失败: {e}")
            return False

    def load_resume(self, user_id: str) -> Optional[Dict[str, str]]:
        user_file = self._get_user_file(user_id)
        if not user_file.exists():
            return None
        try:
            with open(user_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError, Exception) as e:
            self.logger.error(f"加载简历失败: {e}")
            return None

    def delete_resume(self, user_id: str) -> bool:
        user_file = self._get_user_file(user_id)
        if user_file.exists():
            try:
                os.remove(user_file)
                return True
            except Exception as e:
                self.logger.error(f"删除简历失败: {e}")
                return False
        return False

    def has_resume(self, user_id: str) -> bool:
        return self._get_user_file(user_id).exists()
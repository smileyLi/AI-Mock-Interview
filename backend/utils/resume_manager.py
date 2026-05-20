import json
import os
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict

from ..config import Config


class ResumeManager:
    """简历持久化管理器"""

    def __init__(self):
        self.storage_dir = Path(Config.RESUME_STORAGE_DIR)
        self.default_resume_file = self.storage_dir / "default.json"
        self._ensure_dir()

    def _ensure_dir(self):
        """确保存储目录存在"""
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def save_resume(self, text: str, filename: str = "") -> bool:
        """
        保存简历到本地文件
        
        Args:
            text: 简历文本内容
            filename: 原始文件名
        
        Returns:
            是否保存成功
        """
        if not text or not text.strip():
            return False

        resume_data = {
            "text": text.strip(),
            "filename": filename,
            "saved_at": datetime.now().isoformat(),
            "char_count": len(text.strip())
        }

        try:
            with open(self.default_resume_file, 'w', encoding='utf-8') as f:
                json.dump(resume_data, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            print(f"保存简历失败: {e}")
            return False

    def load_resume(self) -> Optional[Dict[str, str]]:
        """
        加载保存的简历
        
        Returns:
            简历数据字典，包含 text, filename, saved_at, char_count 字段
            如果没有保存的简历返回 None
        """
        if not self.default_resume_file.exists():
            return None

        try:
            with open(self.default_resume_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError, Exception) as e:
            print(f"加载简历失败: {e}")
            return None

    def delete_resume(self) -> bool:
        """
        删除保存的简历
        
        Returns:
            是否删除成功
        """
        if self.default_resume_file.exists():
            try:
                os.remove(self.default_resume_file)
                return True
            except Exception as e:
                print(f"删除简历失败: {e}")
                return False
        return False

    def has_resume(self) -> bool:
        """
        检查是否有保存的简历
        
        Returns:
            是否存在保存的简历
        """
        return self.default_resume_file.exists()
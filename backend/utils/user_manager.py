import json
import uuid
import bcrypt
from pathlib import Path
from typing import Optional
from datetime import datetime
from ..config import DATA_DIR
from ..models.user import User


class UserManager:
    def __init__(self, data_dir: Optional[str] = None):
        self.data_dir = Path(data_dir) if data_dir else DATA_DIR
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.users_file = self.data_dir / "users.json"
        self._ensure_users_file()

    def _ensure_users_file(self):
        if not self.users_file.exists():
            self._save_users({})

    def _load_users(self) -> dict:
        try:
            with open(self.users_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return {}

    def _save_users(self, users: dict):
        with open(self.users_file, "w", encoding="utf-8") as f:
            json.dump(users, f, ensure_ascii=False, indent=2, default=str)

    @staticmethod
    def hash_password(password: str) -> str:
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

    @staticmethod
    def verify_password(password: str, password_hash: str) -> bool:
        try:
            return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
        except Exception:
            return False

    def get_user_by_username(self, username: str) -> Optional[User]:
        users = self._load_users()
        user_data = users.get(username)
        if user_data:
            return User(**user_data)
        return None

    def get_user_by_email(self, email: str) -> Optional[User]:
        users = self._load_users()
        for user_data in users.values():
            if user_data["email"] == email:
                return User(**user_data)
        return None

    def get_user_by_id(self, user_id: str) -> Optional[User]:
        users = self._load_users()
        for user_data in users.values():
            if user_data["user_id"] == user_id:
                return User(**user_data)
        return None

    def create_user(self, username: str, email: str, password: str) -> Optional[User]:
        if self.get_user_by_username(username):
            return None
        if self.get_user_by_email(email):
            return None

        user_id = str(uuid.uuid4())
        password_hash = self.hash_password(password)
        user = User(
            user_id=user_id,
            username=username,
            email=email,
            password_hash=password_hash,
            created_at=datetime.utcnow()
        )
        users = self._load_users()
        users[username] = user.model_dump(mode="json")
        self._save_users(users)
        return user

    def update_password(self, username: str, new_password_hash: str) -> bool:
        users = self._load_users()
        user_data = users.get(username)
        if not user_data:
            return False
        user_data["password_hash"] = new_password_hash
        users[username] = user_data
        self._save_users(users)
        return True

import random
import string
import time
from ..utils.user_manager import UserManager
from ..services.email_service import EmailService


class EmailVerificationService:

    CODE_EXPIRE_SECONDS = 300
    MAX_FAILED_ATTEMPTS = 3

    def __init__(self):
        self.user_manager = UserManager()
        self.email_service = EmailService()
        self._codes: dict = {}

    def _cleanup_expired_codes(self):
        now = time.time()
        expired = [k for k, v in self._codes.items() if now - v["created_at"] > self.CODE_EXPIRE_SECONDS]
        for k in expired:
            del self._codes[k]

    def _generate_code(self) -> str:
        return "".join(random.choices(string.digits, k=6))

    def send_register_code(self, email: str) -> None:
        self._cleanup_expired_codes()

        if self.user_manager.get_user_by_email(email):
            raise ValueError("邮箱已被注册")

        code = self._generate_code()
        self.email_service.send_verification_code(email, code, purpose="register")

        key = f"register_{email}"
        self._codes[key] = {
            "code": code,
            "email": email,
            "created_at": time.time(),
            "attempts": 0,
            "purpose": "register"
        }

    def register_with_code(self, username: str, email: str, password: str, code: str):
        self._cleanup_expired_codes()

        if self.user_manager.get_user_by_username(username):
            raise ValueError("用户名已存在")

        if self.user_manager.get_user_by_email(email):
            raise ValueError("邮箱已被注册")

        key = f"register_{email}"
        self._verify_code(key, code)

        user = self.user_manager.create_user(username, email, password)
        if not user:
            raise ValueError("创建用户失败")

        del self._codes[key]
        return user

    def send_reset_code(self, username: str, email: str) -> None:
        self._cleanup_expired_codes()

        user = self.user_manager.get_user_by_username(username)
        if not user:
            raise ValueError("用户名不存在")

        if user.email != email:
            raise ValueError("邮箱与注册邮箱不匹配")

        code = self._generate_code()
        self.email_service.send_verification_code(email, code)

        key = f"reset_{username}"
        self._codes[key] = {
            "code": code,
            "email": email,
            "created_at": time.time(),
            "attempts": 0,
            "purpose": "reset"
        }

    def reset_password_with_code(self, username: str, email: str, code: str, new_password: str) -> None:
        self._cleanup_expired_codes()

        user = self.user_manager.get_user_by_username(username)
        if not user:
            raise ValueError("用户名不存在")

        if user.email != email:
            raise ValueError("邮箱与注册邮箱不匹配")

        key = f"reset_{username}"
        self._verify_code(key, code)

        record = self._codes.get(key)
        if record and record.get("email") != email:
            del self._codes[key]
            raise ValueError("邮箱与发送验证码时的邮箱不一致")

        new_hash = self.user_manager.hash_password(new_password)
        self.user_manager.update_password(username, new_hash)

        del self._codes[key]

    def _verify_code(self, key: str, code: str) -> None:
        record = self._codes.get(key)
        if not record:
            raise ValueError("请先获取验证码")

        record["attempts"] = record.get("attempts", 0) + 1

        if record["attempts"] > self.MAX_FAILED_ATTEMPTS:
            del self._codes[key]
            raise ValueError("验证码已失效（错误次数过多），请重新获取")

        if code != record["code"]:
            remaining = self.MAX_FAILED_ATTEMPTS - record["attempts"]
            raise ValueError(f"验证码错误，还剩{remaining}次机会")

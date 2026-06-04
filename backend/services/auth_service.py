from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from ..config import Config
from ..models.user import User, UserResponse


class AuthService:
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 1天

    def __init__(self, secret_key: str = None):
        self.secret_key = secret_key or Config.JWT_SECRET_KEY
        if not self.secret_key:
            raise ValueError("JWT_SECRET_KEY 环境变量未设置，请在 .env 文件中配置")

    def create_access_token(self, user: User) -> str:
        to_encode = {
            "sub": user.user_id,
            "username": user.username,
            "exp": datetime.utcnow() + timedelta(minutes=self.ACCESS_TOKEN_EXPIRE_MINUTES)
        }
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.ALGORITHM)
        return encoded_jwt

    def verify_token(self, token: str) -> Optional[dict]:
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.ALGORITHM])
            return payload
        except JWTError:
            return None

    def get_user_id_from_token(self, token: str) -> Optional[str]:
        payload = self.verify_token(token)
        return payload.get("sub") if payload else None

    @staticmethod
    def to_user_response(user: User) -> UserResponse:
        return UserResponse(
            user_id=user.user_id,
            username=user.username,
            email=user.email,
            created_at=user.created_at
        )

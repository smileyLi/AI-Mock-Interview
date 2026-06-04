import os
from pathlib import Path
from dotenv import load_dotenv

os.environ["OPENAI_DISABLE_PROXY"] = "1"

load_dotenv()

_BACKEND_DIR = Path(__file__).resolve().parent
_PROJECT_ROOT = _BACKEND_DIR.parent
DATA_DIR = _PROJECT_ROOT / "data"
_MODELS_BGE_ZH = _PROJECT_ROOT / "models" / "bge-small-zh-v1.5"


class Config:
    # DeepSeek配置
    DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
    DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1"

    # JWT配置
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")

    # SMTP邮件配置
    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.qq.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")

    # 服务器配置
    HOST = "127.0.0.1"
    PORT = 8000

    # CORS配置（允许前端访问）
    ALLOWED_ORIGINS = [
        "http://127.0.0.1:8765",
        "http://localhost:8765",
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:8000",
        "http://localhost:8000",
    ]

    # 面试配置
    MAX_HISTORY = 10
    TEMPERATURE = 0.7
    MAX_TOKENS = 1000
    SUMMARY_MAX_TOKENS = int(os.getenv("SUMMARY_MAX_TOKENS", "3500"))
    SUMMARY_TEMPERATURE = float(os.getenv("SUMMARY_TEMPERATURE", "0.45"))
    SUMMARY_RESUME_MAX_CHARS = int(os.getenv("SUMMARY_RESUME_MAX_CHARS", "8000"))

    # RAG配置 - 单Collection多岗位方案
    RAG_ENABLED = os.getenv("RAG_ENABLED", "false").lower() in ("1", "true", "yes")
    RAG_DB_DIR = os.getenv("RAG_DB_DIR", str(DATA_DIR / "chroma_db"))
    RAG_COLLECTION = os.getenv("RAG_COLLECTION", "knowledge_base")
    RAG_ST_MODEL_PATH = os.getenv(
        "RAG_ST_MODEL_PATH",
        str(_MODELS_BGE_ZH) if _MODELS_BGE_ZH.is_dir() else "BAAI/bge-small-zh-v1.5",
    )
    RAG_TOP_K = int(os.getenv("RAG_TOP_K", "4"))
    RAG_CONTEXT_MAX_CHARS = int(os.getenv("RAG_CONTEXT_MAX_CHARS", "4000"))
    EMBEDDING_MODEL = os.getenv(
        "EMBEDDING_MODEL",
        str(_MODELS_BGE_ZH) if _MODELS_BGE_ZH.is_dir() else "BAAI/bge-small-zh-v1.5",
    )
    _default_local_only = "true" if _MODELS_BGE_ZH.is_dir() else "false"
    EMBEDDING_LOCAL_ONLY = os.getenv("EMBEDDING_LOCAL_ONLY", _default_local_only).lower() in (
        "1",
        "true",
        "yes",
    )

    # 支持的岗位列表
    SUPPORTED_JOB_ROLES = [
        "java_backend",
        "web_frontend",
    ]
    DEFAULT_JOB_ROLE = os.getenv("DEFAULT_JOB_ROLE", "java_backend")

    # 题库环节
    QUESTION_BANK_ENABLED = os.getenv("QUESTION_BANK_ENABLED", "true").lower() in ("1", "true", "yes")
    MIN_USER_ROUNDS_BEFORE_BANK = int(os.getenv("MIN_USER_ROUNDS_BEFORE_BANK", "3"))
    QUESTION_BANK_SAMPLE_SIZE = int(os.getenv("QUESTION_BANK_SAMPLE_SIZE", "3"))
    MAX_USER_REPLIES_PER_BANK_QUESTION = int(os.getenv("MAX_USER_REPLIES_PER_BANK_QUESTION", "4"))
    QUESTION_BANK_MAX_CHARS_PER_ITEM = int(os.getenv("QUESTION_BANK_MAX_CHARS_PER_ITEM", "3500"))

    # 简历上传
    RESUME_MAX_CHARS = int(os.getenv("RESUME_MAX_CHARS", "12000"))
    MAX_RESUME_UPLOAD_BYTES = int(os.getenv("MAX_RESUME_UPLOAD_BYTES", str(10 * 1024 * 1024)))
    RESUME_MIN_CHARS_TO_START = int(os.getenv("RESUME_MIN_CHARS_TO_START", "0"))  # 设为0表示可选上传
    RESUME_IN_BANK_PHASE = os.getenv("RESUME_IN_BANK_PHASE", "false").lower() in ("1", "true", "yes")

    # 简历持久化配置
    RESUME_STORAGE_DIR = os.getenv("RESUME_STORAGE_DIR", str(DATA_DIR / "resumes"))
    RESUME_STORAGE_ENABLED = os.getenv("RESUME_STORAGE_ENABLED", "true").lower() in ("1", "true", "yes")


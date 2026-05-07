import os
from dotenv import load_dotenv

# 禁用OpenAI代理配置（解决httpx版本兼容性问题）
os.environ["OPENAI_DISABLE_PROXY"] = "1"

# 加载.env文件
load_dotenv()

class Config:
    # DeepSeek配置
    DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "sk-2f81ce925baa46d38bda44602934fec8")
    DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1"
    
    # 服务器配置
    HOST = "127.0.0.1"
    PORT = 8000
    
    # CORS配置（允许前端访问）
    ALLOWED_ORIGINS = [
        "http://127.0.0.1:5500",  # 本地开发服务器
        "http://localhost:5500",
        "http://127.0.0.1:8000",
        "http://localhost:8000",
    ]
    
    # 面试配置
    MAX_HISTORY = 10  # 最大历史轮数
    TEMPERATURE = 0.7
    MAX_TOKENS = 1000
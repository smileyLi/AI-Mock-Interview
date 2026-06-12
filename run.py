#!/usr/bin/env python
"""
启动脚本 - 同时启动后端和简单的前端服务器
"""
import logging
import subprocess
import sys
import os
import time
import webbrowser
import threading
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

# 项目根目录（保证工作目录正确，且子进程 stdout 不使用 PIPE，避免缓冲区塞满导致进程卡死）
ROOT = Path(__file__).resolve().parent

from backend.config import Config

BACKEND_HOST = Config.HOST
BACKEND_PORT = Config.PORT

FRONTEND_PORT = int(os.getenv("FRONTEND_PORT", "8765"))

def start_backend():
    """启动FastAPI后端"""
    logger.info("启动后端服务...")
    return subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "backend.main:app", "--host", BACKEND_HOST, "--port", str(BACKEND_PORT), "--reload"],
        cwd=ROOT,
    )

def start_frontend():
    """启动简单的前端服务器"""
    logger.info("启动前端服务...")
    return subprocess.Popen(
        [
            sys.executable, "-m", "http.server", str(FRONTEND_PORT),
            "--bind", "127.0.0.1",
            "--directory", "frontend",
        ],
        cwd=ROOT,
    )

def open_browser():
    """等待几秒后打开浏览器"""
    time.sleep(5)
    url = f"http://127.0.0.1:{FRONTEND_PORT}"
    webbrowser.open(url)
    logger.info(f"浏览器已打开，访问 {url}")

def check_backend_ready():
    """检查后端服务是否就绪"""
    import urllib.request
    import urllib.error
    
    url = f"http://{BACKEND_HOST}:{BACKEND_PORT}"
    max_retries = 10
    retry_delay = 1
    
    for i in range(max_retries):
        try:
            response = urllib.request.urlopen(url, timeout=2)
            if response.getcode() == 200:
                return True
        except urllib.error.URLError:
            pass
        time.sleep(retry_delay)
    
    return False

def main():
    logger.info("=" * 50)
    logger.info("AI面试系统启动中...")
    logger.info("=" * 50)
    
    # 启动后端
    backend_process = start_backend()
    logger.info(f"后端服务启动中 (http://{BACKEND_HOST}:{BACKEND_PORT})")
    
    # 等待后端启动并检查状态
    logger.info("等待后端服务就绪...")
    if check_backend_ready():
        logger.info("后端服务已就绪")
    else:
        logger.error("后端服务启动超时，请检查日志")
    
    # 启动前端
    frontend_process = start_frontend()
    logger.info(f"前端服务启动中 (http://127.0.0.1:{FRONTEND_PORT})")
    
    # 打开浏览器
    threading.Thread(target=open_browser, daemon=True).start()
    
    logger.info("按 Ctrl+C 停止所有服务")
    
    try:
        # 等待进程结束
        backend_process.wait()
        frontend_process.wait()
    except KeyboardInterrupt:
        logger.info("正在停止服务...")
        backend_process.terminate()
        frontend_process.terminate()
        logger.info("服务已停止")

if __name__ == "__main__":
    main()
#!/usr/bin/env python
"""
启动脚本
  开发模式: python run.py                 （后端 + 前端 http.server + 自动打开浏览器）
  生产模式: python run.py --production    （仅后端，去掉 reload，不启动前端）
或设置环境变量: PRODUCTION=true python run.py
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

ROOT = Path(__file__).resolve().parent

from backend.config import Config

BACKEND_HOST = Config.HOST
BACKEND_PORT = Config.PORT
FRONTEND_PORT = int(os.getenv("FRONTEND_PORT", "8765"))

IS_PRODUCTION = (
    os.getenv("PRODUCTION", "false").lower() in ("1", "true", "yes")
    or "--production" in sys.argv
)


def start_backend():
    logger.info("启动后端服务...")
    cmd = [
        sys.executable, "-m", "uvicorn", "backend.main:app",
        "--host", "0.0.0.0" if IS_PRODUCTION else BACKEND_HOST,
        "--port", str(BACKEND_PORT),
    ]
    if not IS_PRODUCTION:
        cmd.append("--reload")
    return subprocess.Popen(cmd, cwd=ROOT)


def start_frontend():
    if IS_PRODUCTION:
        logger.info("生产模式：跳过前端 http.server（请使用 Nginx 提供静态文件）")
        return None
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
    if IS_PRODUCTION:
        return
    time.sleep(5)
    url = f"http://127.0.0.1:{FRONTEND_PORT}"
    webbrowser.open(url)
    logger.info(f"浏览器已打开，访问 {url}")


def check_backend_ready():
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
    mode = "生产模式" if IS_PRODUCTION else "开发模式"
    logger.info(f"AI面试系统启动中...（{mode}）")
    logger.info("=" * 50)

    backend_process = start_backend()
    listen_addr = "0.0.0.0" if IS_PRODUCTION else BACKEND_HOST
    logger.info(f"后端服务启动中 (http://{listen_addr}:{BACKEND_PORT})")

    logger.info("等待后端服务就绪...")
    if check_backend_ready():
        logger.info("后端服务已就绪")
    else:
        logger.error("后端服务启动超时，请检查日志")

    frontend_process = start_frontend()
    if frontend_process:
        logger.info(f"前端服务启动中 (http://127.0.0.1:{FRONTEND_PORT})")

    threading.Thread(target=open_browser, daemon=True).start()

    logger.info("按 Ctrl+C 停止所有服务")

    try:
        backend_process.wait()
        if frontend_process:
            frontend_process.wait()
    except KeyboardInterrupt:
        logger.info("正在停止服务...")
        backend_process.terminate()
        if frontend_process:
            frontend_process.terminate()
        logger.info("服务已停止")


if __name__ == "__main__":
    main()

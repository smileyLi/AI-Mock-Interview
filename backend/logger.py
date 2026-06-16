import logging
import os
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path

_logger_configured = False


def get_logger(name: str) -> logging.Logger:
    global _logger_configured
    if not _logger_configured:
        _setup_logging()
        _logger_configured = True

    return logging.getLogger(name)


def _setup_logging():
    log_level = getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper(), logging.INFO)

    root = logging.getLogger()
    root.setLevel(log_level)
    root.handlers.clear()

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(logging.Formatter(
        fmt="%(asctime)s  %(levelname)-7s  %(name)s  %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    ))
    root.addHandler(console_handler)

    log_dir = Path(os.getenv("LOG_DIR", "logs"))
    if os.getenv("LOG_FILE_ENABLED", "false").lower() in ("1", "true", "yes"):
        log_dir.mkdir(parents=True, exist_ok=True)
        file_handler = RotatingFileHandler(
            log_dir / "app.log",
            maxBytes=10 * 1024 * 1024,
            backupCount=5,
            encoding="utf-8",
        )
        file_handler.setLevel(log_level)
        file_handler.setFormatter(logging.Formatter(
            fmt="%(asctime)s  %(levelname)-7s  %(name)s  %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        ))
        root.addHandler(file_handler)

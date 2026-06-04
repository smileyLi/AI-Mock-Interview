import logging
import sys

_logger_configured = False


def get_logger(name: str) -> logging.Logger:
    global _logger_configured
    if not _logger_configured:
        _setup_logging()
        _logger_configured = True

    return logging.getLogger(name)


def _setup_logging():
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(
        fmt="%(asctime)s  %(levelname)-7s  %(name)s  %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    ))

    root = logging.getLogger()
    root.setLevel(logging.INFO)
    root.handlers.clear()
    root.addHandler(handler)

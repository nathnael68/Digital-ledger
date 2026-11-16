import logging
import sys
from backend.app.core.config import settings


def setup_logging() -> logging.Logger:
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    log_format = (
        "%(asctime)s [%(levelname)s] [%(name)s] %(message)s (%(filename)s:%(lineno)d)"
    )

    logging.basicConfig(
        level=log_level,
        format=log_format,
        handlers=[
            logging.StreamHandler(sys.stdout),
        ],
        force=True,
    )

    logger = logging.getLogger("delgone_ledger")
    logger.setLevel(log_level)
    return logger


logger = setup_logging()

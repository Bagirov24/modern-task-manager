"""Structured logging configuration using structlog.

In production (DEBUG=False) logs are rendered as JSON so they can be
ingested by any log aggregator (Loki, Datadog, CloudWatch, ELK, etc.).

In development (DEBUG=True) logs are rendered with colours and aligned
key-value pairs for readability in a terminal.

Usage
-----
Call ``configure_logging()`` once at application startup (in lifespan)
before any loggers are used.  After that, use stdlib ``logging`` as
normal — structlog intercepts the stdlib root logger transparently.

Every log record will automatically include:
  - timestamp  (ISO-8601 UTC)
  - level      (INFO / WARNING / ERROR / ...)
  - logger     (module name)
  - event      (the log message)
  - correlation_id (if bound via CorrelationIDMiddleware)

Example output (production JSON)
---------------------------------
{"timestamp": "2026-07-29T13:00:00Z", "level": "info",
 "logger": "app.api.v1.tasks", "event": "task created",
 "correlation_id": "b9f1c3a2-..."}
"""
from __future__ import annotations

import logging
import logging.config
import sys
from typing import Any

import structlog


def configure_logging(debug: bool = False) -> None:
    """Configure stdlib + structlog for the whole application.

    Args:
        debug: When True, use coloured console output.  Pass
               ``settings.DEBUG`` from the call-site.
    """
    shared_processors: list[Any] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.processors.StackInfoRenderer(),
    ]

    if debug:
        # Developer-friendly output with colours
        renderer = structlog.dev.ConsoleRenderer()
    else:
        # Machine-readable JSON for production log aggregators
        renderer = structlog.processors.JSONRenderer()

    structlog.configure(
        processors=[
            *shared_processors,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    formatter = structlog.stdlib.ProcessorFormatter(
        foreign_pre_chain=shared_processors,
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            renderer,
        ],
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.handlers = [handler]
    root_logger.setLevel(logging.DEBUG if debug else logging.INFO)

    # Silence noisy third-party loggers
    for noisy in ("uvicorn.access", "sqlalchemy.engine", "httpx"):
        logging.getLogger(noisy).setLevel(
            logging.DEBUG if debug else logging.WARNING
        )

from __future__ import annotations

import json
import logging
from typing import Dict, Any

from fastapi import HTTPException
from openai import OpenAI
from app.core.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are a task management AI assistant. "
    "Parse natural language into structured task data. "
    "Return JSON with: title, description, priority (low/medium/high/urgent), "
    "due_date (ISO format or null), labels (list of strings)."
)


class AIService:
    """
    Wrapper around OpenAI API.

    Security notes:
    - Client is initialised lazily so the api_key is never present in
      module-level tracebacks during import errors.
    - All OpenAI exceptions are caught and re-raised as HTTP 503 so that
      the raw exception (which may include the api_key in repr) never
      propagates to FastAPI's default error handler or Sentry.
    """

    _client: OpenAI | None = None

    @classmethod
    def _get_client(cls) -> OpenAI:
        if cls._client is None:
            if not settings.OPENAI_API_KEY:
                raise HTTPException(
                    status_code=503,
                    detail="AI service is not configured",
                )
            cls._client = OpenAI(api_key=settings.OPENAI_API_KEY)
        return cls._client

    @staticmethod
    async def parse_natural_language(text: str) -> Dict[str, Any]:
        try:
            response = AIService._get_client().chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": text},
                ],
                response_format={"type": "json_object"},
                temperature=0.3,
            )
            return json.loads(response.choices[0].message.content)
        except HTTPException:
            raise
        except Exception as exc:
            # Log only the exception type — never the message which may
            # contain the api_key in OpenAI SDK error reprs.
            logger.error("AIService.parse_natural_language failed: %s", type(exc).__name__)
            raise HTTPException(status_code=503, detail="AI service unavailable")

    @staticmethod
    async def suggest_reschedule(tasks: list) -> Dict[str, Any]:
        try:
            task_list = "\n".join(
                [f"- {t.title} (due: {t.due_date}, priority: {t.priority})" for t in tasks]
            )
            response = AIService._get_client().chat.completions.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "Suggest optimal rescheduling for overdue tasks. Return JSON with task_id and new_due_date.",
                    },
                    {"role": "user", "content": f"Overdue tasks:\n{task_list}"},
                ],
                response_format={"type": "json_object"},
            )
            return json.loads(response.choices[0].message.content)
        except HTTPException:
            raise
        except Exception as exc:
            logger.error("AIService.suggest_reschedule failed: %s", type(exc).__name__)
            raise HTTPException(status_code=503, detail="AI service unavailable")

from openai import OpenAI
from app.core.config import settings
from typing import Dict, Any
import json

client = OpenAI(api_key=settings.OPENAI_API_KEY)

SYSTEM_PROMPT = """You are a task management AI assistant. Parse natural language into structured task data.
Return JSON with: title, description, priority (low/medium/high/urgent), due_date (ISO format or null), labels (list of strings)."""


class AIService:
    @staticmethod
    async def parse_natural_language(text: str) -> Dict[str, Any]:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": text},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
        )
        return json.loads(response.choices[0].message.content)

    @staticmethod
    async def suggest_reschedule(tasks: list) -> Dict[str, Any]:
        task_list = "\n".join([f"- {t.title} (due: {t.due_date}, priority: {t.priority})" for t in tasks])
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "Suggest optimal rescheduling for overdue tasks. Return JSON with task_id and new_due_date."},
                {"role": "user", "content": f"Overdue tasks:\n{task_list}"},
            ],
            response_format={"type": "json_object"},
        )
        return json.loads(response.choices[0].message.content)

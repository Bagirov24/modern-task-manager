import httpx
from typing import Optional, Dict, Any


class GoogleCalendarService:
    BASE_URL = "https://www.googleapis.com/calendar/v3"

    def __init__(self, access_token: str):
        self.headers = {"Authorization": f"Bearer {access_token}"}

    async def create_event(self, calendar_id: str, event_data: Dict[str, Any]) -> Dict:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.BASE_URL}/calendars/{calendar_id}/events",
                headers=self.headers,
                json=event_data,
            )
            response.raise_for_status()
            return response.json()

    async def sync_task_to_calendar(self, task, calendar_id: str = "primary") -> Dict:
        event = {
            "summary": task.title,
            "description": task.description or "",
            "start": {"dateTime": task.due_date.isoformat(), "timeZone": "UTC"},
            "end": {"dateTime": task.due_date.isoformat(), "timeZone": "UTC"},
        }
        return await self.create_event(calendar_id, event)

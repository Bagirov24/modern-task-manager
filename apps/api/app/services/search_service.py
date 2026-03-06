from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from app.models.task import Task
from app.models.project import Project
from typing import List, Dict, Any
from uuid import UUID


class SearchService:
    def __init__(self, db: Session):
        self.db = db

    def search_tasks(self, user_id: UUID, query: str, limit: int = 20) -> List[Task]:
        return self.db.query(Task).filter(
            Task.assignee_id == user_id,
            or_(
                Task.title.ilike(f"%{query}%"),
                Task.description.ilike(f"%{query}%"),
            ),
        ).limit(limit).all()

    def search_all(self, user_id: UUID, query: str) -> Dict[str, Any]:
        tasks = self.search_tasks(user_id, query)
        projects = self.db.query(Project).filter(
            Project.owner_id == user_id,
            Project.name.ilike(f"%{query}%"),
        ).all()
        return {"tasks": tasks, "projects": projects}

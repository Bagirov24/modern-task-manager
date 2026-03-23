from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from uuid import UUID
from typing import Optional, List
from datetime import datetime

from app.models.project import Project, Section
from app.models.task import Task, TaskStatus
from app.schemas.project import ProjectCreate, ProjectUpdate


class ProjectService:
    def __init__(self, db: Session):
        self.db = db

    def create_project(self, data: ProjectCreate, owner_id: UUID) -> Project:
        project = Project(
            name=data.name,
            description=data.description,
            color=data.color,
            icon=data.icon,
            owner_id=owner_id,
        )
        self.db.add(project)
        self.db.commit()
        self.db.refresh(project)
        return project

    def get_project(self, project_id: UUID) -> Optional[Project]:
        return (
            self.db.query(Project)
            .options(joinedload(Project.tasks), joinedload(Project.sections))
            .filter(Project.id == project_id)
            .first()
        )

    def get_projects_by_owner(
        self, owner_id: UUID, include_archived: bool = False
    ) -> List[Project]:
        query = self.db.query(Project).filter(Project.owner_id == owner_id)
        if not include_archived:
            query = query.filter(Project.is_archived == False)
        return query.order_by(Project.updated_at.desc()).all()

    def update_project(
        self, project_id: UUID, data: ProjectUpdate
    ) -> Optional[Project]:
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return None
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(project, field, value)
        project.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(project)
        return project

    def delete_project(self, project_id: UUID) -> bool:
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return False
        self.db.delete(project)
        self.db.commit()
        return True

    def archive_project(self, project_id: UUID) -> Optional[Project]:
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return None
        project.is_archived = not project.is_archived
        project.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(project)
        return project

    def get_project_stats(self, project_id: UUID) -> dict:
        total = self.db.query(func.count(Task.id)).filter(
            Task.project_id == project_id
        ).scalar() or 0
        completed = self.db.query(func.count(Task.id)).filter(
            Task.project_id == project_id,
            Task.status == TaskStatus.DONE,
        ).scalar() or 0
        return {
            "total_tasks": total,
            "completed_tasks": completed,
            "progress": round(completed / total * 100, 1) if total > 0 else 0,
        }

    # --- Sections ---

    def create_section(self, project_id: UUID, name: str) -> Section:
        position = self.db.query(func.count(Section.id)).filter(
            Section.project_id == project_id
        ).scalar() or 0
        section = Section(name=name, project_id=project_id, position=position)
        self.db.add(section)
        self.db.commit()
        self.db.refresh(section)
        return section

    def reorder_sections(self, section_ids: List[UUID]) -> None:
        for position, section_id in enumerate(section_ids):
            self.db.query(Section).filter(Section.id == section_id).update(
                {"position": position}
            )
        self.db.commit()

    def delete_section(self, section_id: UUID) -> bool:
        section = self.db.query(Section).filter(Section.id == section_id).first()
        if not section:
            return False
        self.db.delete(section)
        self.db.commit()
        return True

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload
from uuid import UUID
from typing import Optional, List
from datetime import datetime, timezone

from app.models.project import Project, Section
from app.models.task import Task, TaskStatus
from app.schemas.project import ProjectCreate, ProjectUpdate


class ProjectService:
    """Business-logic layer for Project and Section operations.

    All methods are async; session is injected via FastAPI Depends(get_db).
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ------------------------------------------------------------------
    # Projects
    # ------------------------------------------------------------------

    async def create_project(self, data: ProjectCreate, owner_id: UUID) -> Project:
        project = Project(
            name=data.name,
            description=data.description,
            color=data.color,
            icon=data.icon,
            owner_id=owner_id,
        )
        self.db.add(project)
        await self.db.commit()
        await self.db.refresh(project)
        return project

    async def get_project(self, project_id: UUID, owner_id: UUID) -> Optional[Project]:
        """Fetch project with tasks/sections, enforcing ownership."""
        result = await self.db.execute(
            select(Project)
            .options(joinedload(Project.tasks), joinedload(Project.sections))
            .where(Project.id == project_id, Project.owner_id == owner_id)
        )
        return result.scalars().first()

    async def get_projects_by_owner(
        self,
        owner_id: UUID,
        include_archived: bool = False,
    ) -> List[Project]:
        query = select(Project).where(Project.owner_id == owner_id)
        if not include_archived:
            query = query.where(Project.is_archived.is_(False))
        result = await self.db.execute(
            query.order_by(Project.updated_at.desc())
        )
        return result.scalars().all()

    async def update_project(
        self, project_id: UUID, data: ProjectUpdate, owner_id: UUID
    ) -> Optional[Project]:
        project = await self.get_project(project_id, owner_id)
        if not project:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(project, field, value)
        # updated_at is handled by the DB onupdate trigger; set explicitly
        # only if model lacks that (safety net).
        if not hasattr(Project.updated_at, "onupdate"):
            project.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(project)
        return project

    async def delete_project(self, project_id: UUID, owner_id: UUID) -> bool:
        project = await self.get_project(project_id, owner_id)
        if not project:
            return False
        await self.db.delete(project)
        await self.db.commit()
        return True

    async def archive_project(
        self, project_id: UUID, owner_id: UUID
    ) -> Optional[Project]:
        project = await self.get_project(project_id, owner_id)
        if not project:
            return None
        project.is_archived = not project.is_archived
        await self.db.commit()
        await self.db.refresh(project)
        return project

    async def get_project_stats(self, project_id: UUID, owner_id: UUID) -> dict:
        # Verify ownership first
        await self.get_project(project_id, owner_id)
        result = await self.db.execute(
            select(
                func.count(Task.id).label("total"),
                func.count(Task.id)
                .filter(Task.status == TaskStatus.DONE)
                .label("completed"),
            ).where(Task.project_id == project_id)
        )
        row = result.one()
        total = row.total or 0
        completed = row.completed or 0
        return {
            "total_tasks": total,
            "completed_tasks": completed,
            "progress": round(completed / total * 100, 1) if total > 0 else 0,
        }

    # ------------------------------------------------------------------
    # Sections
    # ------------------------------------------------------------------

    async def create_section(
        self, project_id: UUID, name: str, owner_id: UUID
    ) -> Section:
        # Verify project ownership before creating section
        await self.get_project(project_id, owner_id)
        count_result = await self.db.execute(
            select(func.count(Section.id)).where(Section.project_id == project_id)
        )
        position = count_result.scalar_one() or 0
        section = Section(name=name, project_id=project_id, position=position)
        self.db.add(section)
        await self.db.commit()
        await self.db.refresh(section)
        return section

    async def reorder_sections(
        self, section_ids: List[UUID], project_id: UUID, owner_id: UUID
    ) -> None:
        await self.get_project(project_id, owner_id)
        for position, section_id in enumerate(section_ids):
            result = await self.db.execute(
                select(Section).where(
                    Section.id == section_id,
                    Section.project_id == project_id,
                )
            )
            section = result.scalars().first()
            if section:
                section.position = position
        await self.db.commit()

    async def delete_section(
        self, section_id: UUID, project_id: UUID, owner_id: UUID
    ) -> bool:
        await self.get_project(project_id, owner_id)
        result = await self.db.execute(
            select(Section).where(
                Section.id == section_id,
                Section.project_id == project_id,
            )
        )
        section = result.scalars().first()
        if not section:
            return False
        await self.db.delete(section)
        await self.db.commit()
        return True

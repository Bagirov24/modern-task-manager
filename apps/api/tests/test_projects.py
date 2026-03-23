import pytest
from uuid import uuid4

from app.models.project import Project
from app.models.user import User
from app.services.project_service import ProjectService
from app.schemas.project import ProjectCreate, ProjectUpdate


def create_test_user(db):
    user = User(
        id=uuid4(),
        email="test@example.com",
        username="testuser",
        hashed_password="fakehash",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


class TestProjectService:
    def test_create_project(self, db):
        user = create_test_user(db)
        service = ProjectService(db)
        data = ProjectCreate(name="Test Project", description="A test", color="#FF5733")
        project = service.create_project(data, user.id)
        assert project.name == "Test Project"
        assert project.owner_id == user.id
        assert project.color == "#FF5733"

    def test_get_project(self, db):
        user = create_test_user(db)
        service = ProjectService(db)
        data = ProjectCreate(name="My Project")
        created = service.create_project(data, user.id)
        fetched = service.get_project(created.id)
        assert fetched is not None
        assert fetched.name == "My Project"

    def test_get_projects_by_owner(self, db):
        user = create_test_user(db)
        service = ProjectService(db)
        service.create_project(ProjectCreate(name="P1"), user.id)
        service.create_project(ProjectCreate(name="P2"), user.id)
        projects = service.get_projects_by_owner(user.id)
        assert len(projects) == 2

    def test_update_project(self, db):
        user = create_test_user(db)
        service = ProjectService(db)
        project = service.create_project(ProjectCreate(name="Old"), user.id)
        updated = service.update_project(project.id, ProjectUpdate(name="New"))
        assert updated.name == "New"

    def test_delete_project(self, db):
        user = create_test_user(db)
        service = ProjectService(db)
        project = service.create_project(ProjectCreate(name="Delete Me"), user.id)
        assert service.delete_project(project.id) is True
        assert service.get_project(project.id) is None

    def test_archive_project(self, db):
        user = create_test_user(db)
        service = ProjectService(db)
        project = service.create_project(ProjectCreate(name="Archive"), user.id)
        assert project.is_archived is False
        archived = service.archive_project(project.id)
        assert archived.is_archived is True

    def test_get_project_stats(self, db):
        user = create_test_user(db)
        service = ProjectService(db)
        project = service.create_project(ProjectCreate(name="Stats"), user.id)
        stats = service.get_project_stats(project.id)
        assert stats["total_tasks"] == 0
        assert stats["progress"] == 0

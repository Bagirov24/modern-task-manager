import pytest
from uuid import uuid4

from app.models.user import User
from app.models.task import Task
from app.models.project import Project
from app.services.label_service import LabelService
from app.schemas.label import LabelCreate, LabelUpdate


def setup_data(db):
    user = User(
        id=uuid4(),
        email="label@example.com",
        username="labeler",
        hashed_password="fakehash",
    )
    db.add(user)
    db.commit()
    project = Project(id=uuid4(), name="P", owner_id=user.id)
    db.add(project)
    db.commit()
    task = Task(id=uuid4(), title="T", project_id=project.id, creator_id=user.id)
    db.add(task)
    db.commit()
    return user, task


class TestLabelService:
    def test_create_label(self, db):
        service = LabelService(db)
        label = service.create_label(LabelCreate(name="Bug", color="#FF0000"))
        assert label.name == "Bug"
        assert label.color == "#FF0000"

    def test_get_all_labels(self, db):
        service = LabelService(db)
        service.create_label(LabelCreate(name="A"))
        service.create_label(LabelCreate(name="B"))
        labels = service.get_all_labels()
        assert len(labels) >= 2

    def test_update_label(self, db):
        service = LabelService(db)
        label = service.create_label(LabelCreate(name="Old"))
        updated = service.update_label(label.id, LabelUpdate(name="New"))
        assert updated.name == "New"

    def test_delete_label(self, db):
        service = LabelService(db)
        label = service.create_label(LabelCreate(name="Del"))
        assert service.delete_label(label.id) is True
        assert service.get_label(label.id) is None

    def test_assign_labels_to_task(self, db):
        user, task = setup_data(db)
        service = LabelService(db)
        l1 = service.create_label(LabelCreate(name="L1"))
        l2 = service.create_label(LabelCreate(name="L2"))
        service.assign_labels_to_task(task.id, [l1.id, l2.id])
        labels = service.get_labels_for_task(task.id)
        assert len(labels) == 2

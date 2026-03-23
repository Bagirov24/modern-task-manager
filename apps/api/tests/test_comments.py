import pytest
from uuid import uuid4

from app.models.user import User
from app.models.task import Task
from app.models.project import Project
from app.services.comment_service import CommentService
from app.schemas.comment import CommentCreate, CommentUpdate


def setup_task_with_user(db):
    user = User(
        id=uuid4(),
        email="commenter@example.com",
        username="commenter",
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


class TestCommentService:
    def test_create_comment(self, db):
        user, task = setup_task_with_user(db)
        service = CommentService(db)
        data = CommentCreate(content="Hello", task_id=task.id)
        comment = service.create_comment(data, user.id)
        assert comment.content == "Hello"
        assert comment.author_id == user.id

    def test_get_comments_by_task(self, db):
        user, task = setup_task_with_user(db)
        service = CommentService(db)
        service.create_comment(CommentCreate(content="C1", task_id=task.id), user.id)
        service.create_comment(CommentCreate(content="C2", task_id=task.id), user.id)
        comments, total = service.get_comments_by_task(task.id)
        assert total == 2

    def test_update_comment(self, db):
        user, task = setup_task_with_user(db)
        service = CommentService(db)
        comment = service.create_comment(
            CommentCreate(content="Old", task_id=task.id), user.id
        )
        updated = service.update_comment(
            comment.id, CommentUpdate(content="New"), user.id
        )
        assert updated.content == "New"

    def test_delete_comment(self, db):
        user, task = setup_task_with_user(db)
        service = CommentService(db)
        comment = service.create_comment(
            CommentCreate(content="Del", task_id=task.id), user.id
        )
        assert service.delete_comment(comment.id, user.id) is True

    def test_delete_comment_wrong_author(self, db):
        user, task = setup_task_with_user(db)
        service = CommentService(db)
        comment = service.create_comment(
            CommentCreate(content="X", task_id=task.id), user.id
        )
        assert service.delete_comment(comment.id, uuid4()) is False

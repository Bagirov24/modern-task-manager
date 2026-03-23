from sqlalchemy.orm import Session, joinedload
from uuid import UUID
from typing import Optional, List
from datetime import datetime

from app.models.comment import Comment
from app.models.user import User
from app.schemas.comment import CommentCreate, CommentUpdate


class CommentService:
    def __init__(self, db: Session):
        self.db = db

    def create_comment(
        self, data: CommentCreate, author_id: UUID
    ) -> Comment:
        comment = Comment(
            content=data.content,
            task_id=data.task_id,
            author_id=author_id,
        )
        self.db.add(comment)
        self.db.commit()
        self.db.refresh(comment)
        return comment

    def get_comment(self, comment_id: UUID) -> Optional[Comment]:
        return (
            self.db.query(Comment)
            .options(joinedload(Comment.author))
            .filter(Comment.id == comment_id)
            .first()
        )

    def get_comments_by_task(
        self, task_id: UUID, page: int = 1, per_page: int = 20
    ) -> tuple[List[Comment], int]:
        query = (
            self.db.query(Comment)
            .options(joinedload(Comment.author))
            .filter(Comment.task_id == task_id)
            .order_by(Comment.created_at.desc())
        )
        total = query.count()
        comments = query.offset((page - 1) * per_page).limit(per_page).all()
        return comments, total

    def update_comment(
        self, comment_id: UUID, data: CommentUpdate, author_id: UUID
    ) -> Optional[Comment]:
        comment = (
            self.db.query(Comment)
            .filter(Comment.id == comment_id, Comment.author_id == author_id)
            .first()
        )
        if not comment:
            return None
        if data.content is not None:
            comment.content = data.content
        comment.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(comment)
        return comment

    def delete_comment(self, comment_id: UUID, author_id: UUID) -> bool:
        comment = (
            self.db.query(Comment)
            .filter(Comment.id == comment_id, Comment.author_id == author_id)
            .first()
        )
        if not comment:
            return False
        self.db.delete(comment)
        self.db.commit()
        return True

    def get_comments_count(self, task_id: UUID) -> int:
        return (
            self.db.query(Comment)
            .filter(Comment.task_id == task_id)
            .count()
        )

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload
from uuid import UUID
from typing import Optional, List
from datetime import datetime, timezone

from app.models.comment import Comment
from app.schemas.comment import CommentCreate, CommentUpdate


class CommentService:
    """Business-logic layer for Comment operations.

    All methods are async; session is injected via FastAPI Depends(get_db).
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_comment(
        self, data: CommentCreate, author_id: UUID
    ) -> Comment:
        comment = Comment(
            content=data.content,
            task_id=data.task_id,
            author_id=author_id,
        )
        self.db.add(comment)
        await self.db.commit()
        await self.db.refresh(comment)
        return comment

    async def get_comment(self, comment_id: UUID) -> Optional[Comment]:
        result = await self.db.execute(
            select(Comment)
            .options(joinedload(Comment.author))
            .where(Comment.id == comment_id)
        )
        return result.scalars().first()

    async def get_comments_by_task(
        self, task_id: UUID, page: int = 1, per_page: int = 20
    ) -> tuple[List[Comment], int]:
        base_query = (
            select(Comment)
            .options(joinedload(Comment.author))
            .where(Comment.task_id == task_id)
        )
        count_result = await self.db.execute(
            select(func.count()).select_from(base_query.subquery())
        )
        total = count_result.scalar_one()
        result = await self.db.execute(
            base_query.order_by(Comment.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
        return result.scalars().all(), total

    async def update_comment(
        self,
        comment_id: UUID,
        data: CommentUpdate,
        author_id: UUID,
    ) -> Optional[Comment]:
        result = await self.db.execute(
            select(Comment).where(
                Comment.id == comment_id,
                Comment.author_id == author_id,
            )
        )
        comment = result.scalars().first()
        if not comment:
            return None
        if data.content is not None:
            comment.content = data.content
        # updated_at is handled by DB onupdate; explicit set as safety net
        comment.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(comment)
        return comment

    async def delete_comment(self, comment_id: UUID, author_id: UUID) -> bool:
        result = await self.db.execute(
            select(Comment).where(
                Comment.id == comment_id,
                Comment.author_id == author_id,
            )
        )
        comment = result.scalars().first()
        if not comment:
            return False
        await self.db.delete(comment)
        await self.db.commit()
        return True

    async def get_comments_count(self, task_id: UUID) -> int:
        result = await self.db.execute(
            select(func.count()).where(Comment.task_id == task_id)
        )
        return result.scalar_one()

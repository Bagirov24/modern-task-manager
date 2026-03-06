import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

task_labels = Table(
    "task_labels",
    Base.metadata,
    Column("task_id", UUID(as_uuid=True), ForeignKey("tasks.id"), primary_key=True),
    Column("label_id", UUID(as_uuid=True), ForeignKey("labels.id"), primary_key=True),
)


class Label(Base):
    __tablename__ = "labels"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    color = Column(String(7), default="#38bdf8")
    
    created_at = Column(DateTime, default=datetime.utcnow)

    tasks = relationship("Task", secondary=task_labels, back_populates="labels")

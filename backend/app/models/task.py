from sqlalchemy import Column, String, Text, DateTime, Integer, ForeignKey, Enum, Index
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
from datetime import datetime
import enum

class TaskPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class TaskCategory(str, enum.Enum):
    DEVELOPMENT = "development"
    TESTING = "testing"
    DESIGN = "design"
    DOCUMENTATION = "documentation"
    OTHER = "other"

class Task(BaseModel):
    __tablename__ = "tasks"

    title = Column(String(200), nullable=False, index=True)
    description = Column(Text)
    due_date = Column(DateTime, index=True)
    priority = Column(Enum(TaskPriority), default=TaskPriority.MEDIUM, nullable=False, index=True)
    status = Column(Enum(TaskStatus), default=TaskStatus.PENDING, nullable=False, index=True)
    category = Column(Enum(TaskCategory), default=TaskCategory.OTHER, nullable=False, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    team = relationship("Team", back_populates="tasks")
    creator = relationship("User", foreign_keys=[created_by], back_populates="created_tasks")
    assignments = relationship("TaskAssignment", back_populates="task", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="task", cascade="all, delete-orphan")
    attachments = relationship("Attachment", back_populates="task", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="task", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_tasks_status_priority", "status", "priority"),
        Index("ix_tasks_team_status", "team_id", "status"),
    )

class TaskAssignment(BaseModel):
    __tablename__ = "task_assignments"

    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_at = Column(DateTime, default=datetime.utcnow)

    task = relationship("Task", back_populates="assignments")
    user = relationship("User", foreign_keys=[user_id], back_populates="tasks_assigned")
    assigner = relationship("User", foreign_keys=[assigned_by])

    __table_args__ = (
        Index("ix_task_assignments_unique", "task_id", "user_id", unique=True),
    )

class Comment(BaseModel):
    __tablename__ = "comments"

    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    comment = Column(Text, nullable=False)

    task = relationship("Task", back_populates="comments")
    user = relationship("User", back_populates="comments")

class Attachment(BaseModel):
    __tablename__ = "attachments"

    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False, index=True)
    file_url = Column(String(500), nullable=False)
    file_name = Column(String(200))
    file_size = Column(Integer)
    file_type = Column(String(50))
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    task = relationship("Task", back_populates="attachments")
    uploader = relationship("User", foreign_keys=[uploaded_by])

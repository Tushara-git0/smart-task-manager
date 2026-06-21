from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from pydantic import ConfigDict
from app.models.task import TaskPriority, TaskStatus, TaskCategory

class AssignmentInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    assigned_by: int
    assigned_at: datetime

class CommentCreate(BaseModel):
    comment: str = Field(..., min_length=1, max_length=2000)

class CommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    task_id: int
    user_id: int
    comment: str
    created_at: datetime

class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: TaskPriority = TaskPriority.MEDIUM
    category: TaskCategory = TaskCategory.OTHER
    team_id: Optional[int] = None
    assigned_to: List[int] = []

class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Optional[TaskPriority] = None
    status: Optional[TaskStatus] = None
    category: Optional[TaskCategory] = None

class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    description: Optional[str]
    due_date: Optional[datetime]
    priority: str
    status: str
    category: str
    team_id: Optional[int]
    created_by: int
    created_at: datetime
    updated_at: datetime
    assignments: List[AssignmentInfo] = []

class TaskAssignRequest(BaseModel):
    user_ids: List[int]

class PaginatedTasks(BaseModel):
    items: List[TaskResponse]
    total: int
    page: int
    limit: int
    pages: int

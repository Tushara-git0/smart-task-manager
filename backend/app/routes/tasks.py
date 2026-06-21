import os
import math
import shutil
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.core.cache import cache_get, cache_set, cache_delete_pattern
from app.core.config import settings
from app.models.user import User
from app.models.task import Task, TaskStatus, TaskPriority, TaskCategory, TaskAssignment, Comment, Attachment
from app.models.team import Team, TeamMember
from app.models.activity_log import ActivityLog
from app.models.notification import Notification
from app.schemas.task import (
    TaskCreate, TaskUpdate, TaskResponse, PaginatedTasks,
    CommentCreate, CommentResponse, TaskAssignRequest
)

router = APIRouter(tags=["Tasks"])

def _log_activity(db, action: str, user_id: int, task_id: int, details: str):
    db.add(ActivityLog(action=action, user_id=user_id, task_id=task_id, details=details))

def _notify_users(db, user_ids: List[int], message: str, notif_type: str, task_id: int):
    for uid in user_ids:
        db.add(Notification(user_id=uid, message=message, type=notif_type, link=f"/tasks/{task_id}"))

@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_data: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role.value not in ("admin", "manager", "team_lead"):
        raise HTTPException(status_code=403, detail="Permission denied")

    if task_data.team_id and not db.query(Team).filter(Team.id == task_data.team_id).first():
        raise HTTPException(status_code=404, detail="Team not found")

    task = Task(
        title=task_data.title,
        description=task_data.description,
        due_date=task_data.due_date,
        priority=task_data.priority,
        category=task_data.category,
        team_id=task_data.team_id,
        created_by=current_user.id
    )
    db.add(task)
    db.flush()

    for user_id in task_data.assigned_to:
        if db.query(User).filter(User.id == user_id).first():
            db.add(TaskAssignment(task_id=task.id, user_id=user_id, assigned_by=current_user.id))

    _log_activity(db, "created", current_user.id, task.id, f"Created task: {task.title}")
    if task_data.assigned_to:
        _notify_users(db, task_data.assigned_to, f"Task '{task.title}' assigned to you", "task_assigned", task.id)

    db.commit()
    db.refresh(task)
    cache_delete_pattern("dashboard:*")
    return task

@router.get("/", response_model=PaginatedTasks)
async def get_tasks(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[TaskStatus] = None,
    priority: Optional[TaskPriority] = None,
    category: Optional[TaskCategory] = None,
    team_id: Optional[int] = None,
    assigned_to: Optional[int] = None,
    search: Optional[str] = None,
    sort_by: str = Query("created_at", pattern="^(created_at|due_date|priority|status|title)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Task)

    role = current_user.role.value
    if role == "employee":
        query = query.join(TaskAssignment, Task.id == TaskAssignment.task_id).filter(
            TaskAssignment.user_id == current_user.id
        )
    elif role == "team_lead":
        team_ids = db.query(TeamMember.team_id).filter(
            and_(TeamMember.user_id == current_user.id, TeamMember.role == "lead")
        ).subquery()
        query = query.filter(Task.team_id.in_(team_ids))
    elif role == "manager":
        manager_team_ids = db.query(Team.id).filter(Team.manager_id == current_user.id).subquery()
        query = query.filter(Task.team_id.in_(manager_team_ids.select()))

    if status:
        query = query.filter(Task.status == status)
    if priority:
        query = query.filter(Task.priority == priority)
    if category:
        query = query.filter(Task.category == category)
    if team_id:
        query = query.filter(Task.team_id == team_id)
    if assigned_to:
        query = query.join(TaskAssignment, Task.id == TaskAssignment.task_id).filter(
            TaskAssignment.user_id == assigned_to
        )
    if search:
        query = query.filter(or_(
            Task.title.ilike(f"%{search}%"),
            Task.description.ilike(f"%{search}%")
        ))

    total = query.count()
    sort_col = getattr(Task, sort_by)
    query = query.order_by(asc(sort_col) if sort_order == "asc" else desc(sort_col))
    items = query.offset((page - 1) * limit).limit(limit).all()

    return PaginatedTasks(items=items, total=total, page=page, limit=limit, pages=math.ceil(total / limit))

@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    task_data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    role = current_user.role.value
    if role == "employee":
        assigned = db.query(TaskAssignment).filter(
            and_(TaskAssignment.task_id == task_id, TaskAssignment.user_id == current_user.id)
        ).first()
        if not assigned:
            raise HTTPException(status_code=403, detail="Permission denied")
        if task_data.status and task_data.status not in (TaskStatus.IN_PROGRESS, TaskStatus.REVIEW, TaskStatus.COMPLETED):
            raise HTTPException(status_code=403, detail="Employees can only update status to in_progress, review, or completed")

    old_status = task.status
    for field, value in task_data.model_dump(exclude_unset=True).items():
        setattr(task, field, value)

    if task_data.status and task_data.status != old_status:
        assigned_user_ids = [a.user_id for a in task.assignments]
        _notify_users(db, assigned_user_ids, f"Task '{task.title}' status → {task_data.status.value}", "status_changed", task.id)

    _log_activity(db, "updated", current_user.id, task.id, f"Updated task: {task.title}")
    db.commit()
    db.refresh(task)
    cache_delete_pattern("dashboard:*")
    return task

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role.value not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="Permission denied")

    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    _log_activity(db, "deleted", current_user.id, task.id, f"Deleted task: {task.title}")
    db.delete(task)
    db.commit()
    cache_delete_pattern("dashboard:*")

@router.post("/{task_id}/assign")
async def assign_task(
    task_id: int,
    assign_data: TaskAssignRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role.value not in ("admin", "manager", "team_lead"):
        raise HTTPException(status_code=403, detail="Permission denied")

    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    added = []
    for user_id in assign_data.user_ids:
        existing = db.query(TaskAssignment).filter(
            and_(TaskAssignment.task_id == task_id, TaskAssignment.user_id == user_id)
        ).first()
        if not existing and db.query(User).filter(User.id == user_id).first():
            db.add(TaskAssignment(task_id=task_id, user_id=user_id, assigned_by=current_user.id))
            added.append(user_id)

    if added:
        _notify_users(db, added, f"Task '{task.title}' assigned to you", "task_assigned", task_id)
        _log_activity(db, "assigned", current_user.id, task_id, f"Assigned task to users: {added}")

    db.commit()
    return {"message": f"Assigned to {len(added)} users"}

@router.post("/{task_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def add_comment(
    task_id: int,
    comment_data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not db.query(Task).filter(Task.id == task_id).first():
        raise HTTPException(status_code=404, detail="Task not found")

    comment = Comment(task_id=task_id, user_id=current_user.id, comment=comment_data.comment)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment

@router.get("/{task_id}/comments", response_model=List[CommentResponse])
async def get_comments(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not db.query(Task).filter(Task.id == task_id).first():
        raise HTTPException(status_code=404, detail="Task not found")
    return db.query(Comment).filter(Comment.task_id == task_id).order_by(Comment.created_at).all()

@router.post("/{task_id}/attachments")
async def upload_attachment(
    task_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    allowed_types = {"application/pdf", "application/msword",
                     "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                     "image/jpeg", "image/png", "image/gif"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="File type not allowed")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_path = f"{settings.UPLOAD_DIR}/{task_id}_{file.filename}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    attachment = Attachment(
        task_id=task_id,
        file_url=file_path,
        file_name=file.filename,
        file_type=file.content_type,
        uploaded_by=current_user.id
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return {"id": attachment.id, "file_name": attachment.file_name, "file_url": attachment.file_url}

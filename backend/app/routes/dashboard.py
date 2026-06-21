from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc
from datetime import datetime, timedelta
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.core.cache import cache_get, cache_set
from app.models.user import User
from app.models.task import Task, TaskStatus, TaskPriority, TaskAssignment
from app.models.team import Team, TeamMember
from app.models.activity_log import ActivityLog
from app.models.notification import Notification

router = APIRouter(tags=["Dashboard"])

@router.get("/stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cache_key = f"dashboard:stats:{current_user.id}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    base_query = db.query(Task)
    role = current_user.role.value

    if role == "employee":
        base_query = base_query.join(TaskAssignment, Task.id == TaskAssignment.task_id).filter(
            TaskAssignment.user_id == current_user.id
        )
    elif role == "team_lead":
        team_ids = db.query(TeamMember.team_id).filter(
            and_(TeamMember.user_id == current_user.id, TeamMember.role == "lead")
        ).subquery()
        base_query = base_query.filter(Task.team_id.in_(team_ids))
    elif role == "manager":
        manager_team_ids = db.query(Team.id).filter(Team.manager_id == current_user.id).subquery()
        base_query = base_query.filter(Task.team_id.in_(manager_team_ids))

    now = datetime.utcnow()
    total = base_query.count()
    completed = base_query.filter(Task.status == TaskStatus.COMPLETED).count()
    pending = base_query.filter(Task.status == TaskStatus.PENDING).count()
    in_progress = base_query.filter(Task.status == TaskStatus.IN_PROGRESS).count()
    review = base_query.filter(Task.status == TaskStatus.REVIEW).count()
    overdue = base_query.filter(
        and_(Task.due_date < now, Task.status.notin_([TaskStatus.COMPLETED, TaskStatus.CANCELLED]))
    ).count()

    priority_stats = db.query(Task.priority, func.count(Task.id)).group_by(Task.priority).all()
    status_stats = db.query(Task.status, func.count(Task.id)).group_by(Task.status).all()

    weekly_stats = []
    for i in range(7):
        day = now - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day.replace(hour=23, minute=59, second=59, microsecond=999999)
        count = base_query.filter(and_(Task.created_at >= day_start, Task.created_at <= day_end)).count()
        completed_day = base_query.filter(
            and_(Task.updated_at >= day_start, Task.updated_at <= day_end, Task.status == TaskStatus.COMPLETED)
        ).count()
        weekly_stats.append({"date": day.strftime("%Y-%m-%d"), "created": count, "completed": completed_day})

    result = {
        "total_tasks": total,
        "completed_tasks": completed,
        "pending_tasks": pending,
        "in_progress": in_progress,
        "review_tasks": review,
        "overdue_tasks": overdue,
        "completion_rate": round((completed / total * 100) if total > 0 else 0, 2),
        "priority_stats": [{"priority": p[0].value, "count": p[1]} for p in priority_stats],
        "status_stats": [{"status": s[0].value, "count": s[1]} for s in status_stats],
        "weekly_stats": list(reversed(weekly_stats)),
        "user_role": role,
    }
    cache_set(cache_key, result, expire=60)
    return result

@router.get("/activity")
async def get_activity_logs(
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(ActivityLog)
    if current_user.role.value == "employee":
        query = query.filter(ActivityLog.user_id == current_user.id)

    logs = query.order_by(desc(ActivityLog.created_at)).limit(limit).all()
    return [
        {
            "id": log.id,
            "action": log.action,
            "user_id": log.user_id,
            "task_id": log.task_id,
            "details": log.details,
            "created_at": log.created_at.isoformat()
        }
        for log in logs
    ]

@router.get("/team-performance")
async def get_team_performance(
    current_user: User = Depends(require_role("manager")),
    db: Session = Depends(get_db)
):
    cache_key = f"dashboard:team_perf:{current_user.id}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    if current_user.role.value == "admin":
        teams = db.query(Team).all()
    else:
        teams = db.query(Team).filter(Team.manager_id == current_user.id).all()

    now = datetime.utcnow()
    performance = []
    for team in teams:
        q = db.query(Task).filter(Task.team_id == team.id)
        total = q.count()
        completed = q.filter(Task.status == TaskStatus.COMPLETED).count()
        overdue = q.filter(
            and_(Task.due_date < now, Task.status.notin_([TaskStatus.COMPLETED, TaskStatus.CANCELLED]))
        ).count()
        member_count = db.query(TeamMember).filter(TeamMember.team_id == team.id).count()

        performance.append({
            "team_id": team.id,
            "team_name": team.name,
            "total_tasks": total,
            "completed_tasks": completed,
            "overdue_tasks": overdue,
            "member_count": member_count,
            "completion_rate": round((completed / total * 100) if total > 0 else 0, 2),
        })

    cache_set(cache_key, performance, expire=120)
    return performance

@router.get("/notifications")
async def get_notifications(
    unread_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    if unread_only:
        query = query.filter(Notification.is_read == False)
    notifications = query.order_by(desc(Notification.created_at)).limit(50).all()
    return [
        {
            "id": n.id,
            "message": n.message,
            "type": n.type,
            "link": n.link,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat()
        }
        for n in notifications
    ]

@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notification = db.query(Notification).filter(
        and_(Notification.id == notification_id, Notification.user_id == current_user.id)
    ).first()
    if notification:
        notification.is_read = True
        db.commit()
    return {"message": "Marked as read"}

@router.put("/notifications/read-all")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.query(Notification).filter(
        and_(Notification.user_id == current_user.id, Notification.is_read == False)
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}

@router.get("/users")
async def get_all_users(
    current_user: User = Depends(require_role("manager")),
    db: Session = Depends(get_db)
):
    users = db.query(User).filter(User.is_active == True).all()
    return [{"id": u.id, "name": u.name, "email": u.email, "role": u.role.value} for u in users]

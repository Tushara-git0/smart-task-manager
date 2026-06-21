from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "task_management",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.workers.tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "check-overdue-tasks": {
            "task": "app.workers.tasks.check_overdue_tasks",
            "schedule": crontab(hour=8, minute=0),
        },
    },
)

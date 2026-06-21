import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from sqlalchemy import and_

from app.workers.celery_app import celery_app
from app.core.config import settings

logger = logging.getLogger(__name__)

def send_email(to_email: str, subject: str, body: str):
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.info(f"[Email skipped - no SMTP config] To: {to_email}, Subject: {subject}")
        return

    msg = MIMEMultipart()
    msg["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.SMTP_USER}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "html"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
        logger.info(f"Email sent to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")

@celery_app.task(name="app.workers.tasks.send_task_assigned_email")
def send_task_assigned_email(user_email: str, user_name: str, task_title: str, task_id: int):
    body = f"""
    <h2>New Task Assigned</h2>
    <p>Hi {user_name},</p>
    <p>You have been assigned a new task: <strong>{task_title}</strong></p>
    <p><a href="http://localhost:3000/tasks/{task_id}">View Task</a></p>
    """
    send_email(user_email, f"New Task: {task_title}", body)

@celery_app.task(name="app.workers.tasks.send_deadline_reminder_email")
def send_deadline_reminder_email(user_email: str, user_name: str, task_title: str, due_date: str):
    body = f"""
    <h2>Task Deadline Reminder</h2>
    <p>Hi {user_name},</p>
    <p>Task <strong>{task_title}</strong> is due on <strong>{due_date}</strong></p>
    <p>Please complete it before the deadline.</p>
    """
    send_email(user_email, f"Deadline Reminder: {task_title}", body)

@celery_app.task(name="app.workers.tasks.check_overdue_tasks")
def check_overdue_tasks():
    from app.core.database import SessionLocal
    from app.models.task import Task, TaskStatus, TaskAssignment
    from app.models.user import User

    db = SessionLocal()
    try:
        now = datetime.utcnow()
        tomorrow = now + timedelta(days=1)

        upcoming_tasks = db.query(Task).filter(
            and_(
                Task.due_date >= now,
                Task.due_date <= tomorrow,
                Task.status.notin_([TaskStatus.COMPLETED, TaskStatus.CANCELLED])
            )
        ).all()

        for task in upcoming_tasks:
            for assignment in task.assignments:
                user = db.query(User).filter(User.id == assignment.user_id).first()
                if user:
                    send_deadline_reminder_email.delay(
                        user.email,
                        user.name,
                        task.title,
                        task.due_date.strftime("%Y-%m-%d %H:%M")
                    )

        logger.info(f"Checked {len(upcoming_tasks)} tasks with upcoming deadlines")
    finally:
        db.close()

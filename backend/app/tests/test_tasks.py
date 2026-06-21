import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.core.database import get_db
from app.models.base import Base
from app.models.user import User, UserRole
from app.core.security import get_password_hash

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_tasks.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    manager = User(
        name="Manager User",
        email="manager@example.com",
        phone="1234567890",
        password_hash=get_password_hash("Manager123!"),
        role=UserRole.MANAGER
    )
    db.add(manager)
    db.commit()
    db.close()
    yield

def get_manager_token():
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "manager@example.com", "password": "Manager123!"}
    )
    return response.json()["access_token"]

def test_create_task():
    token = get_manager_token()
    response = client.post(
        "/api/v1/tasks/",
        json={"title": "Test Task", "priority": "high", "category": "development"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Task"
    assert data["priority"] == "high"
    assert data["status"] == "pending"

def test_get_tasks():
    token = get_manager_token()
    client.post("/api/v1/tasks/", json={"title": "Task 1"}, headers={"Authorization": f"Bearer {token}"})
    client.post("/api/v1/tasks/", json={"title": "Task 2"}, headers={"Authorization": f"Bearer {token}"})
    response = client.get("/api/v1/tasks/", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    # Admins/managers without a team see all tasks they created
    assert "total" in data
    assert "items" in data

def test_update_task():
    token = get_manager_token()
    create_resp = client.post(
        "/api/v1/tasks/",
        json={"title": "Update Me"},
        headers={"Authorization": f"Bearer {token}"}
    )
    task_id = create_resp.json()["id"]
    response = client.put(
        f"/api/v1/tasks/{task_id}",
        json={"status": "in_progress", "title": "Updated Title"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "in_progress"
    assert response.json()["title"] == "Updated Title"

def test_delete_task():
    token = get_manager_token()
    create_resp = client.post(
        "/api/v1/tasks/",
        json={"title": "Delete Me"},
        headers={"Authorization": f"Bearer {token}"}
    )
    task_id = create_resp.json()["id"]
    response = client.delete(f"/api/v1/tasks/{task_id}", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 204

    get_resp = client.get(f"/api/v1/tasks/{task_id}", headers={"Authorization": f"Bearer {token}"})
    assert get_resp.status_code == 404

def test_task_search():
    token = get_manager_token()
    client.post("/api/v1/tasks/", json={"title": "Frontend development task"}, headers={"Authorization": f"Bearer {token}"})
    response = client.get("/api/v1/tasks/?search=Frontend", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert "total" in response.json()

def test_task_pagination():
    token = get_manager_token()
    for i in range(5):
        client.post("/api/v1/tasks/", json={"title": f"Task {i}"}, headers={"Authorization": f"Bearer {token}"})
    response = client.get("/api/v1/tasks/?page=1&limit=3", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) <= 3
    assert data["page"] == 1

def test_add_comment():
    token = get_manager_token()
    create_resp = client.post("/api/v1/tasks/", json={"title": "Comment Task"}, headers={"Authorization": f"Bearer {token}"})
    task_id = create_resp.json()["id"]
    response = client.post(
        f"/api/v1/tasks/{task_id}/comments",
        json={"comment": "This is a test comment"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 201
    assert response.json()["comment"] == "This is a test comment"

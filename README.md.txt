# 🚀 Task Management System

A production-ready task management system built with **FastAPI**, **React**, **PostgreSQL**, and **Docker**.

## ✨ Features

### Core Features
- ✅ User Authentication (JWT)
- ✅ Role-Based Access Control
- ✅ Task CRUD Operations
- ✅ Task Assignment
- ✅ Team Workspaces
- ✅ Dashboard Analytics
- ✅ Search & Filtering
- ✅ Pagination

### Advanced Features
- 📊 Dashboard Analytics with Charts
- 📅 Calendar View
- 🌙 Dark Mode
- 📧 Email Notifications
- 📁 File Attachments
- 📈 Activity Logs
- 🔍 Advanced Search
- 📱 Mobile Responsive

### Technical Features
- 🐳 Docker Containerization
- ⚡ Redis Caching
- 🔄 Celery Background Jobs
- 🧪 Unit Testing (80%+ Coverage)
- 🔐 Rate Limiting
- 📚 API Documentation (Swagger/ReDoc)
- 🔄 CI/CD Pipeline

## 🛠️ Tech Stack

### Backend
- Python 3.10+
- FastAPI
- SQLAlchemy ORM
- PostgreSQL
- Redis
- Celery
- JWT Authentication
- Alembic Migrations

### Frontend
- React 18
- Tailwind CSS
- Chart.js
- React Router
- Axios
- React Query

### DevOps
- Docker & Docker Compose
- GitHub Actions
- Render/Railway/AWS Ready

## 📦 Installation

### Prerequisites
- Python 3.10+
- Node.js 18+
- Docker & Docker Compose (optional)
- PostgreSQL 15+ (or Docker)
- Redis 7+ (or Docker)

### Quick Start with Docker (Recommended)

```bash
# Clone repository
git clone https://github.com/yourusername/task-management-system.git
cd task-management-system

# Start all services
docker-compose up -d

# Run migrations
docker-compose exec backend alembic upgrade head

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/api/docs
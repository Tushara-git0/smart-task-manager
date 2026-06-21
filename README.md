# Smart Task Management System

A production-ready, full-stack task management system built with FastAPI, React, PostgreSQL, Redis, and Docker.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11, FastAPI, SQLAlchemy ORM, Alembic |
| Auth | JWT (Access + Refresh Tokens), bcrypt, OAuth2 |
| Database | PostgreSQL 15, normalized schema with indexes |
| Cache | Redis 7 |
| Queue | Celery + Redis Broker |
| Frontend | React 18, Tailwind CSS, React Query, Chart.js |
| DevOps | Docker, Docker Compose, GitHub Actions |

## Features

- JWT Authentication with refresh tokens
- Role-Based Access Control: Admin, Manager, Team Lead, Employee
- Full Task CRUD with search, filter, sort, and pagination
- Kanban board with drag-and-drop
- Team workspaces with member management
- Dashboard analytics with charts (Doughnut, Line, Bar)
- Calendar view for due dates
- Activity logs and notifications
- File attachments (PDF, DOCX, images)
- Task comments
- Redis caching for dashboard stats
- Celery background jobs for email notifications
- Deadline reminder emails (scheduled daily)
- Dark mode per user preference
- Rate limiting (100 req/min)
- CI/CD with GitHub Actions
- Swagger UI at `/api/docs`

## Project Structure

```
task-management-system/
├── backend/
│   ├── app/
│   │   ├── auth/routes.py          # Register, Login, Refresh, Profile
│   │   ├── core/
│   │   │   ├── config.py           # Settings via pydantic-settings
│   │   │   ├── database.py         # SQLAlchemy engine + session
│   │   │   ├── security.py         # JWT, bcrypt, RBAC
│   │   │   └── cache.py            # Redis helpers
│   │   ├── models/                 # SQLAlchemy ORM models
│   │   │   ├── user.py             # User, UserRole
│   │   │   ├── task.py             # Task, TaskAssignment, Comment, Attachment
│   │   │   ├── team.py             # Team, TeamMember
│   │   │   ├── activity_log.py     # ActivityLog
│   │   │   └── notification.py     # Notification
│   │   ├── routes/
│   │   │   ├── tasks.py            # Task CRUD, assign, comments, upload
│   │   │   ├── teams.py            # Team CRUD, member management
│   │   │   └── dashboard.py        # Stats, activity, notifications
│   │   ├── schemas/                # Pydantic request/response schemas
│   │   ├── workers/
│   │   │   ├── celery_app.py       # Celery configuration + beat schedule
│   │   │   └── tasks.py            # Email tasks, overdue checker
│   │   ├── tests/
│   │   │   ├── test_auth.py
│   │   │   └── test_tasks.py
│   │   └── main.py                 # FastAPI app, middleware, routers
│   ├── alembic/                    # Database migrations
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx          # Sidebar, topbar, notifications
│   │   │   ├── TaskCard.jsx        # Task card with priority/status badges
│   │   │   ├── TaskModal.jsx       # Create/Edit task modal
│   │   │   └── PrivateRoute.jsx
│   │   ├── context/AuthContext.jsx # Auth state, login, logout, dark mode
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx       # Stats, charts, activity feed
│   │   │   ├── Tasks.jsx           # Task list with filters & pagination
│   │   │   ├── Kanban.jsx          # Drag-and-drop Kanban board
│   │   │   ├── Teams.jsx           # Team management
│   │   │   ├── Calendar.jsx        # Monthly calendar with due dates
│   │   │   └── Profile.jsx         # Profile, password, dark mode
│   │   ├── services/api.js         # Axios instance + interceptors
│   │   └── App.jsx                 # Router config
│   ├── Dockerfile
│   └── nginx.conf
├── .github/workflows/ci-cd.yml     # CI/CD pipeline
├── docker-compose.yml
├── postman_collection.json
└── README.md
```

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/smart-task-management.git
cd smart-task-management

# 2. Copy and configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your values

# 3. Start all services
docker-compose up -d

# 4. Check logs
docker-compose logs -f backend
```

Services available:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Swagger Docs: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc
- Health Check: http://localhost:8000/health

### Option 2: Local Development

**Prerequisites:** Python 3.11+, Node.js 20+, PostgreSQL 15, Redis 7

**Backend:**
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL, REDIS_URL, SECRET_KEY

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# Runs at http://localhost:5173
```

**Celery worker (optional, for email notifications):**
```bash
cd backend
celery -A app.workers.celery_app worker --loglevel=info
celery -A app.workers.celery_app beat --loglevel=info
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/taskdb` | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection string |
| `SECRET_KEY` | — | JWT signing secret (min 32 chars, **change in production**) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Access token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh token lifetime |
| `SMTP_HOST` | `smtp.gmail.com` | Email SMTP host |
| `SMTP_PORT` | `587` | Email SMTP port |
| `SMTP_USER` | — | Email address |
| `SMTP_PASSWORD` | — | Email app password |
| `UPLOAD_DIR` | `uploads` | File upload directory |

## API Reference

All endpoints are prefixed with `/api/v1`. Interactive docs at `/api/docs`.

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Login, returns tokens | No |
| POST | `/auth/refresh` | Refresh access token | No |
| GET | `/auth/me` | Get current user | Yes |
| PUT | `/auth/me` | Update profile | Yes |
| POST | `/auth/change-password` | Change password | Yes |
| POST | `/auth/logout` | Logout | Yes |

### Tasks

| Method | Endpoint | Description | Min Role |
|--------|----------|-------------|----------|
| POST | `/tasks/` | Create task | team_lead |
| GET | `/tasks/` | List tasks (paginated, filterable) | employee |
| GET | `/tasks/{id}` | Get task | employee |
| PUT | `/tasks/{id}` | Update task | employee |
| DELETE | `/tasks/{id}` | Delete task | manager |
| POST | `/tasks/{id}/assign` | Assign users to task | team_lead |
| POST | `/tasks/{id}/comments` | Add comment | employee |
| GET | `/tasks/{id}/comments` | Get comments | employee |
| POST | `/tasks/{id}/attachments` | Upload file | employee |

**Task Query Parameters:**
- `page`, `limit` — pagination
- `status` — `pending` \| `in_progress` \| `review` \| `completed` \| `cancelled`
- `priority` — `low` \| `medium` \| `high` \| `critical`
- `category` — `development` \| `testing` \| `design` \| `documentation` \| `other`
- `search` — search in title and description
- `sort_by` — `created_at` \| `due_date` \| `priority` \| `title`
- `sort_order` — `asc` \| `desc`

### Teams

| Method | Endpoint | Description | Min Role |
|--------|----------|-------------|----------|
| POST | `/teams/` | Create team | manager |
| GET | `/teams/` | List teams | employee |
| GET | `/teams/{id}` | Get team | employee |
| PUT | `/teams/{id}` | Update team | manager |
| DELETE | `/teams/{id}` | Delete team | manager |
| POST | `/teams/{id}/members/{uid}` | Add member | manager |
| DELETE | `/teams/{id}/members/{uid}` | Remove member | manager |

### Dashboard

| Method | Endpoint | Description | Min Role |
|--------|----------|-------------|----------|
| GET | `/dashboard/stats` | Task analytics & charts | employee |
| GET | `/dashboard/activity` | Activity logs | employee |
| GET | `/dashboard/team-performance` | Team analytics | manager |
| GET | `/dashboard/notifications` | User notifications | employee |
| PUT | `/dashboard/notifications/{id}/read` | Mark read | employee |
| PUT | `/dashboard/notifications/read-all` | Mark all read | employee |
| GET | `/dashboard/users` | List all users | manager |

## Role Permissions

| Action | Admin | Manager | Team Lead | Employee |
|--------|-------|---------|-----------|----------|
| Create Task | ✅ | ✅ | ✅ | ❌ |
| Delete Task | ✅ | ✅ | ❌ | ❌ |
| Assign Task | ✅ | ✅ | ✅ | ❌ |
| Update Own Task Status | ✅ | ✅ | ✅ | ✅ |
| Create Team | ✅ | ✅ | ❌ | ❌ |
| View Team Performance | ✅ | ✅ | ❌ | ❌ |
| Manage All Resources | ✅ | ❌ | ❌ | ❌ |

## Running Tests

```bash
cd backend

# Run all tests
pytest app/tests/ -v

# With coverage report
pytest app/tests/ --cov=app --cov-report=html

# Open coverage report
open htmlcov/index.html
```

## Deployment

### Render

1. Connect your GitHub repository to Render
2. Create a **Web Service** for the backend:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Add a **PostgreSQL** and **Redis** addon in Render
4. Set all environment variables in Render dashboard
5. Create a **Static Site** for the frontend:
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`

### Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

railway login
railway init
railway up
```

### AWS EC2

```bash
# On EC2 instance
sudo apt update && sudo apt install -y docker.io docker-compose git
git clone https://github.com/yourusername/smart-task-management.git
cd smart-task-management
cp backend/.env.example backend/.env
# Edit .env with production values
docker-compose up -d
```

## Database Schema

```
users           → id, name, email, phone, password_hash, role, is_active, dark_mode
teams           → id, name, description, manager_id → users.id
team_members    → id, team_id → teams.id, user_id → users.id, role
tasks           → id, title, description, due_date, priority, status, category, team_id, created_by
task_assignments→ id, task_id → tasks.id, user_id → users.id, assigned_by → users.id
comments        → id, task_id → tasks.id, user_id → users.id, comment
attachments     → id, task_id → tasks.id, file_url, file_name, file_type, uploaded_by
activity_logs   → id, action, user_id → users.id, task_id → tasks.id, details
notifications   → id, user_id → users.id, message, is_read, type, link
```

## Create Admin User

After starting the backend, create an admin via psql or the API:

```bash
# Via docker exec
docker-compose exec postgres psql -U postgres -d taskdb -c \
  "UPDATE users SET role='admin' WHERE email='your@email.com';"
```

## API Versioning

- Current version: `/api/v1/`
- Docs: `/api/docs` (Swagger UI)
- ReDoc: `/api/redoc`

## License

MIT

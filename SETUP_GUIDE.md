# Survey Generator - Complete Setup Guide

This guide covers setting up and running the entire Survey Generator application including the FastAPI backend, Next.js frontend, and Celery worker.

## Prerequisites

- **Python 3.9+** (for backend and Celery)
- **Node.js 18+** (for frontend)
- **Redis** (for Celery and caching)
- **PostgreSQL or SQLite** (for database)
- **Git**

## Project Structure

```
Survey_Generator/
├── backend/          # FastAPI application
├── frontend/         # Next.js application
└── docker-compose.yml (optional)
```

---

## Part 1: Backend Setup

### 1.1 Install Python Dependencies

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 1.2 Configure Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Database
DATABASE_URL=sqlite:///./survey_generator.db
# For PostgreSQL: postgresql://user:password@localhost/survey_db

# Redis
REDIS_URL=redis://localhost:6379/0

# API Keys
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_API_KEY=your_google_api_key_here

# JWT Secret (change in production!)
SECRET_KEY=your-super-secret-key-change-in-production

# R2/S3 Storage (optional)
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://your-bucket.r2.cloudflarestorage.com

# Models
GPT3_MODEL=gpt-4o-mini
CHATGPT_MODEL=gpt-4o-mini
GEMINI_MODEL=gemini-2.5-flash

# Feature flags
INCLUDE_VIDEO_QUESTIONS=false
```

### 1.3 Initialize Database

```bash
# The database will be created automatically on first run
# For PostgreSQL, create the database first:
# createdb survey_db
```

### 1.4 Run FastAPI Backend

```bash
# Make sure you're in the backend directory with venv activated
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Run the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Expected Output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

**Access Points:**
- API: http://localhost:8000
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Health Check: http://localhost:8000/health

---

## Part 2: Redis Setup

### 2.1 Install Redis

**On Windows (using WSL or Docker):**
```bash
# Using Docker
docker run -d -p 6379:6379 redis:latest

# Or using WSL
wsl
sudo apt-get install redis-server
redis-server
```

**On macOS:**
```bash
# Using Homebrew
brew install redis
brew services start redis
```

**On Linux:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis-server
```

### 2.2 Verify Redis is Running

```bash
redis-cli ping
# Should return: PONG
```

---

## Part 3: Celery Worker Setup

### 3.1 Start Celery Worker

In a **new terminal**, navigate to the backend directory:

```bash
cd backend

# Activate virtual environment
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Start Celery worker
celery -A app.core.celery worker --loglevel=info
```

**Expected Output:**
```
 -------------- celery@hostname v5.3.6 (emerald-rush)
--- ***** -----
-- ******* ----
- *** --- * ---
- ** ---------- [config]
- ** ----------
- ** ----------
--- *** --- * --- [queues]
-------------- .> celery          exchange=celery(direct) key=celery

[Tasks]
  . app.tasks.survey_tasks.generate_survey_task

[2024-01-15 10:30:00,123: INFO/MainProcess] Connected to redis://localhost:6379/0
[2024-01-15 10:30:00,456: INFO/MainProcess] mingle: searching for executable celery script in /path/to/venv/bin
[2024-01-15 10:30:00,789: INFO/MainProcess] celery@hostname ready.
```

### 3.2 Optional: Celery Flower (Monitoring)

Monitor Celery tasks in real-time:

```bash
# In another terminal
cd backend
source venv/bin/activate

# Start Flower
celery -A app.core.celery flower --port=5555
```

Access Flower at: http://localhost:5555

---

## Part 4: Frontend Setup

### 4.1 Install Node Dependencies

```bash
cd frontend

# Install dependencies
npm install
```

### 4.2 Configure Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000

# Optional: For development/testing
NEXT_PUBLIC_JWT_TOKEN=
NEXT_PUBLIC_API_USERNAME=admin
NEXT_PUBLIC_API_PASSWORD=surveygen2024
```

### 4.3 Run Frontend Development Server

```bash
cd frontend

# Start development server
npm run dev
```

**Expected Output:**
```
> next dev

  ▲ Next.js 14.0.0
  - Local:        http://localhost:3000
  - Environments: .env.local

✓ Ready in 2.5s
```

**Access Points:**
- Frontend: http://localhost:3000
- Login Page: http://localhost:3000/login

---

## Part 5: Complete Startup Sequence

### Quick Start (All Services)

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Celery Worker:**
```bash
cd backend
source venv/bin/activate
celery -A app.core.celery worker --loglevel=info
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm run dev
```

**Terminal 4 (Optional) - Celery Flower:**
```bash
cd backend
source venv/bin/activate
celery -A app.core.celery flower --port=5555
```

### Verify All Services

```bash
# Check Backend
curl http://localhost:8000/health

# Check Frontend
curl http://localhost:3000

# Check Redis
redis-cli ping

# Check Celery (via Flower)
# Visit http://localhost:5555
```

---

## Part 6: First Time Usage

### 6.1 Create User Account

1. Open http://localhost:3000/login
2. Click "Create Account"
3. Enter username (3+ characters) and password (8+ characters)
4. Click "Create Account"

### 6.2 Login

1. Enter your credentials
2. Click "Sign In"
3. You'll be redirected to the survey creation page

### 6.3 Create Your First Survey

1. Fill in project details (Company Name, Project Name, Industry, Use Case)
2. Select AI Model (GPT-4O Mini or Gemini 2.0 Flash)
3. Click "Next: Research Objectives"
4. Review and edit the generated content
5. Click "Generate Survey"
6. Watch the real-time progress
7. Once complete, edit and export your survey

---

## Part 7: Troubleshooting

### Backend Issues

**Port 8000 already in use:**
```bash
# Find process using port 8000
lsof -i :8000  # macOS/Linux
netstat -ano | findstr :8000  # Windows

# Kill process or use different port
uvicorn app.main:app --port 8001
```

**Database errors:**
```bash
# Reset database (SQLite)
rm survey_generator.db

# For PostgreSQL
dropdb survey_db
createdb survey_db
```

**Missing API keys:**
- Ensure `.env` file has `OPENAI_API_KEY` and `GOOGLE_API_KEY`
- Get keys from:
  - OpenAI: https://platform.openai.com/api-keys
  - Google: https://ai.google.dev/

### Redis Issues

**Redis connection refused:**
```bash
# Check if Redis is running
redis-cli ping

# Start Redis if not running
redis-server  # macOS/Linux
# or use Docker
docker run -d -p 6379:6379 redis:latest
```

### Celery Issues

**No workers available:**
- Ensure Celery worker is running in a separate terminal
- Check Redis connection: `redis-cli ping`
- Check Celery logs for errors

**Tasks not executing:**
```bash
# Check Celery worker status
celery -A app.core.celery inspect active

# Check pending tasks
celery -A app.core.celery inspect reserved
```

### Frontend Issues

**Port 3000 already in use:**
```bash
# Use different port
npm run dev -- -p 3001
```

**API connection errors:**
- Verify backend is running: http://localhost:8000/health
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Check browser console for CORS errors

**Authentication issues:**
- Clear localStorage: Open DevTools → Application → Storage → Clear All
- Check JWT token in localStorage: `survey_jwt_token`
- Verify backend auth endpoints are working

---

## Part 8: Production Deployment

### Backend (Production)

```bash
# Use Gunicorn instead of Uvicorn
pip install gunicorn

# Run with Gunicorn
gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000

# Or use Docker
docker build -t survey-backend .
docker run -p 8000:8000 survey-backend
```

### Frontend (Production)

```bash
# Build for production
npm run build

# Start production server
npm start

# Or deploy to Vercel
npm install -g vercel
vercel
```

### Celery (Production)

```bash
# Use Supervisor or systemd to manage Celery worker
# Example with Supervisor:
# Create /etc/supervisor/conf.d/celery.conf

[program:celery]
command=celery -A app.core.celery worker --loglevel=info
directory=/path/to/backend
user=www-data
numprocs=1
stdout_logfile=/var/log/celery/worker.log
stderr_logfile=/var/log/celery/worker.log
autostart=true
autorestart=true
startsecs=10
stopwaitsecs=600
```

---

## Part 9: Docker Compose (Optional)

Create `docker-compose.yml` in the root directory:

```yaml
version: '3.8'

services:
  redis:
    image: redis:latest
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: survey_db
      POSTGRES_USER: survey_user
      POSTGRES_PASSWORD: survey_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://survey_user:survey_password@postgres:5432/survey_db
      REDIS_URL: redis://redis:6379/0
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      GOOGLE_API_KEY: ${GOOGLE_API_KEY}
    depends_on:
      - redis
      - postgres
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000

  celery:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://survey_user:survey_password@postgres:5432/survey_db
      REDIS_URL: redis://redis:6379/0
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      GOOGLE_API_KEY: ${GOOGLE_API_KEY}
    depends_on:
      - redis
      - postgres
    command: celery -A app.core.celery worker --loglevel=info

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://backend:8000
    depends_on:
      - backend

volumes:
  redis_data:
  postgres_data:
```

**Run with Docker Compose:**
```bash
docker-compose up -d
```

---

## Part 10: Useful Commands

### Backend

```bash
# Run tests
pytest

# Format code
black app/

# Lint code
flake8 app/

# Type checking
mypy app/
```

### Frontend

```bash
# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

### Database

```bash
# Access SQLite database
sqlite3 survey_generator.db

# Access PostgreSQL
psql -U survey_user -d survey_db
```

### Redis

```bash
# Monitor Redis commands
redis-cli monitor

# Check Redis memory
redis-cli info memory

# Clear all data
redis-cli FLUSHALL
```

---

## Summary

| Service | Port | Command | Terminal |
|---------|------|---------|----------|
| Backend | 8000 | `uvicorn app.main:app --reload` | 1 |
| Celery Worker | - | `celery -A app.core.celery worker` | 2 |
| Frontend | 3000 | `npm run dev` | 3 |
| Flower (Optional) | 5555 | `celery -A app.core.celery flower` | 4 |
| Redis | 6379 | `redis-server` | System |

All services should be running simultaneously for the application to work properly.

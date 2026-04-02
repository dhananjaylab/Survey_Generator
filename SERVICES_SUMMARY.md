# Survey Generator - Services Summary

Quick reference for running all services.

## 🎯 Three Main Services

### 1. Backend (FastAPI)
- **Port:** 8000
- **Command:** `uvicorn app.main:app --reload`
- **Location:** `backend/`
- **Status Check:** `curl http://localhost:8000/health`

### 2. Celery Worker
- **Port:** N/A (uses Redis)
- **Command:** `celery -A app.core.celery worker --loglevel=info`
- **Location:** `backend/`
- **Status Check:** `celery -A app.core.celery inspect active`

### 3. Frontend (Next.js)
- **Port:** 3000
- **Command:** `npm run dev`
- **Location:** `frontend/`
- **Status Check:** `curl http://localhost:3000`

---

## 📋 Prerequisites

```bash
# Check Python
python --version  # Should be 3.9+

# Check Node
node --version    # Should be 18+

# Check Redis
redis-cli ping    # Should return PONG
```

---

## 🚀 Startup Sequence

### Terminal 1: Backend
```bash
cd backend
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate.bat  # Windows

pip install -r requirements.txt  # First time only
uvicorn app.main:app --reload
```

### Terminal 2: Celery Worker
```bash
cd backend
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate.bat  # Windows

celery -A app.core.celery worker --loglevel=info
```

### Terminal 3: Frontend
```bash
cd frontend
npm install  # First time only
npm run dev
```

---

## ✅ Verification

After starting all services:

```bash
# Backend
curl http://localhost:8000/health
# Expected: {"status":"ok","message":"Survey API is running."}

# Redis
redis-cli ping
# Expected: PONG

# Celery
celery -A app.core.celery inspect active
# Should show active tasks

# Frontend
curl http://localhost:3000
# Should return HTML
```

---

## 🌐 Access Points

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:3000 | Main application |
| Login | http://localhost:3000/login | User authentication |
| Backend API | http://localhost:8000 | REST API |
| Swagger UI | http://localhost:8000/docs | API documentation |
| ReDoc | http://localhost:8000/redoc | Alternative API docs |
| Health Check | http://localhost:8000/health | Backend status |
| Metrics | http://localhost:8000/metrics | Application metrics |
| Flower | http://localhost:5555 | Celery monitoring (optional) |

---

## 🔧 Configuration Files

### Backend (.env)
```env
DATABASE_URL=sqlite:///./survey_generator.db
REDIS_URL=redis://localhost:6379/0
OPENAI_API_KEY=your_key_here
GOOGLE_API_KEY=your_key_here
SECRET_KEY=your-secret-key
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 🛑 Stopping Services

Press `Ctrl+C` in each terminal to stop the service.

---

## 🐛 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Redis not running | `redis-server` or `docker run -d -p 6379:6379 redis:latest` |
| Port 8000 in use | `uvicorn app.main:app --port 8001` |
| Port 3000 in use | `npm run dev -- -p 3001` |
| Module not found | `pip install -r requirements.txt` |
| Celery not working | Check Redis is running and Celery worker terminal |
| API connection failed | Check backend is running and `NEXT_PUBLIC_API_URL` is correct |

---

## 📊 Service Dependencies

```
Frontend (3000)
    ↓ HTTP/WebSocket
Backend (8000)
    ↓
Redis (6379) ← Celery Worker
    ↓
Database (SQLite/PostgreSQL)
    ↓
AI Services (OpenAI, Google)
```

---

## 🎯 Typical Workflow

1. **Start Redis** (if not running)
2. **Start Backend** (Terminal 1)
3. **Start Celery Worker** (Terminal 2)
4. **Start Frontend** (Terminal 3)
5. **Open http://localhost:3000**
6. **Create account and login**
7. **Create survey**
8. **Monitor progress** (optional: open Flower at http://localhost:5555)

---

## 📚 Documentation

- **START_HERE.md** - Quick start guide
- **RUN_SERVICES.md** - Detailed service management
- **SETUP_GUIDE.md** - Complete setup and troubleshooting
- **backend/README.md** - Backend documentation
- **frontend/README.md** - Frontend documentation

---

## 🚀 Production Deployment

See SETUP_GUIDE.md Part 8 for:
- Docker deployment
- Gunicorn configuration
- Supervisor setup
- Environment variables
- Security considerations

---

## 💡 Tips

1. **Use tmux for multiple terminals:**
   ```bash
   tmux new-session -d -s backend "cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
   tmux new-session -d -s celery "cd backend && source venv/bin/activate && celery -A app.core.celery worker --loglevel=info"
   tmux new-session -d -s frontend "cd frontend && npm run dev"
   ```

2. **Use Docker Compose:**
   ```bash
   docker-compose up -d
   ```

3. **Monitor with Flower:**
   ```bash
   celery -A app.core.celery flower --port=5555
   ```

4. **Check logs:**
   ```bash
   tail -f backend/logs/app.log
   ```

---

## ✨ All Services Running

When all services are running, you should see:

**Terminal 1 (Backend):**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

**Terminal 2 (Celery):**
```
[2024-01-15 10:30:00,123: INFO/MainProcess] Connected to redis://localhost:6379/0
[2024-01-15 10:30:00,456: INFO/MainProcess] celery@hostname ready.
```

**Terminal 3 (Frontend):**
```
✓ Ready in 2.5s
```

---

## 🎉 Ready to Go!

Your Survey Generator is ready to use. Visit http://localhost:3000 and start creating surveys!

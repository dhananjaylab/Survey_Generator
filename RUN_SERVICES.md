# Running Survey Generator Services

Quick reference guide for starting all services.

## 🚀 Quick Start (Recommended)

### Option 1: Automated Setup (macOS/Linux)

```bash
chmod +x quick-start.sh
./quick-start.sh
```

### Option 2: Automated Setup (Windows)

```bash
quick-start.bat
```

### Option 3: Manual Setup

Follow the detailed steps below.

---

## 📋 Prerequisites

Before running services, ensure you have:

1. **Python 3.9+**
   ```bash
   python --version
   ```

2. **Node.js 18+**
   ```bash
   node --version
   ```

3. **Redis running**
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

4. **API Keys** (in `backend/.env`)
   - OpenAI API Key
   - Google API Key

---

## 🔧 Manual Service Startup

### Step 1: Start Redis (if not already running)

**macOS:**
```bash
brew services start redis
# or
redis-server
```

**Linux:**
```bash
sudo systemctl start redis-server
# or
redis-server
```

**Windows (Docker):**
```bash
docker run -d -p 6379:6379 redis:latest
```

**Verify Redis:**
```bash
redis-cli ping
# Expected: PONG
```

---

### Step 2: Start Backend (Terminal 1)

```bash
cd backend

# Activate virtual environment
# macOS/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate.bat

# Install dependencies (first time only)
pip install -r requirements.txt

# Run backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Expected Output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

**Verify Backend:**
```bash
# In another terminal
curl http://localhost:8000/health
# Expected: {"status":"ok","message":"Survey API is running."}
```

**Access Points:**
- API: http://localhost:8000
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

### Step 3: Start Celery Worker (Terminal 2)

```bash
cd backend

# Activate virtual environment
# macOS/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate.bat

# Start Celery worker
celery -A app.core.celery worker --loglevel=info --pool=solo
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
[2024-01-15 10:30:00,456: INFO/MainProcess] celery@hostname ready.
```

**Verify Celery:**
```bash
# In another terminal
celery -A app.core.celery inspect active
# Should show active tasks
```

---

### Step 4: Start Frontend (Terminal 3)

```bash
cd frontend

# Install dependencies (first time only)
npm install

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
- Login: http://localhost:3000/login

---

### Step 5 (Optional): Start Celery Flower (Terminal 4)

Monitor Celery tasks in real-time:

```bash
cd backend

# Activate virtual environment
# macOS/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate.bat

# Start Flower
celery -A app.core.celery flower --port=5555
```

**Access Flower:**
- http://localhost:5555

---

## ✅ Verification Checklist

After starting all services, verify everything is working:

### Backend
- [ ] http://localhost:8000/health returns `{"status":"ok"}`
- [ ] http://localhost:8000/docs shows Swagger UI
- [ ] Backend terminal shows no errors

### Redis
- [ ] `redis-cli ping` returns `PONG`
- [ ] No connection errors in backend logs

### Celery
- [ ] Celery worker terminal shows "celery@hostname ready"
- [ ] No connection errors to Redis
- [ ] `celery -A app.core.celery inspect active` works

### Frontend
- [ ] http://localhost:3000 loads without errors
- [ ] http://localhost:3000/login shows login page
- [ ] Browser console has no errors

---

## 🧪 Test the Full Flow

1. **Create Account**
   - Go to http://localhost:3000/login
   - Click "Create Account"
   - Enter username and password
   - Click "Create Account"

2. **Login**
   - Enter credentials
   - Click "Sign In"

3. **Create Survey**
   - Fill in project details
   - Select AI model
   - Click "Next: Research Objectives"
   - Review content
   - Click "Generate Survey"
   - Watch progress in real-time

4. **Monitor Celery**
   - Open http://localhost:5555 (Flower)
   - Watch task execution
   - Check task status and logs

---

## 🐛 Troubleshooting

### Backend Won't Start

**Error: Port 8000 already in use**
```bash
# Find process using port 8000
lsof -i :8000  # macOS/Linux
netstat -ano | findstr :8000  # Windows

# Use different port
uvicorn app.main:app --port 8001
```

**Error: Module not found**
```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

**Error: Database locked**
```bash
# Remove old database
rm survey_generator.db
```

### Celery Won't Start

**Error: Connection refused (Redis)**
```bash
# Check Redis is running
redis-cli ping

# Start Redis
redis-server  # macOS/Linux
docker run -d -p 6379:6379 redis:latest  # Docker
```

**Error: No workers available**
- Ensure Celery worker terminal is running
- Check for errors in Celery terminal
- Verify Redis connection

### Frontend Won't Start

**Error: Port 3000 already in use**
```bash
# Use different port
npm run dev -- -p 3001
```

**Error: API connection failed**
- Verify backend is running: http://localhost:8000/health
- Check `NEXT_PUBLIC_API_URL` in `frontend/.env.local`
- Check browser console for CORS errors

**Error: Authentication failed**
- Clear browser storage: DevTools → Application → Storage → Clear All
- Try creating a new account
- Check backend logs for auth errors

### Redis Won't Start

**macOS:**
```bash
# Check if Redis is installed
brew list redis

# Install if missing
brew install redis

# Start Redis
brew services start redis
```

**Linux:**
```bash
# Install Redis
sudo apt-get install redis-server

# Start Redis
sudo systemctl start redis-server

# Check status
sudo systemctl status redis-server
```

**Windows (Docker):**
```bash
# Install Docker first, then:
docker run -d -p 6379:6379 redis:latest

# Verify
docker ps
```

---

## 📊 Service Status Commands

### Check Backend
```bash
curl http://localhost:8000/health
curl http://localhost:8000/health/detailed
```

### Check Redis
```bash
redis-cli ping
redis-cli info
redis-cli dbsize
```

### Check Celery
```bash
# Active tasks
celery -A app.core.celery inspect active

# Registered tasks
celery -A app.core.celery inspect registered

# Worker stats
celery -A app.core.celery inspect stats
```

### Check Frontend
```bash
curl http://localhost:3000
```

---

## 🛑 Stopping Services

### Stop Backend
- Press `Ctrl+C` in backend terminal

### Stop Celery
- Press `Ctrl+C` in Celery terminal

### Stop Frontend
- Press `Ctrl+C` in frontend terminal

### Stop Redis
```bash
# macOS
brew services stop redis

# Linux
sudo systemctl stop redis-server

# Docker
docker stop <container_id>
```

---

## 📝 Environment Variables

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

## 🚀 Production Deployment

### Backend
```bash
# Using Gunicorn
gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker

# Using Docker
docker build -t survey-backend .
docker run -p 8000:8000 survey-backend
```

### Frontend
```bash
# Build for production
npm run build

# Start production server
npm start

# Deploy to Vercel
vercel
```

### Celery
```bash
# Using Supervisor or systemd
# See SETUP_GUIDE.md for production configuration
```

---

## 📚 Additional Resources

- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Detailed setup instructions
- [Backend README](backend/README.md) - Backend documentation
- [Frontend README](frontend/README.md) - Frontend documentation
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Celery Docs](https://docs.celeryproject.io/)
- [Next.js Docs](https://nextjs.org/docs)

---

## 💡 Tips

1. **Use tmux or screen** for managing multiple terminals
   ```bash
   tmux new-session -d -s backend "cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
   tmux new-session -d -s celery "cd backend && source venv/bin/activate && celery -A app.core.celery worker --loglevel=info"
   tmux new-session -d -s frontend "cd frontend && npm run dev"
   ```

2. **Use Docker Compose** for easier management
   ```bash
   docker-compose up -d
   ```

3. **Monitor logs** in real-time
   ```bash
   # Backend
   tail -f backend/logs/app.log
   
   # Celery
   tail -f backend/logs/celery.log
   ```

4. **Use VS Code** with multiple terminals
   - Open VS Code
   - Open 3 terminals (Ctrl+`)
   - Run each service in a separate terminal

---

## ✨ Summary

| Service | Port | Command | Status |
|---------|------|---------|--------|
| Backend | 8000 | `uvicorn app.main:app --reload` | http://localhost:8000/health |
| Celery | - | `celery -A app.core.celery worker` | Check logs |
| Frontend | 3000 | `npm run dev` | http://localhost:3000 |
| Redis | 6379 | `redis-server` | `redis-cli ping` |
| Flower | 5555 | `celery -A app.core.celery flower` | http://localhost:5555 |

All services should be running simultaneously for the application to work properly.

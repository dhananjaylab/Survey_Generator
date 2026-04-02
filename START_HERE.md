# 🚀 Survey Generator - Start Here

Welcome to the Survey Generator! This document will get you up and running in minutes.

## ⚡ Quick Start (5 minutes)

### 1. Prerequisites Check

Make sure you have installed:
- Python 3.9+ → `python --version`
- Node.js 18+ → `node --version`
- Redis → `redis-cli ping` (should return PONG)

### 2. Run Setup Script

**macOS/Linux:**
```bash
chmod +x quick-start.sh
./quick-start.sh
```

**Windows:**
```bash
quick-start.bat
```

### 3. Configure API Keys

Edit `backend/.env` and add:
```env
OPENAI_API_KEY=your_key_here
GOOGLE_API_KEY=your_key_here
```

Get keys from:
- OpenAI: https://platform.openai.com/api-keys
- Google: https://ai.google.dev/

### 4. Start Services

Open 3 terminals and run:

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
uvicorn app.main:app --reload
```

**Terminal 2 - Celery Worker:**
```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
celery -A app.core.celery worker --loglevel=info
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm run dev
```

### 5. Access Application

Open http://localhost:3000 in your browser

---

## 📖 Detailed Documentation

- **[RUN_SERVICES.md](RUN_SERVICES.md)** - Complete guide to running services
- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Detailed setup and troubleshooting
- **[backend/README.md](backend/README.md)** - Backend documentation
- **[frontend/README.md](frontend/README.md)** - Frontend documentation

---

## 🎯 First Time Usage

1. **Create Account**
   - Go to http://localhost:3000/login
   - Click "Create Account"
   - Enter username (3+ chars) and password (8+ chars)

2. **Login**
   - Enter your credentials
   - Click "Sign In"

3. **Create Survey**
   - Fill in project details
   - Select AI model (GPT-4O Mini or Gemini 2.0 Flash)
   - Click "Next: Research Objectives"
   - Review and edit content
   - Click "Generate Survey"
   - Watch real-time progress
   - Edit and export your survey

---

## 🔍 Verify Services

### Backend
```bash
curl http://localhost:8000/health
# Expected: {"status":"ok","message":"Survey API is running."}
```

### Redis
```bash
redis-cli ping
# Expected: PONG
```

### Celery
```bash
celery -A app.core.celery inspect active
# Should show active tasks
```

### Frontend
```bash
curl http://localhost:3000
# Should return HTML
```

---

## 🐛 Common Issues

### Redis not running
```bash
# macOS
brew services start redis

# Linux
sudo systemctl start redis-server

# Docker
docker run -d -p 6379:6379 redis:latest
```

### Port already in use
```bash
# Backend on different port
uvicorn app.main:app --port 8001

# Frontend on different port
npm run dev -- -p 3001
```

### API connection failed
- Check backend is running: http://localhost:8000/health
- Check `NEXT_PUBLIC_API_URL` in `frontend/.env.local`
- Clear browser cache and localStorage

### Celery not working
- Verify Redis is running: `redis-cli ping`
- Check Celery worker terminal for errors
- Restart Celery worker

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│                   http://localhost:3000                  │
│  - React Components                                      │
│  - JWT Authentication                                    │
│  - Real-time Progress Tracking                           │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/WebSocket
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  Backend (FastAPI)                       │
│                   http://localhost:8000                  │
│  - REST API Endpoints                                    │
│  - JWT Authentication                                    │
│  - Rate Limiting                                         │
│  - WebSocket for Progress                               │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
    ┌────────┐  ┌────────┐  ┌──────────┐
    │Database│  │ Redis  │  │ Celery   │
    │(SQLite)│  │(Cache) │  │ Worker   │
    └────────┘  └────────┘  └──────────┘
                     │
                     ▼
            ┌─────────────────┐
            │  AI Services    │
            │  - OpenAI GPT   │
            │  - Google Gemini│
            └─────────────────┘
```

---

## 🛠️ Technology Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - ORM for database
- **Celery** - Async task queue
- **Redis** - Message broker & cache
- **JWT** - Authentication
- **Pydantic** - Data validation

### Frontend
- **Next.js** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **Framer Motion** - Animations

### Infrastructure
- **Redis** - Message broker
- **PostgreSQL/SQLite** - Database
- **Docker** - Containerization (optional)

---

## 📋 Service Ports

| Service | Port | URL |
|---------|------|-----|
| Backend | 8000 | http://localhost:8000 |
| Frontend | 3000 | http://localhost:3000 |
| Redis | 6379 | localhost:6379 |
| Flower (optional) | 5555 | http://localhost:5555 |

---

## 🔐 Security Features

- ✅ JWT Bearer Token Authentication
- ✅ Password Hashing (bcrypt)
- ✅ Rate Limiting (slowapi)
- ✅ CORS Protection
- ✅ Structured Logging
- ✅ Error Handling
- ✅ Token Expiration (24 hours)

---

## 📈 Features

### Survey Generation
- 🤖 AI-powered question generation
- 📝 Business overview analysis
- 🔬 Research objective synthesis
- ✨ Smart choice generation
- 📄 DOCX export

### Real-time Updates
- 📡 WebSocket progress tracking
- 🔄 Polling with retry logic
- 📊 Live task monitoring

### User Management
- 👤 User registration & login
- 🔐 JWT authentication
- 🚪 Session management

### Developer Experience
- 📚 Swagger UI documentation
- 🔍 Structured logging
- 📊 Metrics endpoint
- 🌐 CORS support

---

## 🚀 Next Steps

1. **Read Documentation**
   - [RUN_SERVICES.md](RUN_SERVICES.md) - Service management
   - [SETUP_GUIDE.md](SETUP_GUIDE.md) - Detailed setup

2. **Explore API**
   - Visit http://localhost:8000/docs
   - Try endpoints in Swagger UI

3. **Monitor Tasks**
   - Start Flower: `celery -A app.core.celery flower`
   - Visit http://localhost:5555

4. **Deploy**
   - See SETUP_GUIDE.md Part 8 for production deployment

---

## 💬 Support

### Troubleshooting
- Check [SETUP_GUIDE.md](SETUP_GUIDE.md) Part 7
- Check [RUN_SERVICES.md](RUN_SERVICES.md) Troubleshooting section

### Documentation
- Backend: [backend/README.md](backend/README.md)
- Frontend: [frontend/README.md](frontend/README.md)
- API: http://localhost:8000/docs

### External Resources
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Celery Documentation](https://docs.celeryproject.io/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Redis Documentation](https://redis.io/documentation)

---

## ✨ Summary

| Step | Command | Time |
|------|---------|------|
| 1. Run setup script | `./quick-start.sh` | 2 min |
| 2. Add API keys | Edit `backend/.env` | 1 min |
| 3. Start backend | `uvicorn app.main:app --reload` | 30 sec |
| 4. Start Celery | `celery -A app.core.celery worker` | 30 sec |
| 5. Start frontend | `npm run dev` | 30 sec |
| 6. Open browser | http://localhost:3000 | 10 sec |

**Total: ~5 minutes to get started!**

---

## 🎉 You're Ready!

Your Survey Generator is now running. Start creating amazing surveys with AI!

For detailed information, see:
- 📖 [RUN_SERVICES.md](RUN_SERVICES.md) - How to run services
- 📚 [SETUP_GUIDE.md](SETUP_GUIDE.md) - Complete setup guide
- 🔧 [backend/README.md](backend/README.md) - Backend details
- 🎨 [frontend/README.md](frontend/README.md) - Frontend details

Happy surveying! 🚀

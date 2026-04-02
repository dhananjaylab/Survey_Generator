# Celery Windows Fix - PermissionError Solution

## Issue
When running Celery on Windows, you get:
```
PermissionError: [WinError 5] Access is denied
```

This happens because Windows doesn't support POSIX fork operations that Celery's default `prefork` pool uses.

## Solution

### Option 1: Use Solo Pool (Recommended for Development)

Run Celery with the `solo` pool:

```bash
celery -A app.core.celery worker --loglevel=info --pool=solo
```

**Pros:**
- Simple, no additional dependencies
- Works perfectly for development
- Single-threaded, easier to debug

**Cons:**
- Only processes one task at a time
- Not suitable for production with high load

### Option 2: Use Threads Pool

Run Celery with the `threads` pool:

```bash
celery -A app.core.celery worker --loglevel=info --pool=threads
```

**Pros:**
- Can process multiple tasks concurrently
- Works well on Windows
- Good for development and light production use

**Cons:**
- Requires `python-gevent` for better performance
- Thread-based, not process-based

### Option 3: Use Gevent Pool (Best Performance)

Install gevent:
```bash
pip install gevent
```

Run Celery with gevent:
```bash
celery -A app.core.celery worker --loglevel=info --pool=gevent -c 1000
```

**Pros:**
- Best performance on Windows
- Can handle many concurrent tasks
- Lightweight coroutines

**Cons:**
- Requires additional dependency
- More complex setup

---

## Recommended Setup for Windows Development

### Quick Fix (Use This First)
```bash
celery -A app.core.celery worker --loglevel=info --pool=solo
```

### Better Performance
```bash
pip install gevent
celery -A app.core.celery worker --loglevel=info --pool=gevent -c 100
```

---

## Update Celery Configuration (Optional)

You can also update the Celery configuration to use a Windows-friendly pool by default.

Edit `backend/app/core/celery.py`:

```python
from celery import Celery
import platform

celery_app = Celery('survey_worker')
celery_app.config_from_object('app.core.config:settings')

# Use solo pool on Windows for development
if platform.system() == 'Windows':
    celery_app.conf.worker_pool = 'solo'
    celery_app.conf.worker_prefetch_multiplier = 1

celery_app.autodiscover_tasks(['app.tasks'])
```

Then you can run normally:
```bash
celery -A app.core.celery worker --loglevel=info
```

---

## Complete Windows Startup Commands

### Terminal 1 - Backend
```bash
cd backend
venv\Scripts\activate.bat
uvicorn app.main:app --reload
```

### Terminal 2 - Celery Worker (Windows)
```bash
cd backend
venv\Scripts\activate.bat
celery -A app.core.celery worker --loglevel=info --pool=solo
```

### Terminal 3 - Frontend
```bash
cd frontend
npm run dev
```

---

## Verification

After starting Celery, you should see:
```
celery@DHANANJAY v5.6.3 (recovery)
...
[tasks]
  . app.tasks.survey_tasks.generate_survey_task

[2026-04-02 18:11:21,088: INFO/MainProcess] celery@DHANANJAY ready.
```

No more `PermissionError` messages!

---

## Pool Comparison

| Pool | Windows | Performance | Concurrency | Use Case |
|------|---------|-------------|-------------|----------|
| prefork | ❌ No | High | High | Linux/Mac production |
| solo | ✅ Yes | Low | 1 task | Development |
| threads | ✅ Yes | Medium | Medium | Development/Light production |
| gevent | ✅ Yes | High | High | Production on Windows |

---

## Troubleshooting

### Still getting PermissionError?
1. Make sure you're using `--pool=solo` or `--pool=threads`
2. Close all previous Celery processes
3. Try running as Administrator (not recommended, but can help diagnose)

### Tasks not executing?
1. Verify Redis is running: `redis-cli ping`
2. Check backend is running: `curl http://localhost:8000/health`
3. Check Celery logs for errors

### Performance issues?
- Use `--pool=gevent` with gevent installed
- Increase concurrency: `celery -A app.core.celery worker --pool=gevent -c 100`

---

## Production Deployment on Windows

For production on Windows, use:

```bash
celery -A app.core.celery worker --loglevel=info --pool=gevent -c 100
```

Or use Windows Service with NSSM (Non-Sucking Service Manager):
```bash
nssm install CeleryWorker "C:\path\to\venv\Scripts\celery.exe" "-A app.core.celery worker --loglevel=info --pool=gevent"
nssm start CeleryWorker
```

---

## Summary

**For Windows Development:** Use `--pool=solo`
```bash
celery -A app.core.celery worker --loglevel=info --pool=solo
```

**For Windows Production:** Use `--pool=gevent`
```bash
pip install gevent
celery -A app.core.celery worker --loglevel=info --pool=gevent -c 100
```

This will resolve all Windows-related Celery issues!

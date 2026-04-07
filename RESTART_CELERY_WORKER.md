# Restart Celery Worker - URGENT

## Problem
The Celery worker is running with old code that doesn't have the `Path` import. The file has been updated, but the worker process hasn't reloaded.

## Error in Celery Logs
```
[2026-04-07 20:11:45,337: WARNING/MainProcess] 2026-04-07 20:11:45 [error] celery_task_failed
attempt=1 error="name 'Path' is not defined" request_id=req-1775572893145
```

## Solution

### Step 1: Stop the Current Celery Worker
In the terminal where Celery is running, press `Ctrl+C` to stop it.

### Step 2: Restart Celery Worker
Run this command in the backend directory:

```bash
cd backend
celery -A app.core.celery worker --loglevel=info --pool=solo
```

## Why This Happened
- The main backend server (uvicorn) has `--reload` flag which auto-reloads on file changes
- Celery worker does NOT auto-reload by default
- When you updated `backend/app/utils/prompts.py` to add the imports, the Celery worker didn't pick up the changes
- The worker is still running the old code without the `Path` import

## Verification
After restarting Celery, try the survey generation again. You should see:
1. Task received
2. Survey generation started
3. Business overview generated
4. Research objectives generated
5. Survey generated successfully

## Current Status
✅ File updated with imports: `backend/app/utils/prompts.py`
✅ Main backend server restarted (if needed)
❌ **Celery worker needs restart** ← YOU ARE HERE

## Alternative: Auto-Reload for Celery (Optional)
If you want Celery to auto-reload on code changes during development, you can install and use `watchdog`:

```bash
pip install watchdog
celery -A app.core.celery worker --loglevel=info --pool=solo --autoreload
```

But for now, just restart it manually.

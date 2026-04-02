# Windows Celery Setup Guide

## Overview

Celery, the distributed task queue library used by this application, requires special configuration on Windows due to platform differences. This guide explains why Windows needs different configuration and provides step-by-step setup instructions for both development and production environments.

## Why Windows Needs Different Pool Configuration

### The Problem

Celery's default worker pool is `prefork`, which uses POSIX fork operations to create child processes. **Windows does not support POSIX fork operations**, which causes Celery workers to crash with:

```
PermissionError [WinError 5] "Access is denied"
```

This error occurs in the billiard pool synchronization layer when attempting to access shared synchronization primitives (locks, semaphores) that are incompatible with Windows' process model.

### The Solution

Windows requires alternative pool types that don't rely on fork operations:

- **`solo` pool** (Development): Single-threaded, simple, no multiprocessing. Ideal for development and testing.
- **`gevent` pool** (Production): Async-based, better performance than solo, suitable for production workloads.

### Platform Behavior

| Platform | Pool Type | Behavior |
|----------|-----------|----------|
| **Windows** | `solo` (dev) | Single-threaded, simple, no multiprocessing |
| **Windows** | `gevent` (prod) | Async-based, better performance, requires gevent library |
| **Linux/Mac** | `prefork` | Multi-process, optimal performance (unchanged) |

## Automatic Platform Detection

The application automatically detects your platform and selects the appropriate pool type. You don't need to manually specify the pool in most cases.

**How it works:**
1. The `backend/app/core/celery.py` file detects your operating system at startup
2. For Windows, it checks the `CELERY_ENV` environment variable to determine development vs production
3. The appropriate pool type is automatically configured

## Development Setup (Windows)

### Prerequisites

- Python 3.8 or higher
- Redis server running (for task queue and result backend)
- Virtual environment activated

### Installation

1. **Install dependencies:**
   ```bash
   pip install -r backend/requirements.txt
   ```

2. **Verify Redis is running:**
   ```bash
   # Redis should be accessible at localhost:6379
   # If using Docker:
   docker run -d -p 6379:6379 redis:latest
   ```

3. **Set development environment (optional, defaults to development):**
   ```bash
   set CELERY_ENV=development
   ```

### Starting the Celery Worker

**Option 1: Automatic pool selection (recommended)**
```bash
cd backend
celery -A app.core.celery worker --loglevel=info
```

The application will automatically detect Windows and use the `solo` pool.

**Option 2: Explicit solo pool**
```bash
cd backend
celery -A app.core.celery worker --loglevel=info --pool=solo
```

### Expected Output

When the worker starts successfully, you should see:
```
Windows development environment detected - using 'solo' pool
Worker pool type: solo
Celery app initialized successfully
Broker: redis://localhost:6379/0
Backend: redis://localhost:6379/0
[tasks] Received task: app.tasks.survey_tasks.generate_survey[...]
```

### Troubleshooting Development

**Issue: "PermissionError [WinError 5]"**
- Ensure you're using the `solo` pool (check output for "using 'solo' pool")
- Verify `CELERY_ENV` is not set to `production`
- Restart the worker

**Issue: "Connection refused" or Redis errors**
- Verify Redis is running: `redis-cli ping` should return `PONG`
- Check Redis is accessible at `localhost:6379`
- Update `REDIS_URL` in `backend/.env` if using a different Redis location

**Issue: Worker crashes immediately**
- Check that you're on Windows (not WSL or Linux)
- Verify Python version is 3.8 or higher: `python --version`
- Check for conflicting pool specifications in environment variables

## Production Setup (Windows)

### Prerequisites

- Python 3.8 or higher
- Redis server running (production-grade, e.g., Redis Enterprise or managed service)
- Virtual environment activated
- Gevent library installed

### Installation

1. **Install dependencies (includes gevent for production):**
   ```bash
   pip install -r backend/requirements.txt
   ```

   The `requirements.txt` includes `gevent>=23.0.0` for Windows production support.

2. **Verify Redis is running:**
   ```bash
   # Verify connection to your production Redis instance
   redis-cli -h <redis-host> -p <redis-port> ping
   ```

3. **Set production environment:**
   ```bash
   set CELERY_ENV=production
   ```

4. **Configure Redis URL (if not using localhost):**
   ```bash
   set REDIS_URL=redis://<host>:<port>/<db>
   ```

### Starting the Celery Worker

**Option 1: Automatic pool selection (recommended)**
```bash
cd backend
set CELERY_ENV=production
celery -A app.core.celery worker --loglevel=info
```

The application will automatically detect Windows and production environment, then use the `gevent` pool.

**Option 2: Explicit gevent pool**
```bash
cd backend
celery -A app.core.celery worker --loglevel=info --pool=gevent
```

### Expected Output

When the worker starts successfully, you should see:
```
Windows production environment detected - using 'gevent' pool
Gevent monkey-patching applied successfully
Worker pool type: gevent
Celery app initialized successfully
Broker: redis://<host>:<port>/<db>
Backend: redis://<host>:<port>/<db>
[tasks] Received task: app.tasks.survey_tasks.generate_survey[...]
```

### Production Considerations

**Multiple Workers:**
```bash
# Start multiple gevent workers for better throughput
celery -A app.core.celery worker --loglevel=info --pool=gevent --concurrency=4
```

**Persistent Logging:**
```bash
# Log to file for production monitoring
celery -A app.core.celery worker --loglevel=info --pool=gevent --logfile=celery.log
```

**Background Service (Windows Service):**
Consider using NSSM (Non-Sucking Service Manager) to run Celery as a Windows service:
```bash
nssm install CeleryWorker "C:\path\to\python.exe" -m celery -A app.core.celery worker --pool=gevent
nssm start CeleryWorker
```

### Troubleshooting Production

**Issue: "ImportError: No module named 'gevent'"**
- Gevent is required for production on Windows
- Install it: `pip install gevent>=23.0.0`
- Verify installation: `python -c "import gevent; print(gevent.__version__)"`

**Issue: "PermissionError [WinError 5]"**
- Ensure `CELERY_ENV=production` is set
- Verify gevent pool is being used (check output for "using 'gevent' pool")
- Restart the worker

**Issue: Worker crashes after a few tasks**
- Check system resources (CPU, memory)
- Verify Redis connection is stable
- Check application logs for task-specific errors
- Consider reducing `--concurrency` if system is overloaded

**Issue: Slow task processing**
- Increase concurrency: `--concurrency=8` (adjust based on CPU cores)
- Monitor Redis performance
- Check for long-running tasks blocking the queue

## Linux/Mac Setup (No Changes Required)

### Starting the Celery Worker

On Linux and Mac systems, the application continues to use the `prefork` pool automatically:

```bash
cd backend
celery -A app.core.celery worker --loglevel=info
```

**Expected Output:**
```
Linux platform detected - using 'prefork' pool
Worker pool type: prefork
Celery app initialized successfully
```

No special configuration is needed. The prefork pool provides optimal performance on Unix-like systems.

## Environment Variables Reference

| Variable | Values | Default | Purpose |
|----------|--------|---------|---------|
| `CELERY_ENV` | `development`, `production` | `development` | Determines pool type on Windows |
| `REDIS_URL` | `redis://host:port/db` | `redis://localhost:6379/0` | Redis connection string |
| `CELERY_LOGLEVEL` | `debug`, `info`, `warning`, `error` | `info` | Logging verbosity |

### Setting Environment Variables

**Windows Command Prompt:**
```bash
set CELERY_ENV=production
set REDIS_URL=redis://myredis.example.com:6379/0
```

**Windows PowerShell:**
```powershell
$env:CELERY_ENV = "production"
$env:REDIS_URL = "redis://myredis.example.com:6379/0"
```

**Persistent (Windows):**
Add to `backend/.env` file:
```
CELERY_ENV=production
REDIS_URL=redis://myredis.example.com:6379/0
```

## Common Issues and Solutions

### Issue: Worker Won't Start on Windows

**Symptoms:** Worker crashes immediately with various errors

**Solutions:**
1. Verify you're on Windows (not WSL): `python -c "import platform; print(platform.system())"`
2. Check Python version: `python --version` (should be 3.8+)
3. Verify Redis is running: `redis-cli ping`
4. Check for port conflicts: `netstat -ano | findstr :6379`
5. Try explicit pool: `celery -A app.core.celery worker --pool=solo`

### Issue: "Access Denied" Errors

**Symptoms:** PermissionError [WinError 5] in billiard pool

**Solutions:**
1. Ensure solo or gevent pool is being used (not prefork)
2. Check `CELERY_ENV` setting
3. Verify no conflicting pool specifications in environment
4. Run command prompt as Administrator if needed
5. Restart Redis service

### Issue: Tasks Not Processing

**Symptoms:** Tasks submitted but not executed

**Solutions:**
1. Verify worker is running: Check console output for "Received task"
2. Check Redis connection: `redis-cli ping`
3. Verify task queue is not full: `redis-cli LLEN celery`
4. Check application logs for task errors
5. Verify task function exists in `backend/app/tasks/survey_tasks.py`

### Issue: Worker Crashes After Processing Tasks

**Symptoms:** Worker starts but crashes after a few tasks

**Solutions:**
1. Check system resources (CPU, memory, disk space)
2. Verify Redis connection stability
3. Check for memory leaks in task code
4. Reduce concurrency: `--concurrency=2`
5. Check application logs for specific errors

### Issue: Slow Performance on Windows

**Symptoms:** Tasks take longer than expected

**Solutions:**
1. Use gevent pool for production (better than solo)
2. Increase concurrency: `--concurrency=4` (adjust based on CPU cores)
3. Verify Redis is not bottleneck: Check Redis CPU/memory usage
4. Profile task code for optimization opportunities
5. Consider using Redis persistence for reliability

## Monitoring and Debugging

### Check Worker Status

```bash
# List active workers
celery -A app.core.celery inspect active

# Check worker stats
celery -A app.core.celery inspect stats

# Monitor in real-time
celery -A app.core.celery events
```

### View Task Queue

```bash
# Check pending tasks
redis-cli LLEN celery

# View task details
redis-cli LRANGE celery 0 -1
```

### Enable Debug Logging

```bash
# Start worker with debug logging
celery -A app.core.celery worker --loglevel=debug
```

## Performance Tuning

### Development (Solo Pool)

Solo pool is single-threaded and suitable for development:
- No concurrency configuration needed
- Good for testing and debugging
- Slower than production pools

### Production (Gevent Pool)

Gevent pool is async-based and suitable for production:

```bash
# Recommended for 4-core CPU
celery -A app.core.celery worker --pool=gevent --concurrency=8

# Recommended for 8-core CPU
celery -A app.core.celery worker --pool=gevent --concurrency=16

# Recommended for 16-core CPU
celery -A app.core.celery worker --pool=gevent --concurrency=32
```

**General rule:** Set concurrency to 2-4x the number of CPU cores.

## Additional Resources

- [Celery Documentation](https://docs.celeryproject.io/)
- [Celery Windows Support](https://docs.celeryproject.io/en/stable/platforms/windows.html)
- [Gevent Documentation](https://www.gevent.org/)
- [Redis Documentation](https://redis.io/documentation)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review application logs in `backend/logs/`
3. Check Redis logs for connection issues
4. Consult Celery documentation for advanced configuration

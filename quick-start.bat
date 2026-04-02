@echo off
REM Survey Generator - Quick Start Script for Windows

setlocal enabledelayedexpansion

echo.
echo 🚀 Survey Generator - Quick Start
echo ==================================
echo.

REM Check prerequisites
echo 📋 Checking prerequisites...

python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed
    exit /b 1
)

node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed
    exit /b 1
)

echo ✓ Prerequisites check passed
echo.

REM Setup Backend
echo 🔧 Setting up Backend...
cd backend

if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

echo Installing dependencies...
pip install -q -r requirements.txt

REM Check for .env file
if not exist ".env" (
    echo ⚠️  .env file not found. Creating template...
    (
        echo # Database
        echo DATABASE_URL=sqlite:///./survey_generator.db
        echo.
        echo # Redis
        echo REDIS_URL=redis://localhost:6379/0
        echo.
        echo # API Keys (required^)
        echo OPENAI_API_KEY=your_openai_api_key_here
        echo GOOGLE_API_KEY=your_google_api_key_here
        echo.
        echo # JWT Secret (change in production^!)
        echo SECRET_KEY=your-super-secret-key-change-in-production
        echo.
        echo # Models
        echo GPT3_MODEL=gpt-4o-mini
        echo CHATGPT_MODEL=gpt-4o-mini
        echo GEMINI_MODEL=gemini-2.5-flash
        echo.
        echo # Feature flags
        echo INCLUDE_VIDEO_QUESTIONS=false
    ) > .env
    echo Please update backend\.env with your API keys
)

cd ..

echo ✓ Backend setup complete
echo.

REM Setup Frontend
echo 🎨 Setting up Frontend...
cd frontend

if not exist "node_modules" (
    echo Installing dependencies...
    call npm install -q
)

REM Check for .env.local file
if not exist ".env.local" (
    echo Creating .env.local...
    (
        echo NEXT_PUBLIC_API_URL=http://localhost:8000
    ) > .env.local
)

cd ..

echo ✓ Frontend setup complete
echo.

REM Check Redis
echo 🔍 Checking Redis...
redis-cli ping >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Redis is not running. Please start Redis:
    echo    Docker: docker run -d -p 6379:6379 redis:latest
    echo    Or install Redis for Windows
    echo.
) else (
    echo ✓ Redis is running
)

echo.
echo ==================================
echo ✓ Setup complete!
echo ==================================
echo.
echo 📝 Next steps:
echo.
echo 1. Update API keys in backend\.env
echo    - OPENAI_API_KEY
echo    - GOOGLE_API_KEY
echo.
echo 2. Start services in separate terminals:
echo.
echo    Terminal 1 - Backend:
echo    cd backend
echo    venv\Scripts\activate.bat
echo    uvicorn app.main:app --reload
echo.
echo    Terminal 2 - Celery Worker:
echo    cd backend
echo    venv\Scripts\activate.bat
echo    celery -A app.core.celery worker --loglevel=info
echo.
echo    Terminal 3 - Frontend:
echo    cd frontend
echo    npm run dev
echo.
echo 3. Open http://localhost:3000 in your browser
echo.
echo 📚 For detailed instructions, see SETUP_GUIDE.md
echo.
pause

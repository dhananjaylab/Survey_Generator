#!/bin/bash

# Survey Generator - Quick Start Script
# This script sets up and runs all services

set -e

echo "🚀 Survey Generator - Quick Start"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

if ! command -v redis-cli &> /dev/null; then
    echo -e "${YELLOW}⚠️  Redis CLI not found. Make sure Redis is running on localhost:6379${NC}"
fi

echo -e "${GREEN}✓ Prerequisites check passed${NC}"
echo ""

# Setup Backend
echo "🔧 Setting up Backend..."
cd backend

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
else
    source venv/Scripts/activate
fi

echo "Installing dependencies..."
pip install -q -r requirements.txt

# Check for .env file
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found in backend/. Creating template...${NC}"
    cat > .env << 'EOF'
# Database
DATABASE_URL=sqlite:///./survey_generator.db

# Redis
REDIS_URL=redis://localhost:6379/0

# API Keys (required)
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_API_KEY=your_google_api_key_here

# JWT Secret (change in production!)
SECRET_KEY=your-super-secret-key-change-in-production

# Models
GPT3_MODEL=gpt-4o-mini
CHATGPT_MODEL=gpt-4o-mini
GEMINI_MODEL=gemini-2.5-flash

# Feature flags
INCLUDE_VIDEO_QUESTIONS=false
EOF
    echo -e "${YELLOW}Please update backend/.env with your API keys${NC}"
fi

cd ..

echo -e "${GREEN}✓ Backend setup complete${NC}"
echo ""

# Setup Frontend
echo "🎨 Setting up Frontend..."
cd frontend

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install -q
fi

# Check for .env.local file
if [ ! -f ".env.local" ]; then
    echo "Creating .env.local..."
    cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:8000
EOF
fi

cd ..

echo -e "${GREEN}✓ Frontend setup complete${NC}"
echo ""

# Check Redis
echo "🔍 Checking Redis..."
if redis-cli ping &> /dev/null; then
    echo -e "${GREEN}✓ Redis is running${NC}"
else
    echo -e "${YELLOW}⚠️  Redis is not running. Please start Redis:${NC}"
    echo "   macOS: brew services start redis"
    echo "   Linux: sudo systemctl start redis-server"
    echo "   Docker: docker run -d -p 6379:6379 redis:latest"
    echo ""
fi

echo ""
echo "=================================="
echo -e "${GREEN}✓ Setup complete!${NC}"
echo "=================================="
echo ""
echo "📝 Next steps:"
echo ""
echo "1. Update API keys in backend/.env"
echo "   - OPENAI_API_KEY"
echo "   - GOOGLE_API_KEY"
echo ""
echo "2. Start services in separate terminals:"
echo ""
echo "   Terminal 1 - Backend:"
echo "   cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
echo ""
echo "   Terminal 2 - Celery Worker:"
echo "   cd backend && source venv/bin/activate && celery -A app.core.celery worker --loglevel=info"
echo ""
echo "   Terminal 3 - Frontend:"
echo "   cd frontend && npm run dev"
echo ""
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "📚 For detailed instructions, see SETUP_GUIDE.md"
echo ""

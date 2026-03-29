import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1 import router, files, websockets, auth
from app.models.database import engine, Base

# Configure logging - reduce verbosity
logging.basicConfig(level=logging.WARNING)

# Set specific loggers
logging.getLogger("app").setLevel(logging.INFO)
logging.getLogger("app.tasks").setLevel(logging.INFO)
logging.getLogger("app.services").setLevel(logging.WARNING)

# Silence noisy external loggers
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
logging.getLogger("redis").setLevel(logging.ERROR)
logging.getLogger("kombu").setLevel(logging.ERROR)

logger = logging.getLogger(__name__)

# Initialize DB
logger.info("Initializing NeonDB via SQLAlchemy...")
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Asynchronous Survey Generator API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router.router)
app.include_router(files.router)
app.include_router(websockets.router)
app.include_router(auth.router)

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Survey API is running."}

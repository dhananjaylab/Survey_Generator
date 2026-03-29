import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1 import router, files, websockets
from app.models.database import engine, Base

logging.basicConfig(level=logging.INFO)
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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router.router)
app.include_router(files.router)
app.include_router(websockets.router)

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Survey API is running."}

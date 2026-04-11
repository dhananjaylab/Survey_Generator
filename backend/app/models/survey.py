from sqlalchemy import Column, Integer, String, JSON, DateTime, Text
from sqlalchemy.sql import func
from app.models.database import Base

class SurveyRequestRecord(Base):
    __tablename__ = "survey_requests"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(String, unique=True, index=True)
    status = Column(String, default="PENDING") # PENDING, STARTING, RUNNING, COMPLETED, FAILED
    
    # Input data
    project_name = Column(String, nullable=True)
    company_name = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    use_case = Column(String, nullable=True)
    business_overview = Column(Text, nullable=True)
    research_objectives = Column(Text, nullable=True)
    
    # Generated Metadata
    pages = Column(JSON, nullable=True) # SurveyJS questionnaire
    questionnaire_data = Column(JSON, nullable=True) # Raw questionnaire data
    doc_link = Column(String, nullable=True) # Generated DOCX file link
    # User association
    username = Column(String(255), nullable=True, index=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

from pydantic import BaseModel
from typing import Optional, List, Any

class BusinessOverviewRequest(BaseModel):
    request_id: str
    project_name: str
    company_name: str
    industry: str
    use_case: str

class BusinessOverviewResponse(BaseModel):
    success: int = 1
    request_id: str
    project_name: str
    company_name: str
    business_overview: str
    industry: str
    use_case: str

class ResearchObjectiveRequest(BaseModel):
    request_id: str
    project_name: str
    company_name: str
    business_overview: str
    industry: str
    use_case: str
    
class SurveyGenerationRequest(BaseModel):
    request_id: str
    project_name: str
    company_name: str
    business_overview: str
    research_objectives: str
    industry: str
    use_case: str

class SurveyStatusResponse(BaseModel):
    success: int
    status: str
    request_id: str
    project_name: str
    company_name: str
    research_objectives: str
    business_overview: str
    industry: str
    use_case: str
    pages: Any = ""
    doc_link: str = ""

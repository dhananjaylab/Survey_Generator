from pydantic import BaseModel
from typing import Optional, List, Any

class BusinessOverviewRequest(BaseModel):
    request_id: str
    project_name: str
    company_name: str
    industry: str
    use_case: str
    llm_model: str = "gpt"

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
    llm_model: str = "gpt"
    
class SurveyGenerationRequest(BaseModel):
    request_id: str
    project_name: str
    company_name: str
    business_overview: str
    research_objectives: str
    industry: str
    use_case: str
    llm_model: str = "gpt"

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

class RegenerateSurveyDocRequest(BaseModel):
    request_id: str
    project_name: str
    company_name: str
    survey_title: str
    survey_description: str
    pages: List[Any]  # SurveyJS pages format

class RegenerateSurveyDocResponse(BaseModel):
    success: int
    request_id: str
    doc_link: str
    message: str

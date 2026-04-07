# LLM Selection Flow

## Overview
The system allows users to choose between OpenAI GPT and Google Gemini for survey generation. The selection is made once during project setup and used throughout the entire survey generation process.

## Complete Flow

### 1. Frontend - Project Setup (User Selection)
**File**: `frontend-vite/src/pages/ProjectSetupPage.tsx`

```tsx
<FormField label="AI Provider">
  <Select
    name="llmProvider"
    value={formData.llmProvider}
    onChange={handleChange}
    options={[
      { value: 'gpt', label: 'OpenAI GPT' },
      { value: 'gemini', label: 'Google Gemini' },
    ]}
  />
</FormField>
```

- User selects from dropdown: "OpenAI GPT" or "Google Gemini"
- Value stored as `'gpt'` or `'gemini'` in form state
- Default: `'gpt'`

### 2. Frontend - State Management
**File**: `frontend-vite/src/stores/surveyStore.ts`

```typescript
interface ProjectSetupData {
  projectName: string;
  companyName: string;
  industry: string;
  useCase: string;
  llmProvider: 'gpt' | 'gemini';  // ← Stored here
}
```

- Project data (including `llmProvider`) saved to Zustand store
- Persisted to localStorage for session continuity
- Accessible throughout the app via `useSurveyStore()`

### 3. Frontend - API Requests
**Files**: 
- `frontend-vite/src/pages/ResearchPage.tsx`
- `frontend-vite/src/pages/GeneratePage.tsx`

```typescript
// Business Overview Request
const response = await fetch('/api/v1/surveys/business-overview', {
  method: 'POST',
  body: JSON.stringify({
    company_name: currentProject.companyName,
    llm_model: currentProject.llmProvider || 'gpt',  // ← Sent to backend
    // ... other fields
  })
});

// Survey Generation Request
const response = await fetch('/api/v1/surveys/generate', {
  method: 'POST',
  body: JSON.stringify({
    company_name: currentProject.companyName,
    llm_model: currentProject.llmProvider || 'gpt',  // ← Sent to backend
    // ... other fields
  })
});
```

### 4. Backend - API Endpoints
**File**: `backend/app/api/v1/router.py`

```python
@router.post("/business-overview")
async def get_business_overview(req: BusinessOverviewRequest):
    logger.info("business_overview_requested", llm_model=req.llm_model)
    service = AIService(llm_model=req.llm_model)  # ← Initialize with selected model
    # ...

@router.post("/generate")
def generate_questionnaire(req: SurveyGenerationRequest):
    logger.info("survey_generation_requested", llm_model=req.llm_model)
    # Pass to Celery task
    generate_survey_task.delay(
        request_id=req.request_id,
        data={...},
        llm_model=req.llm_model  # ← Pass to background task
    )
```

### 5. Backend - Request Schemas
**File**: `backend/app/models/schemas.py`

```python
class BusinessOverviewRequest(BaseModel):
    company_name: str
    industry: str
    use_case: str
    llm_model: str = "gpt"  # ← Default fallback

class SurveyGenerationRequest(BaseModel):
    company_name: str
    business_overview: str
    research_objectives: str
    llm_model: str = "gpt"  # ← Default fallback
```

### 6. Backend - Celery Task
**File**: `backend/app/tasks/survey_tasks.py`

```python
@celery_app.task
async def generate_survey_task(request_id: str, data: Dict, llm_model: str = "gpt"):
    logger.info("celery_task_started", llm_model=llm_model)
    await async_generate_survey(request_id, data, llm_model)  # ← Pass through

async def async_generate_survey(request_id: str, data: Dict, llm_model: str = "gpt"):
    logger.info("survey_generation_started", llm_model=llm_model)
    ai_service = AIService(llm_model=llm_model)  # ← Initialize service
    # ... generate survey using selected model
```

### 7. Backend - AI Service
**File**: `backend/app/services/ai_service.py`

```python
class AIService:
    def __init__(self, llm_model: str = "gpt"):
        self.llm_model = llm_model.lower()
        
        if self.llm_model not in ["gpt", "gemini"]:
            logger.warning(f"Unknown model {llm_model}, defaulting to gpt")
            self.llm_model = "gpt"
        
        # Initialize appropriate client
        if self.llm_model == "gpt":
            self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        else:  # gemini
            self.gemini_client = genai.Client(api_key=settings.GOOGLE_API_KEY)
            self.gemini_model_name = settings.GEMINI_MODEL
    
    async def _call_llm(self, messages: List[Dict], ...):
        if self.llm_model == "gpt":
            model_name = settings.CHATGPT_MODEL  # e.g., "gpt-4"
            logger.info(f"LLM_CALL_START: Using {model_name} (OpenAI GPT)")
            response = await self.client.chat.completions.create(...)
            # ...
        else:  # gemini
            model_name = self.gemini_model_name  # e.g., "gemini-1.5-pro"
            logger.info(f"LLM_CALL_START: Using {model_name} (Google Gemini)")
            response = self.gemini_client.models.generate_content(...)
            # ...
```

## Configuration
**File**: `backend/app/core/config.py`

```python
class Settings(BaseSettings):
    # OpenAI Configuration
    OPENAI_API_KEY: str
    CHATGPT_MODEL: str = "gpt-4"  # Specific model version
    
    # Google Gemini Configuration
    GOOGLE_API_KEY: str
    GEMINI_MODEL: str = "gemini-1.5-pro"  # Specific model version
```

## Flow Diagram

```
User Selection (Frontend)
    ↓
[ProjectSetupPage] → Select "Google Gemini" from dropdown
    ↓
[surveyStore] → Store llmProvider: 'gemini'
    ↓
[ResearchPage/GeneratePage] → Include llm_model: 'gemini' in API request
    ↓
[Backend API] → Receive llm_model parameter
    ↓
[Celery Task] → Pass llm_model to async_generate_survey()
    ↓
[AIService.__init__] → Initialize with llm_model='gemini'
    ↓
[AIService._call_llm] → Route to Gemini API
    ↓
[Google Gemini API] → Generate content
    ↓
[Response] → Return generated survey
```

## Key Points

1. **Single Selection**: User chooses once during project setup
2. **Persistent**: Choice stored in localStorage and used for all subsequent operations
3. **Consistent**: Same model used for:
   - Business overview generation
   - Research objectives generation
   - Question generation
   - Choice generation
   - Video question generation
4. **Logged**: Every LLM call logs which model is being used
5. **Fallback**: Defaults to 'gpt' if not specified or invalid

## Example Logs

When using Google Gemini:
```
[11:18:37] survey_generation_started llm_model=gemini
[11:18:38] LLM_CALL_START: Using gemini-1.5-pro (Google Gemini)
[11:18:40] LLM_CALL_COMPLETE: gemini-1.5-pro responded in 2.1s (1234 chars)
```

When using OpenAI GPT:
```
[11:18:37] survey_generation_started llm_model=gpt
[11:18:38] LLM_CALL_START: Using gpt-4 (OpenAI GPT)
[11:18:40] LLM_CALL_COMPLETE: gpt-4 responded in 1.8s (1456 chars)
```

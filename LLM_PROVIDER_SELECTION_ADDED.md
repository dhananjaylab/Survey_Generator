# LLM Provider Selection Feature Added

## Summary
Added the ability for users to select between OpenAI GPT and Google Gemini as their AI provider for survey generation.

## Changes Made

### 1. Frontend - Project Setup Page (`frontend-vite/src/pages/ProjectSetupPage.tsx`)
Added a new dropdown field for selecting the AI provider:

```typescript
<FormField label="AI Provider" error={errors.llmProvider}>
  <Select
    name="llmProvider"
    value={formData.llmProvider}
    onChange={handleChange}
    options={[
      { value: 'gpt', label: 'OpenAI GPT' },
      { value: 'gemini', label: 'Google Gemini' },
    ]}
  />
  <p className="mt-1 text-sm text-gray-500">
    Select the AI model to use for generating your survey
  </p>
</FormField>
```

Default value: `'gpt'` (OpenAI)

### 2. Types Updated (`frontend-vite/src/types/survey.ts`)
Added `llmProvider` to the `ProjectSetupData` interface:

```typescript
export interface ProjectSetupData {
  projectName: string;
  companyName: string;
  industry: string;
  useCase: string;
  llmProvider: 'gpt' | 'gemini';  // NEW
}
```

### 3. Research Page (`frontend-vite/src/pages/ResearchPage.tsx`)
Updated to use the selected provider instead of hardcoded `'gpt-4o'`:

```typescript
// Before
llm_model: 'gpt-4o', // default model

// After
llm_model: currentProject.llmProvider || 'gpt', // Use selected provider
```

### 4. Generate Page (`frontend-vite/src/pages/GeneratePage.tsx`)
Updated to use the selected provider:

```typescript
// Before
llm_model: 'gpt-4o'

// After
llm_model: currentProject.llmProvider || 'gpt' // Use selected provider
```

## Backend Support

The backend already supports both providers in `backend/app/services/ai_service.py`:

```python
def __init__(self, llm_model: str = "gpt"):
    """Initialize AI service with chosen model.
    
    Args:
        llm_model: Either 'gpt' (OpenAI) or 'gemini' (Google Gemini)
    """
    self.llm_model = llm_model.lower()
    if self.llm_model not in ["gpt", "gemini"]:
        logger.warning(f"Unknown model {llm_model}, defaulting to gpt")
        self.llm_model = "gpt"
```

## Valid Values

The `llm_model` parameter accepts:
- `"gpt"` - Uses OpenAI GPT (configured via `OPENAI_API_KEY` and `CHATGPT_MODEL` in settings)
- `"gemini"` - Uses Google Gemini (configured via `GOOGLE_API_KEY` and `GEMINI_MODEL` in settings)

Any other value will default to `"gpt"` with a warning in the logs.

## Previous Issue

The frontend was sending `llm_model: "gpt-4o"` which the backend didn't recognize, causing it to default to `"gpt"` with the warning:
```
Unknown model gpt-4o, defaulting to gpt
```

## Current Behavior

1. User selects AI provider on the Project Setup page
2. Selection is stored in the project data
3. When generating business overview or survey, the selected provider is used
4. Backend receives either `"gpt"` or `"gemini"` and uses the appropriate API

## Testing

To test:
1. Go to Project Setup page
2. Select "Google Gemini" from the AI Provider dropdown
3. Complete the form and continue
4. Generate business overview or survey
5. Check Celery logs - should see no "Unknown model" warning
6. Verify the correct API is being called (OpenAI vs Google)

## Configuration Required

Make sure these environment variables are set in `backend/app/.env`:

```env
# OpenAI
OPENAI_API_KEY=your_openai_key
CHATGPT_MODEL=gpt-4o

# Google Gemini
GOOGLE_API_KEY=your_google_key
GEMINI_MODEL=gemini-1.5-pro
```

## Files Modified

1. `frontend-vite/src/pages/ProjectSetupPage.tsx` - Added LLM provider dropdown
2. `frontend-vite/src/types/survey.ts` - Added llmProvider to ProjectSetupData
3. `frontend-vite/src/pages/ResearchPage.tsx` - Use selected provider
4. `frontend-vite/src/pages/GeneratePage.tsx` - Use selected provider

## Status

✅ LLM provider selection UI added
✅ Types updated
✅ All API calls updated to use selected provider
✅ Backend already supports both providers
✅ Default value set to 'gpt' (OpenAI)

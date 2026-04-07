# Industry Selection & AI Use Case Generation

## Summary
Enhanced the Project Setup page with more industry options and added an AI-powered button to automatically generate descriptive use cases based on project details.

## Changes Made

### 1. Expanded Industry List (22 Industries)

Added comprehensive industry options to the dropdown:

**New Industries Added:**
- Manufacturing
- Hospitality & Tourism
- Real Estate
- Automotive
- Telecommunications
- Media & Entertainment
- Energy & Utilities
- Transportation & Logistics
- Agriculture
- Construction
- Pharmaceutical
- Insurance
- Legal Services
- Consulting
- Non-Profit
- Government

**Original Industries:**
- Technology
- Healthcare
- Finance & Banking
- Education
- Retail & E-commerce
- Other

### 2. AI-Powered Use Case Generator

Added a new button "✨ Generate Use Case with AI" that:
- Uses AI to create a descriptive use case based on:
  - Project Name
  - Company Name
  - Industry
  - Existing use case text (if any)
- Generates 2-3 sentence professional descriptions
- Can enhance existing use case text
- Disabled until Project Name and Company Name are filled

### 3. Backend API Endpoint

Created new endpoint: `POST /api/v1/surveys/generate-use-case`

**Request Body:**
```json
{
  "project_name": "Employee Satisfaction 2024",
  "company_name": "Acme Corp",
  "industry": "technology",
  "existing_use_case": "Optional existing text to enhance"
}
```

**Response:**
```json
{
  "success": 1,
  "use_case": "This survey aims to measure employee satisfaction and engagement levels across all departments at Acme Corp. The target audience includes all full-time and part-time employees. Expected outcomes include identifying areas for improvement in workplace culture, benefits, and management practices to enhance overall employee retention and productivity."
}
```

**Features:**
- Uses OpenAI GPT for quick generation
- Temperature: 0.7 for creative but focused output
- Max tokens: 200 for concise descriptions
- Rate limited: 20 requests/minute
- JWT authentication required

### 4. Frontend UI Enhancements

**Use Case Field Layout:**
```
┌─────────────────────────────────────────┐
│ Use Case                                │
├─────────────────────────────────────────┤
│ [Textarea - 4 rows]                     │
│                                         │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│ [✨ Generate Use Case with AI] Button   │
├─────────────────────────────────────────┤
│ Please fill in Project Name and        │
│ Company Name first (if not filled)      │
└─────────────────────────────────────────┘
```

**Button States:**
- Enabled: When Project Name and Company Name are filled
- Disabled: When required fields are empty
- Loading: Shows "Generating..." during API call

### 5. User Experience Flow

1. User fills in Project Name and Company Name
2. User selects Industry from expanded dropdown
3. User can either:
   - Write their own use case manually
   - Click "Generate Use Case with AI" button
   - Write partial text and click button to enhance it
4. AI generates contextual use case description
5. User can edit the generated text if needed
6. Continue to next step

## Example Generated Use Cases

**Technology - Employee Survey:**
"This survey aims to measure employee satisfaction and engagement levels across all departments at Acme Corp. The target audience includes all full-time and part-time employees. Expected outcomes include identifying areas for improvement in workplace culture, benefits, and management practices."

**Healthcare - Patient Feedback:**
"This survey seeks to gather patient feedback on the quality of care and services provided at City Hospital. The target audience includes recent patients and their families. Expected insights include understanding patient satisfaction levels, identifying service gaps, and improving overall patient experience."

**Retail - Customer Experience:**
"This survey aims to understand customer shopping experiences and preferences at RetailCo stores. The target audience includes recent in-store and online shoppers. Expected outcomes include insights into product selection, pricing perception, and service quality to enhance customer loyalty."

## Technical Implementation

### Frontend (`frontend-vite/src/pages/ProjectSetupPage.tsx`)
- Added `isGeneratingUseCase` state
- Created `generateUseCase` async function
- Token retrieval from both storage locations
- Error handling with user notifications
- Button disabled state management

### Backend (`backend/app/api/v1/router.py`)
- New endpoint with rate limiting
- JWT authentication required
- Uses AIService with GPT model
- Structured prompt engineering
- Error handling and logging

### AI Prompt Structure
```
Generate a concise and descriptive use case for a survey project with the following details:

Project Name: {project_name}
Company Name: {company_name}
Industry: {industry}
Existing Use Case (enhance this): {existing_use_case}

Generate a 2-3 sentence use case description that explains:
1. What the survey aims to achieve
2. Who the target audience is
3. What insights or outcomes are expected

Keep it professional and specific to the industry.
```

## Files Modified

1. `frontend-vite/src/pages/ProjectSetupPage.tsx`
   - Expanded industry dropdown (6 → 22 options)
   - Added AI generate button
   - Added generateUseCase function
   - Added loading state

2. `backend/app/api/v1/router.py`
   - Added `/generate-use-case` endpoint
   - Prompt engineering for use case generation
   - Rate limiting and authentication

## Benefits

1. **Time Saving**: Users don't need to write use cases from scratch
2. **Consistency**: AI generates professional, well-structured descriptions
3. **Industry-Specific**: More industry options for better targeting
4. **Flexibility**: Can enhance existing text or generate from scratch
5. **User-Friendly**: Simple button click with clear feedback

## Testing

To test the feature:

1. Navigate to Project Setup page
2. Fill in "Project Name" and "Company Name"
3. Select an industry from the expanded dropdown
4. Click "✨ Generate Use Case with AI"
5. Wait for AI to generate the description
6. Edit if needed and continue

## Status

✅ 22 industries added to dropdown
✅ AI use case generation button added
✅ Backend endpoint implemented
✅ Token authentication integrated
✅ Error handling and notifications
✅ Loading states and disabled states
✅ Rate limiting applied

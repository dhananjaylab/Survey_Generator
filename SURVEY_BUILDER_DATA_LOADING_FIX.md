# Survey Builder Data Loading Fix

## Problem
After survey generation completes successfully (25 questions generated), the "Draft Survey" builder page was empty. The generated survey data wasn't being loaded into the builder.

## Root Cause
The `GeneratePage` component was navigating to the builder without fetching and storing the generated survey data. The flow was:
1. ✅ Survey generated successfully (backend)
2. ✅ "Continue to Survey Builder" button shown
3. ❌ User clicks button → navigates to `/builder`
4. ❌ Builder page loads with empty `currentSurvey` state

## Solution Implemented

### 1. Fetch Survey Data After Generation
Added `fetchGeneratedSurvey()` function that:
- Calls `/api/v1/surveys/status/{requestId}` endpoint
- Retrieves the generated survey pages and questions
- Converts backend format to frontend Survey format
- Stores in Zustand store via `setCurrentSurvey()`

### 2. Data Mapping Functions

**mapQuestionType()** - Converts backend question types to frontend types:
```typescript
'radiogroup' | 'checkbox' → 'multiple-choice'
'comment' → 'text'
'matrix' → 'matrix'
'videofeedback' → 'video'
```

**stripHtmlTags()** - Removes HTML tags from question titles:
```typescript
'<p>What is your name?</p>' → 'What is your name?'
```

**mapChoices()** - Converts backend choices to frontend Choice format:
```typescript
{
  value: 'opt1',
  text: '<p>Option 1</p>'
}
→
{
  id: 'choice-0',
  text: 'Option 1',
  value: 'opt1'
}
```

### 3. Polling Fallback
Added automatic polling (every 3 seconds) as a fallback if WebSocket is not connected:
- Polls `/api/v1/surveys/status/{requestId}`
- Checks for 'COMPLETED' or 'FAILED' status
- Automatically fetches survey data when complete
- Stops polling after completion or failure

### 4. User Notifications
Added notifications for:
- ✅ Survey generation complete
- ✅ Survey data loaded (with question count)
- ❌ Failed to load survey data

## Data Flow

### Before Fix:
```
Backend: Survey Generated (25 questions)
    ↓
Frontend: Shows "Continue to Survey Builder" button
    ↓
User clicks button
    ↓
Navigate to /builder
    ↓
Builder shows empty canvas ❌
```

### After Fix:
```
Backend: Survey Generated (25 questions)
    ↓
Frontend: Detects completion (WebSocket or Polling)
    ↓
Automatically calls fetchGeneratedSurvey()
    ↓
Fetches survey data from /api/v1/surveys/status/{requestId}
    ↓
Maps backend format → frontend format
    ↓
Stores in surveyStore.currentSurvey
    ↓
Shows "Continue to Survey Builder" button
    ↓
User clicks button
    ↓
Navigate to /builder
    ↓
Builder displays all 25 questions ✅
```

## Backend Survey Data Format

The backend returns survey data in SurveyJS format:

```json
{
  "success": 1,
  "status": "COMPLETED",
  "request_id": "req-1775574936015",
  "pages": [
    {
      "name": "page1",
      "elements": [
        {
          "type": "radiogroup",
          "name": "question1",
          "title": "<p>What is your age group?</p>",
          "surveyQID": "uuid-123",
          "choices": [
            { "value": "18-25", "text": "<p>18-25</p>" },
            { "value": "26-35", "text": "<p>26-35</p>" }
          ]
        },
        {
          "type": "comment",
          "name": "question2",
          "title": "<p>Please provide feedback</p>",
          "surveyQID": "uuid-456"
        },
        {
          "type": "matrix",
          "name": "question3",
          "title": "<p>Rate the following</p>",
          "surveyQID": "uuid-789",
          "rows": [
            { "value": "item1", "text": "<p>Item 1</p>" }
          ],
          "columns": [
            { "value": "poor", "text": "<p>Poor</p>" },
            { "value": "good", "text": "<p>Good</p>" }
          ]
        }
      ]
    }
  ],
  "doc_link": "https://..."
}
```

## Frontend Survey Format

After mapping, the data is stored as:

```typescript
{
  id: "req-1775574936015",
  title: "health camp",
  description: "Survey Description",
  pages: [
    {
      id: "page1",
      name: "page1",
      title: "Page",
      questions: [
        {
          id: "uuid-123",
          type: "multiple-choice",
          title: "What is your age group?",
          description: "",
          required: false,
          choices: [
            { id: "choice-0", text: "18-25", value: "18-25" },
            { id: "choice-1", text: "26-35", value: "26-35" }
          ]
        },
        {
          id: "uuid-456",
          type: "text",
          title: "Please provide feedback",
          description: "",
          required: false,
          choices: []
        }
      ]
    }
  ],
  settings: {
    showProgressBar: true,
    showQuestionNumbers: true,
    allowBack: true,
    completeText: "Submit Survey"
  }
}
```

## Files Modified

1. **frontend-vite/src/pages/GeneratePage.tsx**
   - Added `fetchGeneratedSurvey()` function
   - Added `mapQuestionType()` helper
   - Added `stripHtmlTags()` helper
   - Added `mapChoices()` helper
   - Added polling fallback for status checking
   - Imported `Survey` and `Choice` types
   - Added `setCurrentSurvey` from store

## Testing

To verify the fix:

1. Complete the survey generation flow
2. Wait for "SUCCESS" message in the generation log
3. Check browser console for "Survey Loaded" notification
4. Click "Continue to Survey Builder"
5. Verify all 25 questions are displayed in the builder
6. Check that question types are correct (multiple-choice, text, matrix)
7. Verify choices are displayed for multiple-choice questions

## Expected Results

- ✅ Survey data automatically loaded after generation
- ✅ All 25 questions visible in builder
- ✅ Question titles without HTML tags
- ✅ Choices properly formatted
- ✅ Works with both WebSocket and polling
- ✅ User notifications for success/failure

## Status

✅ Survey data fetching implemented
✅ Data mapping functions added
✅ Polling fallback added
✅ User notifications added
✅ HTML tag stripping implemented
✅ Choice mapping implemented

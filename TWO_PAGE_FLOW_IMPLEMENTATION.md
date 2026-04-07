# Two-Page Flow Implementation

## Summary
Merged Project Setup and Research pages into a single "Create Survey" page with a multi-step wizard interface. The application now has a clean 2-page flow: Create → Edit.

## New User Flow

### Before (4 pages)
1. **Project Setup** - Enter project details
2. **Research** - Generate/edit business overview
3. **Generate** - Watch progress (removed earlier)
4. **Builder** - Edit generated survey

### After (2 pages)
1. **Create Survey** (`/create`) - All-in-one survey generation
   - Step 1: Project details (name, company, industry, use case, AI provider)
   - Step 2: Business overview (generate or write manually)
   - Step 3: Generation progress (inline, real-time)
2. **Builder** (`/builder`) - Edit generated survey

## Changes Made

### New Files
- `frontend-vite/src/pages/CreateSurveyPage.tsx` - Unified survey creation page with 3-step wizard

### Removed Files
- `frontend-vite/src/pages/ProjectSetupPage.tsx` - Merged into CreateSurveyPage
- `frontend-vite/src/pages/ResearchPage.tsx` - Merged into CreateSurveyPage
- `frontend-vite/src/pages/GeneratePage.tsx` - Removed earlier (merged into ResearchPage)

### Modified Files

#### `frontend-vite/src/App.tsx`
- Removed `/project-setup` and `/research` routes
- Added single `/create` route for CreateSurveyPage
- Updated lazy imports

#### `frontend-vite/src/pages/HomePage.tsx`
- Changed "Create New Survey" button link from `/project-setup` to `/create`

#### `frontend-vite/src/pages/index.ts`
- Removed ProjectSetupPage and ResearchPage exports
- Added CreateSurveyPage export

#### `frontend-vite/src/components/__tests__/App.test.tsx`
- Updated mocks to reflect new page structure

## CreateSurveyPage Features

### Step 1: Project Details
- Project Name (required)
- Company Name (required)
- Industry (dropdown with 22 options)
- Use Case (textarea with AI generation option)
- AI Provider (GPT or Gemini)
- "Generate Use Case with AI" button
- Validation before proceeding

### Step 2: Business Overview
- Shows project summary at top
- Large textarea for business overview
- "Generate Automatically via AI" button
- Can edit generated overview
- Back button to return to Step 1
- "Generate Survey" button to proceed

### Step 3: Generation Progress
- Terminal-style progress log
- Real-time updates via WebSocket
- Polling fallback if WebSocket unavailable
- Spinner indicator while processing
- "Continue to Survey Editor" button when complete

## State Management

### Multi-Step Navigation
```typescript
const [step, setStep] = React.useState<'setup' | 'overview' | 'generating'>('setup');
```

- `setup` - Project details form
- `overview` - Business overview editor
- `generating` - Progress display

### Form State
All form data maintained in single component:
- Project details (name, company, industry, use case, AI provider)
- Business overview
- Generation progress logs
- Request ID for WebSocket

### Persistence
- Project data saved to surveyStore on step transition
- Business overview saved before generation
- Survey data loaded automatically on completion

## User Experience Improvements

1. **Fewer page transitions**: Everything in one place
2. **Clear progress**: Step indicators show where user is
3. **Context preservation**: Can see project details while editing overview
4. **Flexible navigation**: Back button to edit previous steps
5. **Inline generation**: No separate page for watching progress
6. **Automatic flow**: Seamlessly moves from setup → overview → generation

## Technical Details

### WebSocket Integration
- Connects when generation starts
- Real-time progress updates
- Automatic cleanup on unmount

### Polling Fallback
- Activates if WebSocket unavailable
- Polls every 3 seconds
- Checks for COMPLETED or FAILED status

### Error Handling
- Validation errors shown inline
- API errors displayed as notifications
- Generation failures logged in progress terminal

### Navigation Guards
- Validates form before allowing step progression
- Requires business overview before generation
- Prevents navigation during generation

## Benefits

1. **Simplified UX**: 2 pages instead of 4
2. **Faster workflow**: Fewer clicks and page loads
3. **Better context**: All related information in one place
4. **Cleaner codebase**: Less duplication, single source of truth
5. **Easier maintenance**: One component instead of three

## Testing Recommendations

1. Test complete flow: Home → Create (all steps) → Builder
2. Verify step navigation (forward and back)
3. Test form validation at each step
4. Verify AI generation features (use case, business overview)
5. Test WebSocket connection and real-time updates
6. Verify polling fallback works
7. Test error scenarios at each step
8. Verify survey data loads correctly after generation
9. Check navigation to Builder page
10. Test with both GPT and Gemini providers

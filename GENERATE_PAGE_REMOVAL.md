# Generate Page Removal - Streamlined UX

## Summary
Removed the separate "Generate" page and merged its functionality directly into the Research page for a more streamlined user experience.

## Changes Made

### Removed Files
- `frontend-vite/src/pages/GeneratePage.tsx` - Deleted (functionality merged into ResearchPage)

### Modified Files

#### `frontend-vite/src/pages/ResearchPage.tsx`
- Merged all survey generation logic from GeneratePage
- Added WebSocket integration for real-time progress updates
- Added progress log display with terminal-style UI
- Added survey data fetching and mapping logic
- Changed button from "Continue to Survey Generation" to "Generate Survey"
- Progress section appears inline after clicking "Generate Survey"
- Automatically navigates to Builder page when generation completes

#### `frontend-vite/src/App.tsx`
- Removed `/generate` route
- Removed GeneratePage import

#### `frontend-vite/src/pages/index.ts`
- Removed GeneratePage export

#### `frontend-vite/src/components/__tests__/App.test.tsx`
- Removed GeneratePage mock

## New User Flow

### Before (4 steps)
1. Project Setup → Enter project details
2. Research → Generate/edit business overview → Click "Continue to Survey Generation"
3. **Generate → Click "Start Survey Generation" → Watch progress**
4. Builder → Edit survey

### After (3 steps)
1. Project Setup → Enter project details
2. Research → Generate/edit business overview → Click "Generate Survey" → Watch progress inline
3. Builder → Edit survey

## Benefits

1. **Fewer clicks**: Removed one unnecessary confirmation step
2. **Better context**: Users see the business overview while generation happens
3. **Cleaner flow**: No context switching between pages
4. **Same functionality**: All features preserved (WebSocket, polling fallback, progress logs)

## Technical Details

### Progress Display
- Shows inline in Research page after clicking "Generate Survey"
- Terminal-style log display with timestamps
- Real-time updates via WebSocket
- Polling fallback if WebSocket unavailable
- Spinner indicator while processing

### State Management
- Uses existing `isGenerating` state from surveyStore
- Progress logs stored in local component state
- Survey data automatically loaded on completion
- Seamless transition to Builder page

### Error Handling
- All error handling preserved
- Notifications for success/failure
- Ability to retry if generation fails

## Testing Recommendations

1. Test the complete flow: Project Setup → Research → Generate → Builder
2. Verify WebSocket connection and real-time updates
3. Test polling fallback when WebSocket unavailable
4. Verify error handling and retry scenarios
5. Check that survey data loads correctly after generation
6. Ensure navigation to Builder works properly

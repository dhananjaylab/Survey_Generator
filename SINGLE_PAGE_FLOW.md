# Single-Page Survey Creation Flow

## Summary
Consolidated all survey creation steps into a single, clean page with a collapsible Business Overview section to avoid clutter while maintaining all functionality.

## New User Flow

### Before (Multi-step wizard)
- Step 1: Project details
- Step 2: Business overview (separate view)
- Step 3: Generation progress

### After (Single page)
- **One page** with all fields visible
- Business Overview section is **collapsible** (hidden by default)
- Generation progress replaces the form when started

## Key Features

### Main Form (Always Visible)
1. Project Name
2. Company Name
3. Industry (dropdown)
4. AI Provider (GPT/Gemini)
5. Use Case (with AI generation button)

### Business Overview (Collapsible)
- Hidden by default with "Show Overview" button
- Optional field - not required for generation
- Can be generated with AI or manually entered
- Smaller textarea (h-48 instead of h-64) to save space

### Benefits

1. **No clutter**: Business overview hidden until needed
2. **Faster workflow**: No page transitions
3. **Clear hierarchy**: Main fields prominent, optional fields tucked away
4. **Flexible**: Users can expand overview if they want more control
5. **Smart defaults**: Works great without business overview

## UI Layout

```
┌─────────────────────────────────────────┐
│ Create New Survey                       │
│ Fill in the details below...            │
├─────────────────────────────────────────┤
│                                         │
│ Project Name: [____________]            │
│ Company Name: [____________]            │
│                                         │
│ Industry: [▼]    AI Provider: [▼]      │
│                                         │
│ Use Case:                               │
│ [_____________________________]         │
│ [_____________________________]         │
│ [✨ Generate Use Case with AI]          │
│                                         │
├─────────────────────────────────────────┤
│ Business Overview              [Show ▼] │
│ Optional: Provide additional context    │
│                                         │
│ (Collapsed by default)                  │
├─────────────────────────────────────────┤
│                    [Cancel] [Generate]  │
└─────────────────────────────────────────┘
```

When "Show Overview" is clicked:

```
├─────────────────────────────────────────┤
│ Business Overview              [Hide ▲] │
│ Optional: Provide additional context    │
│                                         │
│         [Generate Automatically via AI] │
│ [_____________________________]         │
│ [_____________________________]         │
│ [_____________________________]         │
├─────────────────────────────────────────┤
```

## Technical Implementation

### State Management
```typescript
const [showOverview, setShowOverview] = React.useState(false);
```

### Collapsible Section
- Toggle button shows/hides the overview section
- Button text changes: "Show Overview" ↔ "Hide Overview"
- Section smoothly appears/disappears
- State preserved when toggling

### Validation
- Business overview is **optional**
- Form validates required fields only
- Can generate survey without business overview
- If overview is provided, it's used for better context

## User Experience

### Default Flow (Minimal)
1. Fill in project name, company, industry
2. Optionally generate/write use case
3. Click "Generate Survey"
4. Watch progress, then edit

### Advanced Flow (With Overview)
1. Fill in basic fields
2. Click "Show Overview"
3. Generate or write business overview
4. Click "Generate Survey"
5. Watch progress, then edit

## Code Changes

### Removed
- Multi-step wizard logic
- Step state management
- Step navigation buttons
- Step indicators

### Added
- Collapsible section for business overview
- Toggle button with show/hide states
- Cleaner single-form layout
- Grid layout for industry/AI provider (side by side)

### Preserved
- All validation logic
- AI generation features
- WebSocket progress tracking
- Error handling
- Form state management

## Benefits Summary

1. **Cleaner UI**: No unnecessary steps or navigation
2. **Faster**: One form submission instead of multiple clicks
3. **Flexible**: Advanced users can expand for more control
4. **Focused**: Main fields get attention, optional fields don't clutter
5. **Progressive disclosure**: Show complexity only when needed
6. **Better UX**: Follows modern design patterns (collapsible sections)

## Testing Recommendations

1. Test form submission with overview hidden
2. Test form submission with overview shown
3. Verify toggle button works correctly
4. Test AI generation for both use case and overview
5. Verify validation works with optional overview
6. Test generation progress display
7. Check responsive layout on mobile
8. Verify all fields are properly disabled during generation

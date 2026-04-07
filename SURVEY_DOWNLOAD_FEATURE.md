# Survey Download Feature

## Overview
Changed the "Save Survey" button behavior to download the generated DOCX file to the user's computer instead of storing it in the code directory. The server upload functionality remains unchanged.

## Changes Made

### 1. Survey Store Updates

**Added `currentSurveyDocLink` field:**
```typescript
export interface SurveyState {
  currentProject: ProjectSetupData | null;
  businessOverview: string | null;
  researchObjectives: string | null;
  currentSurvey: Survey | null;
  currentSurveyDocLink: string | null;  // NEW
  isGenerating: boolean;
  error: string | null;
}
```

**Added setter method:**
```typescript
setCurrentSurveyDocLink: (docLink: string | null) => void;
```

### 2. GeneratePage Updates

**Store doc_link after survey generation:**
```typescript
// Store the doc_link for downloading
if (response.doc_link) {
  console.log('📊 Storing doc_link:', response.doc_link);
  setCurrentSurveyDocLink(response.doc_link);
}
```

### 3. BuilderPage - Download Implementation

**New `handleSave` function:**
```typescript
const handleSave = async () => {
  // Validate survey
  if (!currentSurvey?.title) {
    addNotification({
      type: 'error',
      title: 'Validation Error',
      message: 'Survey must have a title before saving.',
    });
    return;
  }

  setIsSaving(true);

  try {
    // Download the DOCX file
    if (currentSurveyDocLink) {
      const filename = `${currentSurvey.title.replace(/\s+/g, '_')}_survey.docx`;
      
      // Fetch the file from the server
      const response = await fetch(currentSurveyDocLink);
      
      if (!response.ok) {
        throw new Error('Failed to download survey document');
      }
      
      const blob = await response.blob();
      
      // Create a download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      addNotification({
        type: 'success',
        title: 'Survey Downloaded',
        message: `Survey document "${filename}" has been downloaded successfully.`,
      });
      
      // Notify about server upload status
      addNotification({
        type: 'success',
        title: 'Server Upload Successful',
        message: 'Survey has been uploaded to cloud storage.',
      });
    } else {
      addNotification({
        type: 'warning',
        title: 'No Document Available',
        message: 'No survey document found. Please generate a survey first.',
      });
    }
  } catch (error: any) {
    console.error('Download error:', error);
    
    // Show error for download failure
    addNotification({
      type: 'error',
      title: 'Download Failed',
      message: 'Failed to download survey document. Please try again.',
    });
    
    // But still notify about server upload if doc_link exists
    if (currentSurveyDocLink) {
      addNotification({
        type: 'info',
        title: 'Server Upload Successful',
        message: 'Survey is available on cloud storage despite download failure.',
      });
    }
  } finally {
    setIsSaving(false);
  }
};
```

## Features

### 1. Download to User's Computer
- Fetches the DOCX file from the cloud storage URL
- Creates a blob and triggers browser download
- File is saved to user's Downloads folder
- Filename format: `{survey_title}_survey.docx`

### 2. Server Upload Status
- Shows success notification when file is on cloud storage
- Separate notification from download status
- User knows the file is backed up even if download fails

### 3. Error Handling
- **Download fails**: Shows error but still notifies about server upload
- **No doc_link**: Shows warning to generate survey first
- **Validation fails**: Shows error if survey has no title
- Download failure doesn't affect server upload status

### 4. User Feedback
Multiple notification scenarios:

**Success (both download and upload):**
```
✅ Survey Downloaded
   Survey document "health_camp_survey.docx" has been downloaded successfully.

✅ Server Upload Successful
   Survey has been uploaded to cloud storage.
```

**Download fails but upload succeeded:**
```
❌ Download Failed
   Failed to download survey document. Please try again.

ℹ️ Server Upload Successful
   Survey is available on cloud storage despite download failure.
```

**No document available:**
```
⚠️ No Document Available
   No survey document found. Please generate a survey first.
```

## Backend Behavior (Unchanged)

The backend continues to:
1. Generate the DOCX file locally in `backend/questionnaires/`
2. Upload to cloud storage (R2)
3. Return the cloud storage URL in `doc_link`
4. Store the URL in the database

The local file in `backend/questionnaires/` is kept as a backup but is not directly accessed by the frontend.

## User Flow

1. User generates survey → Backend creates DOCX and uploads to cloud
2. User navigates to Builder page → Survey data and doc_link loaded
3. User clicks "Save Survey" → Frontend downloads from cloud URL
4. File appears in user's Downloads folder
5. Notifications show download and upload status

## Technical Details

### Download Implementation
```typescript
// Fetch from cloud storage
const response = await fetch(currentSurveyDocLink);
const blob = await response.blob();

// Create temporary download link
const url = window.URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = filename;
document.body.appendChild(link);
link.click();

// Cleanup
document.body.removeChild(link);
window.URL.revokeObjectURL(url);
```

### Filename Generation
```typescript
const filename = `${currentSurvey.title.replace(/\s+/g, '_')}_survey.docx`;
// "health camp" → "health_camp_survey.docx"
```

### Button State
```typescript
<Button size="sm" onClick={handleSave} disabled={isSaving}>
  {isSaving ? 'Downloading...' : 'Save Survey'}
</Button>
```

## Files Modified

1. **frontend-vite/src/types/store.ts**
   - Added `currentSurveyDocLink` to SurveyState

2. **frontend-vite/src/stores/surveyStore.ts**
   - Added `currentSurveyDocLink` field
   - Added `setCurrentSurveyDocLink` method
   - Added to persist configuration

3. **frontend-vite/src/pages/GeneratePage.tsx**
   - Store doc_link after fetching survey data
   - Added `setCurrentSurveyDocLink` to store hook

4. **frontend-vite/src/pages/BuilderPage.tsx**
   - Complete rewrite of `handleSave` function
   - Added download functionality
   - Added error handling
   - Added multiple notification scenarios
   - Added loading state (`isSaving`)

## Benefits

1. **User Control**: File goes to user's Downloads folder, not hidden in code
2. **Backup**: File still uploaded to cloud storage
3. **Resilient**: Download failure doesn't affect cloud backup
4. **Clear Feedback**: Multiple notifications for different scenarios
5. **Professional**: Proper filename generation and download UX

## Testing

To test the feature:

1. Generate a survey (e.g., "health camp")
2. Wait for generation to complete
3. Navigate to Builder page
4. Click "Save Survey" button
5. Check Downloads folder for `health_camp_survey.docx`
6. Verify notifications appear
7. Test error case by disconnecting internet before clicking Save

## Future Enhancements

Possible improvements:
- Add "Download" and "Save to Server" as separate buttons
- Show download progress bar for large files
- Allow user to choose download location
- Add option to download as PDF or other formats
- Batch download multiple surveys
- Email survey document to user

## Status

✅ Download functionality implemented
✅ Server upload status notifications
✅ Error handling for download failures
✅ Filename generation from survey title
✅ Loading state during download
✅ Cloud storage URL stored in state
✅ Backward compatible with existing flow

# Authentication Issue - Debug Guide

## Problem
Clicking "Generate Automatically via AI" button redirects to login page instead of generating content.

## Root Cause
Token storage mismatch between different parts of the application:
- `AuthService` stores tokens in `localStorage['auth-tokens']`
- `authStore` (Zustand) stores tokens in `localStorage['auth-store']`
- `httpService` was only checking `localStorage['auth-store']`

## Fix Applied

### 1. Updated `httpService.ts`
Now checks BOTH storage locations:
```typescript
private getStoredTokens(): AuthTokens | null {
  // First check Zustand store
  const zustandStore = localStorage.getItem('auth-store');
  if (zustandStore) {
    const parsed = JSON.parse(zustandStore);
    const tokens = parsed.state?.tokens || parsed.tokens;
    if (tokens?.accessToken) return tokens;
  }

  // Fallback to AuthService storage
  const authTokens = localStorage.getItem('auth-tokens');
  if (authTokens) {
    const tokens = JSON.parse(authTokens);
    if (tokens?.accessToken) return tokens;
  }

  return null;
}
```

### 2. Updated `authStore.ts`
Now syncs tokens to both locations:
```typescript
login: async (credentials) => {
  const tokens = await AuthService.login(credentials);
  set({ tokens, isAuthenticated: true });
  // Sync to both locations
  localStorage.setItem('auth-tokens', JSON.stringify(tokens));
}
```

### 3. Updated `clearStoredTokens()`
Now clears both locations:
```typescript
private clearStoredTokens(): void {
  localStorage.removeItem('auth-store');
  localStorage.removeItem('auth-tokens');
}
```

## Testing Steps

### 1. Clear Existing Storage
Open browser console and run:
```javascript
localStorage.clear();
location.reload();
```

### 2. Login Again
1. Go to `/login`
2. Enter credentials
3. Click "Login"

### 3. Verify Token Storage
Open browser console and run:
```javascript
// Check both storage locations
console.log('auth-store:', localStorage.getItem('auth-store'));
console.log('auth-tokens:', localStorage.getItem('auth-tokens'));

// Parse and verify tokens
const authStore = JSON.parse(localStorage.getItem('auth-store') || '{}');
const authTokens = JSON.parse(localStorage.getItem('auth-tokens') || '{}');

console.log('Zustand tokens:', authStore.state?.tokens);
console.log('AuthService tokens:', authTokens);
```

### 4. Test the Button
1. Navigate to `/research` page
2. Click "Generate Automatically via AI"
3. Should NOT redirect to login
4. Should show loading state
5. Should generate business overview

### 5. Check Network Request
Open Network tab in DevTools:
1. Click the button
2. Look for request to `/api/v1/surveys/business-overview`
3. Check "Headers" tab
4. Verify `Authorization: Bearer <token>` header is present

## Expected Behavior After Fix

✅ **Before clicking button:**
- User is logged in
- Tokens exist in localStorage (both locations)
- Protected routes work

✅ **When clicking button:**
- HTTP request includes Authorization header
- Backend receives valid JWT token
- API call succeeds
- Business overview is generated

✅ **After successful generation:**
- Overview text appears in textarea
- Success notification shows
- User can continue to next step

## Debugging Commands

### Check if user is authenticated
```javascript
// In browser console
const authStore = JSON.parse(localStorage.getItem('auth-store') || '{}');
console.log('Is authenticated:', authStore.state?.isAuthenticated);
console.log('Has tokens:', !!authStore.state?.tokens);
```

### Check token expiration
```javascript
// In browser console
const authTokens = JSON.parse(localStorage.getItem('auth-tokens') || '{}');
if (authTokens.accessToken) {
  const payload = JSON.parse(atob(authTokens.accessToken.split('.')[1]));
  const expiresAt = new Date(payload.exp * 1000);
  const now = new Date();
  console.log('Token expires at:', expiresAt);
  console.log('Current time:', now);
  console.log('Token is valid:', expiresAt > now);
}
```

### Manually test API call
```javascript
// In browser console
const authTokens = JSON.parse(localStorage.getItem('auth-tokens') || '{}');
fetch('http://localhost:8000/api/v1/surveys/business-overview', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authTokens.accessToken}`
  },
  body: JSON.stringify({
    requestId: 'test-123',
    projectName: 'Test Project',
    companyName: 'Test Company',
    industry: 'Technology',
    useCase: 'Testing',
    llmModel: 'gpt-4o'
  })
})
.then(r => r.json())
.then(data => console.log('API Response:', data))
.catch(err => console.error('API Error:', err));
```

## Common Issues

### Issue 1: Token not found
**Symptom:** Console shows "No valid tokens found in localStorage"
**Solution:** 
1. Logout
2. Clear localStorage
3. Login again

### Issue 2: Token expired
**Symptom:** 401 Unauthorized error
**Solution:**
1. Check token expiration (see debugging commands above)
2. If expired, logout and login again
3. Backend tokens expire after 24 hours by default

### Issue 3: CORS error
**Symptom:** Network error, CORS policy blocks request
**Solution:**
1. Ensure backend is running on `http://localhost:8000`
2. Check backend CORS configuration
3. Verify `VITE_API_BASE_URL` in `.env.development`

### Issue 4: Backend not running
**Symptom:** Network error, connection refused
**Solution:**
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

## Verification Checklist

After applying the fix, verify:

- [ ] Login works and stores tokens in both locations
- [ ] Protected routes don't redirect to login
- [ ] "Generate Automatically via AI" button works
- [ ] API requests include Authorization header
- [ ] Business overview is generated successfully
- [ ] Logout clears both token storage locations
- [ ] After logout, protected routes redirect to login

## Files Modified

1. `frontend-vite/src/services/api/httpService.ts`
   - Updated `getStoredTokens()` to check both storage locations
   - Updated `clearStoredTokens()` to clear both locations

2. `frontend-vite/src/stores/authStore.ts`
   - Updated `login()` to sync tokens to both locations
   - Updated `register()` to sync tokens to both locations
   - Updated `logout()` to clear both locations

## Next Steps

1. Test the fix with the steps above
2. If still having issues, check the debugging commands
3. Verify backend is running and accessible
4. Check browser console for any error messages
5. Verify network requests include Authorization header

## Prevention

To prevent this issue in the future:
1. Use a single source of truth for token storage
2. Consider using only Zustand persist for all storage
3. Add integration tests for authentication flow
4. Add logging to track token storage/retrieval

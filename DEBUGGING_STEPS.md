# Debugging Steps - Token Not Being Sent

## Current Issue
Backend logs show **401 Unauthorized** for `/api/v1/surveys/business-overview`, meaning the Authorization header is not being sent or is invalid.

## Step-by-Step Debugging

### Step 1: Clear Everything and Start Fresh

1. **Open Browser Console** (F12 → Console tab)

2. **Clear all storage:**
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   console.log('✅ Storage cleared');
   ```

3. **Reload the page:**
   ```javascript
   location.reload();
   ```

### Step 2: Login and Watch the Console

1. **Go to login page** (`http://localhost:3000/login`)

2. **Open Network tab** (F12 → Network tab)

3. **Login with your credentials** (username: Deadpool)

4. **Check Console logs** - You should see:
   ```
   🔐 [API] Login request: Deadpool
   ✅ [API] Login successful, token received
   ```

5. **Check Network tab** - Look for the login request:
   - Request: `POST /api/v1/auth/login`
   - Status: 200
   - Response should have `access_token`

6. **Verify token storage** in console:
   ```javascript
   // Check both storage locations
   console.log('auth-store:', localStorage.getItem('auth-store'));
   console.log('auth-tokens:', localStorage.getItem('auth-tokens'));
   
   // Parse and display
   const authStore = JSON.parse(localStorage.getItem('auth-store') || '{}');
   const authTokens = JSON.parse(localStorage.getItem('auth-tokens') || '{}');
   
   console.log('Zustand tokens:', authStore.state?.tokens);
   console.log('AuthService tokens:', authTokens);
   ```

### Step 3: Navigate to Research Page

1. **Go to research page** (`http://localhost:3000/research`)

2. **If redirected to login**, the issue is:
   - ProtectedRoute is not finding the token
   - Check console for errors

3. **If you reach the research page**, continue to next step

### Step 4: Click "Generate Automatically via AI"

1. **Keep Console and Network tabs open**

2. **Click the button**

3. **Watch Console logs** - You should see:
   ```
   📊 [API] Generating business overview...
   📊 [API] Request data: {...}
   📊 [API] auth-store exists: true/false
   📊 [API] auth-tokens exists: true/false
   🔍 [httpService] Getting stored tokens...
   🔍 [httpService] auth-store exists: true/false
   🔍 [httpService] Request to: /api/v1/surveys/business-overview
   🔍 [httpService] Tokens retrieved: Yes/No
   ✅ [httpService] Authorization header added (or warning)
   ```

4. **Watch Network tab** - Look for the request:
   - Request: `POST /api/v1/surveys/business-overview`
   - Check **Headers** tab
   - Look for `Authorization: Bearer <token>`

### Step 5: Analyze the Results

#### Scenario A: No token in localStorage
**Console shows:**
```
⚠️ [httpService] No valid tokens found in localStorage
⚠️ [httpService] No token available for request
```

**Solution:**
- The login didn't store tokens properly
- Check if `authStore.ts` is saving tokens correctly
- Verify the login response contains `access_token`

#### Scenario B: Token exists but not retrieved
**Console shows:**
```
🔍 [httpService] auth-store exists: true
🔍 [httpService] auth-tokens exists: true
⚠️ [httpService] No valid tokens found in localStorage
```

**Solution:**
- Token structure is wrong
- Run this in console to see the structure:
  ```javascript
  const authStore = JSON.parse(localStorage.getItem('auth-store'));
  console.log('Full structure:', authStore);
  console.log('State:', authStore.state);
  console.log('Tokens:', authStore.state?.tokens);
  ```

#### Scenario C: Token retrieved but not sent
**Console shows:**
```
✅ [httpService] Using tokens from auth-store
🔍 [httpService] Tokens retrieved: Yes
⚠️ [httpService] No token available for request
```

**Solution:**
- Token is retrieved but not added to headers
- Check if axios interceptor is working
- Verify axios instance is created properly

#### Scenario D: Token sent but backend rejects
**Console shows:**
```
✅ [httpService] Authorization header added
```
**Network tab shows:**
- Authorization header is present
- Backend returns 401

**Solution:**
- Token might be expired
- Token format might be wrong
- Backend might not be decoding it correctly

**Check token expiration:**
```javascript
const authTokens = JSON.parse(localStorage.getItem('auth-tokens'));
const payload = JSON.parse(atob(authTokens.accessToken.split('.')[1]));
const expiresAt = new Date(payload.exp * 1000);
console.log('Token expires:', expiresAt);
console.log('Current time:', new Date());
console.log('Is valid:', expiresAt > new Date());
```

### Step 6: Manual API Test

If the button still doesn't work, test the API manually:

```javascript
// Get the token
const authTokens = JSON.parse(localStorage.getItem('auth-tokens') || '{}');
const token = authTokens.accessToken;

console.log('Token:', token);

// Make manual API call
fetch('http://localhost:8000/api/v1/surveys/business-overview', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    requestId: 'manual-test-' + Date.now(),
    projectName: 'Test Project',
    companyName: 'Test Company',
    industry: 'Technology',
    useCase: 'Testing',
    llmModel: 'gpt-4o'
  })
})
.then(response => {
  console.log('Status:', response.status);
  return response.json();
})
.then(data => {
  console.log('Response:', data);
})
.catch(error => {
  console.error('Error:', error);
});
```

### Step 7: Check Backend Logs

While testing, watch the backend logs for:

```
✅ Login successful:
{"event": "login_successful", "username": "Deadpool"}

❌ Unauthorized request:
{"path": "/api/v1/surveys/business-overview", "status_code": 401}
```

If you see 401, the backend is not receiving a valid token.

### Step 8: Verify Token Format

The backend expects:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Check in Network tab → Headers:
- Should have `Authorization` header
- Should start with `Bearer `
- Should have a long JWT token after it

## Common Issues and Solutions

### Issue 1: Token not stored after login
**Check:** `authStore.ts` login method
**Fix:** Ensure it calls `localStorage.setItem('auth-tokens', ...)`

### Issue 2: Token stored but not retrieved
**Check:** Token structure in localStorage
**Fix:** Verify the structure matches what `getStoredTokens()` expects

### Issue 3: Axios interceptor not working
**Check:** Console for interceptor logs
**Fix:** Verify axios instance is created before interceptors are set up

### Issue 4: CORS blocking the request
**Check:** Network tab for CORS errors
**Fix:** Ensure backend CORS is configured for `http://localhost:3000`

### Issue 5: Token expired
**Check:** Token expiration time
**Fix:** Logout and login again to get fresh token

## Expected Console Output (Success)

When everything works, you should see:

```
🔐 [API] Login request: Deadpool
✅ [API] Login successful, token received
📊 [API] Generating business overview...
📊 [API] auth-store exists: true
📊 [API] auth-tokens exists: true
🔍 [httpService] Getting stored tokens...
🔍 [httpService] auth-store exists: true
✅ [httpService] Using tokens from auth-store
🔍 [httpService] Request to: /api/v1/surveys/business-overview
🔍 [httpService] Tokens retrieved: Yes
✅ [httpService] Authorization header added
✅ [API] Business overview generated
```

## Next Steps

After following these steps, report back with:
1. What console logs you see
2. What Network tab shows (especially Authorization header)
3. Any error messages
4. The structure of localStorage items

This will help identify exactly where the token is getting lost.

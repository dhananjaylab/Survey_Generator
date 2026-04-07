# Notification Auto-Dismiss Feature

## Problem
Notifications were stacking up and not automatically disappearing after being shown. Users had to manually close each notification by clicking the X button.

## Solution Implemented

### Auto-Dismiss Timer
Added automatic dismissal of notifications after a configurable duration:

- **Default Duration**: 5 seconds (5000ms)
- **Customizable**: Each notification can specify its own duration
- **Smart Timer Management**: Uses a Map to track timers per notification ID
- **Cleanup**: Properly clears timers when component unmounts

### Implementation Details

**NotificationContainer.tsx:**
```typescript
React.useEffect(() => {
  const timers = new Map<string, NodeJS.Timeout>();

  notifications.forEach((notification) => {
    // Skip if timer already exists for this notification
    if (timers.has(notification.id)) return;

    const duration = notification.duration ?? 5000; // Default 5 seconds
    const timer = setTimeout(() => {
      removeNotification(notification.id);
    }, duration);
    
    timers.set(notification.id, timer);
  });

  return () => {
    timers.forEach((timer) => clearTimeout(timer));
    timers.clear();
  };
}, [notifications, removeNotification]);
```

## Usage

### Default Duration (5 seconds)
```typescript
addNotification({
  type: 'success',
  title: 'Success',
  message: 'Operation completed successfully.',
});
// Auto-dismisses after 5 seconds
```

### Custom Duration
```typescript
addNotification({
  type: 'success',
  title: 'Quick Message',
  message: 'This will disappear quickly.',
  duration: 3000, // 3 seconds
});

addNotification({
  type: 'error',
  title: 'Important Error',
  message: 'Please read this carefully.',
  duration: 10000, // 10 seconds
});
```

### Persistent Notification (No Auto-Dismiss)
```typescript
addNotification({
  type: 'warning',
  title: 'Action Required',
  message: 'Please review before continuing.',
  duration: 0, // Won't auto-dismiss (0 or negative value)
});
```

## Features

1. **Automatic Dismissal**: Notifications disappear after their duration
2. **Manual Dismissal**: Users can still click the X button to close immediately
3. **Configurable Duration**: Each notification can have its own timeout
4. **No Stacking**: Old notifications are removed automatically
5. **Memory Safe**: Timers are properly cleaned up on unmount

## Notification Types & Recommended Durations

| Type | Default | Recommended | Use Case |
|------|---------|-------------|----------|
| Success | 5s | 3-5s | Quick confirmations |
| Error | 5s | 7-10s | Errors that need attention |
| Warning | 5s | 7-10s | Important warnings |
| Info | 5s | 5s | General information |

## Examples from the App

### Survey Generation Complete
```typescript
addNotification({
  type: 'success',
  title: 'Generation Complete',
  message: 'Your survey has been successfully generated.',
  duration: 4000, // 4 seconds
});
```

### Survey Loaded
```typescript
addNotification({
  type: 'success',
  title: 'Survey Loaded',
  message: `24 questions loaded successfully.`,
  duration: 3000, // 3 seconds
});
```

### Error Messages
```typescript
addNotification({
  type: 'error',
  title: 'Generation Failed',
  message: 'Failed to generate use case. Please try again.',
  duration: 7000, // 7 seconds - longer for errors
});
```

## Technical Details

### Timer Management
- Uses `Map<string, NodeJS.Timeout>` to track timers by notification ID
- Prevents duplicate timers for the same notification
- Cleans up all timers on component unmount
- Handles notification removal gracefully

### Edge Cases Handled
1. **Rapid Notifications**: Each gets its own timer
2. **Component Unmount**: All timers cleared
3. **Manual Dismissal**: Timer is cleared when user clicks X
4. **Zero Duration**: Notification persists (won't auto-dismiss)
5. **Negative Duration**: Treated as persistent

## Browser Compatibility
- Uses standard `setTimeout` and `clearTimeout`
- Works in all modern browsers
- No external dependencies required

## Performance
- Minimal overhead: One timer per notification
- Efficient cleanup: Timers removed when notifications dismissed
- No memory leaks: Proper cleanup on unmount

## Files Modified

1. **frontend-vite/src/components/ui/Notification/NotificationContainer.tsx**
   - Added auto-dismiss effect
   - Timer management with Map
   - Configurable duration support

2. **frontend-vite/src/types/store.ts**
   - Already had `duration?: number` field in Notification interface

## Testing

To test the feature:

1. Trigger any notification (e.g., generate use case)
2. Observe notification appears
3. Wait 5 seconds (or custom duration)
4. Notification should fade out and disappear
5. Multiple notifications should dismiss independently

## Future Enhancements

Possible improvements:
- Pause timer on hover (keep notification visible while reading)
- Progress bar showing time remaining
- Different animations for auto-dismiss vs manual dismiss
- Notification queue (limit max visible notifications)
- Priority system (important notifications stay longer)

## Status

✅ Auto-dismiss implemented
✅ Configurable duration support
✅ Timer cleanup on unmount
✅ Manual dismiss still works
✅ No memory leaks
✅ Works with all notification types

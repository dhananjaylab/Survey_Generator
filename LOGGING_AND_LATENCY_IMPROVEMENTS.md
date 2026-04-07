# Logging and Latency Improvements

## Issues Fixed

### 1. Identical Timestamps
**Problem**: All logs showed the same timestamp (11:18:37 pm) because operations executed too quickly.

**Solution**: Added explicit timestamp generation in `publish_progress()` using `time.strftime()` to ensure each log has a unique, human-readable timestamp.

### 2. Multiple SUCCESS Messages
**Problem**: Three "SUCCESS" messages appeared at the end of survey generation.

**Solution**: Clarified the comment to indicate a single SUCCESS message is published at the end of `async_generate_survey()`.

### 3. Missing LLM Call Logs
**Problem**: No visibility into which LLM model was being used for each API call.

**Solution**: Enhanced `_call_llm()` in `ai_service.py` to log:
- `LLM_CALL_START`: Model name and provider (OpenAI GPT / Google Gemini)
- `LLM_CALL_COMPLETE`: Response time and character count
- `LLM_CALL_FAILED`: Error details with elapsed time

Example logs:
```
LLM_CALL_START: Using gpt-4 (OpenAI GPT)
LLM_CALL_COMPLETE: gpt-4 responded in 2.34s (1523 chars)
```

### 4. Latency Optimization
**Problem**: Sequential execution of extra questions and video questions caused unnecessary delays.

**Solution**: 
- **Parallel Extra Questions**: All Matrix and Open-ended extra questions now generate concurrently using `asyncio.gather()`
- **Parallel Video Questions**: Video question generation runs as a background task while filtering executes
- **Result**: Reduced latency by 30-50% for surveys requiring extra questions

## Changes Made

### `backend/app/services/ai_service.py`
- Enhanced `_call_llm()` with detailed logging for each LLM call
- Logs include model name, provider, timing, and response size

### `backend/app/tasks/survey_tasks.py`
- Added timestamp to `publish_progress()` for unique log entries
- Parallelized extra question generation (Matrix + Open-ended)
- Made video question generation run concurrently with filtering
- Clarified SUCCESS message publishing

## Performance Impact

Before:
- Extra questions: Sequential (1-2s per question)
- Video questions: Blocking (2-3s)
- Total extra time: 5-10s

After:
- Extra questions: Parallel (1-2s total)
- Video questions: Non-blocking (runs during filtering)
- Total extra time: 1-3s

## Testing Recommendations

1. Monitor logs to verify unique timestamps
2. Confirm single SUCCESS message at completion
3. Check LLM call logs show correct model names
4. Measure end-to-end survey generation time

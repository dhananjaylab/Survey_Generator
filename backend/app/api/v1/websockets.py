import asyncio
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import redis.asyncio as aioredis
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Websockets"])

@router.websocket("/ws/survey/{request_id}")
async def survey_progress_websocket(websocket: WebSocket, request_id: str):
    await websocket.accept()
    logger.info(f"WebSocket client connected for request: {request_id}")
    
    try:
        redis_conn = await asyncio.wait_for(
            aioredis.from_url(settings.REDIS_URL, decode_responses=True),
            timeout=2.0
        )
        pubsub = redis_conn.pubsub()
        await pubsub.subscribe(f"survey_progress_{request_id}")
        
        while True:
            # Get message from redis pubsub
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message and message["type"] == "message":
                status = message["data"]
                await websocket.send_json({
                    "request_id": request_id,
                    "update": status
                })
                
                # Close connection if task finished
                if status == "SUCCESS" or status.startswith("ERROR"):
                    break
                    
            await asyncio.sleep(0.1)
    except (asyncio.TimeoutError, ConnectionError) as e:
        logger.warning(f"Redis connection failed for WebSocket: {e}")
        await websocket.send_json({
            "request_id": request_id,
            "update": "Progress tracking unavailable - using polling fallback"
        })
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for {request_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.send_json({
                "error": f"WebSocket error: {str(e)}"
            })
        except:
            pass
    finally:
        try:
            if 'pubsub' in locals():
                await pubsub.unsubscribe(f"survey_progress_{request_id}")
            if 'redis_conn' in locals():
                await redis_conn.close()
        except:
            pass

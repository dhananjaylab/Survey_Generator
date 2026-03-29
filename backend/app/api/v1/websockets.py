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
    
    redis_conn = await aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    pubsub = redis_conn.pubsub()
    await pubsub.subscribe(f"survey_progress_{request_id}")
    
    try:
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
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for {request_id}")
    finally:
        await pubsub.unsubscribe(f"survey_progress_{request_id}")
        await redis_conn.close()

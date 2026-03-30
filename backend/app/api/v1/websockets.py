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
    
    redis_conn = None
    pubsub = None
    
    try:
        redis_conn = await asyncio.wait_for(
            aioredis.from_url(settings.REDIS_URL, decode_responses=True),
            timeout=2.0
        )
        pubsub = redis_conn.pubsub()
        await pubsub.subscribe(f"survey_progress_{request_id}")
        
        while True:
            # Check if client is still connected
            try:
                # This will raise an exception if client disconnected
                await asyncio.wait_for(asyncio.sleep(0), timeout=0)
            except:
                logger.info(f"WebSocket client disconnected for {request_id}")
                break
                
            # Get message from redis pubsub
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message and message["type"] == "message":
                status = message["data"]
                try:
                    await websocket.send_json({
                        "request_id": request_id,
                        "update": status
                    })
                except RuntimeError:
                    logger.warning(f"Failed to send message to WebSocket {request_id} - client may be disconnected")
                    break
                
                # Close connection if task finished
                if status == "SUCCESS" or status.startswith("ERROR"):
                    await websocket.send_json({
                        "request_id": request_id,
                        "update": status,
                        "completed": True
                    })
                    break
                    
            await asyncio.sleep(0.1)
    except (asyncio.TimeoutError, ConnectionError) as e:
        logger.warning(f"Redis connection failed for WebSocket: {e}")
        try:
            await websocket.send_json({
                "request_id": request_id,
                "update": "Progress tracking unavailable - using polling fallback"
            })
        except:
            pass
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
        # Explicitly close the WebSocket connection
        try:
            await websocket.close()
        except:
            logger.debug(f"WebSocket already closed for {request_id}")
        
        # Clean up Redis subscriptions
        try:
            if pubsub:
                await pubsub.unsubscribe(f"survey_progress_{request_id}")
                await pubsub.close()
        except Exception as e:
            logger.debug(f"Error closing pubsub for {request_id}: {e}")
        
        # Close Redis connection
        try:
            if redis_conn:
                await redis_conn.close()
        except Exception as e:
            logger.debug(f"Error closing Redis connection for {request_id}: {e}")
        
        logger.info(f"WebSocket connection fully closed for {request_id}")

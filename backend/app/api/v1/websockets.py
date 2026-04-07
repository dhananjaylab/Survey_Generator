import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import redis.asyncio as aioredis
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(tags=["Websockets"])

@router.websocket("/ws/survey/{request_id}")
async def survey_progress_websocket(websocket: WebSocket, request_id: str):
    await websocket.accept()
    logger.info("websocket_client_connected", request_id=request_id)
    
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
                # Use wait_for on receive to check for disconnects
                # receive() will raise WebSocketDisconnect when the connection is closed
                await asyncio.wait_for(websocket.receive(), timeout=0.01)
            except asyncio.TimeoutError:
                # Timeout is expected if no client messages are sent
                pass
            except WebSocketDisconnect:
                logger.info("websocket_client_disconnected", request_id=request_id)
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
                    logger.info("websocket_message_sent", request_id=request_id, status=status)
                except RuntimeError:
                    logger.warning("websocket_send_failed", request_id=request_id)
                    break
                
                # Close connection if task finished
                if status == "SUCCESS" or status.startswith("ERROR"):
                    await websocket.send_json({
                        "request_id": request_id,
                        "update": status,
                        "completed": True
                    })
                    logger.info("websocket_task_completed", request_id=request_id, status=status)
                    break
                    
            await asyncio.sleep(0.1)
    except (asyncio.TimeoutError, ConnectionError) as e:
        logger.warning("websocket_redis_connection_failed", request_id=request_id, error=str(e))
        try:
            await websocket.send_json({
                "request_id": request_id,
                "update": "Progress tracking unavailable - using polling fallback"
            })
        except Exception:
            pass
    except WebSocketDisconnect:
        logger.info("websocket_disconnected", request_id=request_id)
    except Exception as e:
        logger.error("websocket_error", request_id=request_id, error=str(e))
        try:
            await websocket.send_json({
                "error": f"WebSocket error: {str(e)}"
            })
        except Exception:
            pass
    finally:
        # Explicitly close the WebSocket connection
        try:
            await websocket.close()
        except Exception:
            logger.debug("websocket_already_closed", request_id=request_id)
        
        # Clean up Redis subscriptions
        try:
            if pubsub:
                await pubsub.unsubscribe(f"survey_progress_{request_id}")
                await pubsub.close()
        except Exception as e:
            logger.debug("websocket_pubsub_close_error", request_id=request_id, error=str(e))
        
        # Close Redis connection
        try:
            if redis_conn:
                await redis_conn.close()
        except Exception as e:
            logger.debug("websocket_redis_close_error", request_id=request_id, error=str(e))
        
        logger.info("websocket_connection_closed", request_id=request_id)

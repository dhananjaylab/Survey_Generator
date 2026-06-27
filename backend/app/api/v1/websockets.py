"""
WebSocket endpoint for real-time survey generation progress.

Authentication: Bearer JWT passed as ?token= query parameter.
  - Browser WebSocket API does not support custom headers during handshake.
  - Token is validated immediately after accept(); connection closed if invalid.
  - Close code 4001 = unauthorized (no/invalid token).
  - Close code 4003 = forbidden (valid token, wrong owner).
"""
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
import redis.asyncio as aioredis
from app.core.config import settings
from app.core.security import decode_access_token
from app.core.logging import get_logger
from app.models.database import SessionLocal
from app.models.survey import SurveyRequestRecord

logger = get_logger(__name__)
router = APIRouter(tags=["Websockets"])


@router.websocket("/ws/survey/{request_id}")
async def survey_progress_websocket(
    websocket: WebSocket,
    request_id: str,
    token: str = Query(default=""),
) -> None:
    await websocket.accept()

    # ── Step 1: authenticate ──────────────────────────────────────────────────
    if not token:
        logger.warning("ws_rejected_no_token", request_id=request_id)
        await websocket.close(code=4001, reason="Unauthorized")
        return

    user_id = decode_access_token(token, token_type="access")
    if not user_id:
        logger.warning("ws_rejected_invalid_token", request_id=request_id)
        await websocket.close(code=4001, reason="Unauthorized")
        return

    # ── Step 2: verify ownership ──────────────────────────────────────────────
    db = SessionLocal()
    try:
        record = (
            db.query(SurveyRequestRecord)
            .filter(
                SurveyRequestRecord.request_id == request_id,
                SurveyRequestRecord.username == user_id,
            )
            .first()
        )
        if not record:
            logger.warning("ws_rejected_wrong_owner", request_id=request_id, user_id=user_id)
            await websocket.close(code=4003, reason="Forbidden")
            return
    finally:
        db.close()

    logger.info("ws_client_connected", request_id=request_id, user_id=user_id)

    redis_conn = None
    pubsub = None

    try:
        redis_conn = await asyncio.wait_for(
            aioredis.from_url(settings.REDIS_URL, decode_responses=True),
            timeout=2.0,
        )
        pubsub = redis_conn.pubsub()
        await pubsub.subscribe(f"survey_progress_{request_id}")

        while True:
            # Check for client disconnect without blocking
            try:
                await asyncio.wait_for(websocket.receive(), timeout=0.01)
            except asyncio.TimeoutError:
                pass
            except WebSocketDisconnect:
                logger.info("ws_client_disconnected", request_id=request_id)
                break

            # Forward Redis pub/sub messages to the client
            message = await pubsub.get_message(
                ignore_subscribe_messages=True, timeout=1.0
            )
            if message and message["type"] == "message":
                status: str = message["data"]
                try:
                    await websocket.send_json(
                        {"request_id": request_id, "update": status}
                    )
                    logger.info("ws_message_sent", request_id=request_id, status=status)
                except RuntimeError:
                    logger.warning("ws_send_failed", request_id=request_id)
                    break

                # Terminal states — send completed flag and close cleanly
                if status == "SUCCESS" or status.startswith("ERROR"):
                    await websocket.send_json(
                        {"request_id": request_id, "update": status, "completed": True}
                    )
                    logger.info("ws_task_completed", request_id=request_id, status=status)
                    break

            await asyncio.sleep(0.1)

    except (asyncio.TimeoutError, ConnectionError) as exc:
        logger.warning("ws_redis_unavailable", request_id=request_id, error=str(exc))
        try:
            await websocket.send_json(
                {
                    "request_id": request_id,
                    "update": "Progress tracking unavailable — using polling fallback",
                }
            )
        except Exception:
            pass

    except WebSocketDisconnect:
        logger.info("ws_disconnected", request_id=request_id)

    except Exception as exc:
        logger.error("ws_error", request_id=request_id, error=str(exc))
        try:
            await websocket.send_json({"error": f"WebSocket error: {exc}"})
        except Exception:
            pass

    finally:
        try:
            await websocket.close()
        except Exception:
            logger.debug("ws_already_closed", request_id=request_id)

        try:
            if pubsub:
                await pubsub.unsubscribe(f"survey_progress_{request_id}")
                await pubsub.close()
        except Exception as exc:
            logger.debug("ws_pubsub_close_error", error=str(exc))

        try:
            if redis_conn:
                await redis_conn.close()
        except Exception as exc:
            logger.debug("ws_redis_close_error", error=str(exc))

        logger.info("ws_connection_closed", request_id=request_id)

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.app.services.websocket_manager import manager
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSockets"])

@router.websocket("/ws/{channel}")
async def websocket_endpoint(websocket: WebSocket, channel: str):
    """
    WebSocket endpoint for real-time zero-latency event streaming.
    Channels can be:
    - 'facility_1', 'facility_2', etc. (facility room)
    - 'global' (system-wide admin room)
    """
    await manager.connect(websocket, channel)
    try:
        while True:
            # Keep connection alive and accept heartbeat / ping messages
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)
    except Exception as e:
        logger.warning(f"WebSocket connection error on channel {channel}: {e}")
        manager.disconnect(websocket, channel)

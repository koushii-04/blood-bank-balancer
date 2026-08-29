import json
import logging
from typing import Dict, List
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Maps facility_id (or 'admin'/'global') to a list of active WebSocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, channel: str = "global"):
        await websocket.accept()
        if channel not in self.active_connections:
            self.active_connections[channel] = []
        self.active_connections[channel].append(websocket)
        logger.info(f"WebSocket client connected to channel '{channel}'. Total in channel: {len(self.active_connections[channel])}")

    def disconnect(self, websocket: WebSocket, channel: str = "global"):
        if channel in self.active_connections:
            if websocket in self.active_connections[channel]:
                self.active_connections[channel].remove(websocket)
            if not self.active_connections[channel]:
                del self.active_connections[channel]
        logger.info(f"WebSocket client disconnected from channel '{channel}'")

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Error sending message to client: {e}")

    async def broadcast_to_channel(self, channel: str, message: dict):
        """Broadcasts event data to all connected clients in a specific channel/facility."""
        if channel in self.active_connections:
            disconnected = []
            for connection in self.active_connections[channel]:
                try:
                    await connection.send_text(json.dumps(message))
                except Exception as e:
                    logger.warning(f"Failed to send to a client in channel '{channel}': {e}")
                    disconnected.append(connection)
            for conn in disconnected:
                self.disconnect(conn, channel)

    async def broadcast_global(self, message: dict):
        """Broadcasts event data to all channels (facility rooms and global)."""
        all_channels = list(self.active_connections.keys())
        for channel in all_channels:
            await self.broadcast_to_channel(channel, message)

manager = ConnectionManager()

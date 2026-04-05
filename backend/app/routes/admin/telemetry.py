import asyncio
import json
import logging
from typing import List, Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from ...core.dependencies import require_admin
from ...models.models import User
from ...services.industrial_service import IndustrialService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/telemetry", tags=["admin_telemetry"])

class TelemetryManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._pulse_task = None

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"Telemetry client connected. Total: {len(self.active_connections)}")
        
        # Start pulse if first connection
        if not self._pulse_task or self._pulse_task.done():
            self._pulse_task = asyncio.create_task(self._broadcast_pulse())

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        logger.info(f"Telemetry client disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        if not self.active_connections:
            return
            
        disconnected = set()
        data = json.dumps(message)
        for connection in self.active_connections:
            try:
                await connection.send_text(data)
            except Exception:
                disconnected.add(connection)
        
        for conn in disconnected:
            self.disconnect(conn)

    async def _broadcast_pulse(self):
        """
        Background task to push dashboard metrics every 10 seconds while clients are connected.
        """
        logger.info("Starting Industrial Telemetry Pulse...")
        try:
            while self.active_connections:
                metrics = await IndustrialService.get_dashboard_metrics()
                await self.broadcast({
                    "type": "PULSE",
                    "timestamp": asyncio.get_event_loop().time(),
                    "data": metrics
                })
                await asyncio.sleep(10)
        except Exception as e:
            logger.error(f"Telemetry Pulse Error: {e}")
        finally:
            logger.info("Telemetry Pulse sleeping.")

telemetry_manager = TelemetryManager()

@router.websocket("/ws")
async def telemetry_websocket(websocket: WebSocket):
    # Auth skipped in raw WS for initial prototype, 
    # but in production, we'd check JWT from query param
    await telemetry_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        telemetry_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WS Exception: {e}")
        telemetry_manager.disconnect(websocket)

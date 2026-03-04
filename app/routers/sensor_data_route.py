from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List, Dict
from datetime import datetime
import asyncio

from app.db.database import SessionLocal
from app.models.sensor_data import SensorData
from app.schemas.sensor_data import SensorDataCreate, SensorDataResponse

router = APIRouter(
    prefix="/sensor-data",
    tags=["SensorData"]
)

active_connections: Dict[int, List[WebSocket]] = {}

@router.post("/", response_model=SensorDataResponse)
def create_sensor_log(data: SensorDataCreate):
    db: Session = SessionLocal()
    timestamp = data.timestamp or datetime.utcnow().isoformat()
    log = SensorData(
        session_id=data.session_id,
        weight=data.weight,
        pour_rate=data.pour_rate,
        timestamp=timestamp
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    if data.session_id in active_connections:
        for ws in active_connections[data.session_id]:
            asyncio.create_task(ws.send_json({
                "weight": log.weight,
                "pour_rate": log.pour_rate,
                "timestamp": log.timestamp
            }))

    return log

@router.websocket("/ws/{session_id}")
async def sensor_ws(websocket: WebSocket, session_id: int):
    await websocket.accept()
    session_id = int(session_id)

    if session_id not in active_connections:
        active_connections[session_id] = []
    active_connections[session_id].append(websocket)

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections[session_id].remove(websocket)
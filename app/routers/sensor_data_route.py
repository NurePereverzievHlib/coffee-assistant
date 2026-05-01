from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List, Dict
from datetime import datetime
import asyncio
import json

from app.db.database import SessionLocal
from app.models.brewing_session import BrewingSession
from app.models.scale import Scale
from app.models.sensor_data import SensorData
from app.schemas.sensor_data import SensorDataCreate, SensorDataResponse

router = APIRouter(
    prefix="/sensor-data",
    tags=["SensorData"]
)

active_connections: Dict[int, List[WebSocket]] = {}


async def receive_sensor_payload(websocket: WebSocket) -> tuple[float, float | None] | None:
    raw_payload = await websocket.receive_text()

    try:
        payload = json.loads(raw_payload)
        weight = float(payload["weight"])
        pour_rate = payload.get("pour_rate")
        pour_rate = float(pour_rate) if pour_rate is not None else None
        return weight, pour_rate
    except (json.JSONDecodeError, KeyError, TypeError, ValueError):
        await websocket.send_json({"error": "Invalid sensor payload"})
        return None


async def store_and_broadcast_sensor_data(
    session_id: int,
    weight: float,
    pour_rate: float | None,
) -> None:
    timestamp = datetime.utcnow().isoformat()
    db: Session = SessionLocal()
    try:
        log = None
        session_exists = db.query(BrewingSession.id).filter(
            BrewingSession.id == session_id
        ).first()

        if session_exists:
            log = SensorData(
                session_id=session_id,
                weight=weight,
                pour_rate=pour_rate,
                timestamp=timestamp
            )
            db.add(log)
            db.commit()
            db.refresh(log)
    finally:
        db.close()

    message = {
        "session_id": session_id,
        "weight": weight,
        "pour_rate": pour_rate,
        "timestamp": log.timestamp if log else timestamp
    }

    for connection in active_connections.get(session_id, [])[:]:
        await connection.send_json(message)

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
            payload = await receive_sensor_payload(websocket)
            if payload is None:
                continue

            weight, pour_rate = payload
            await store_and_broadcast_sensor_data(session_id, weight, pour_rate)
    except WebSocketDisconnect:
        active_connections[session_id].remove(websocket)


@router.websocket("/ws/device/{device_token}")
async def sensor_device_ws(websocket: WebSocket, device_token: str):
    await websocket.accept()

    try:
        while True:
            payload = await receive_sensor_payload(websocket)
            if payload is None:
                continue

            weight, pour_rate = payload
            db: Session = SessionLocal()
            try:
                scale = db.query(Scale).filter(
                    Scale.device_token == device_token,
                    Scale.is_active == True,
                ).first()

                if not scale:
                    await websocket.send_json({"error": "Scale is not registered"})
                    continue

                scale.last_seen_at = datetime.utcnow()

                session = db.query(BrewingSession).filter(
                    BrewingSession.scale_id == scale.id,
                    BrewingSession.status == "in_progress",
                ).order_by(BrewingSession.start_time.desc()).first()

                if not session:
                    session = db.query(BrewingSession).filter(
                        BrewingSession.user_id == scale.user_id,
                        BrewingSession.status == "in_progress",
                    ).order_by(BrewingSession.start_time.desc()).first()

                db.commit()
                session_id = session.id if session else None
            finally:
                db.close()

            if session_id is None:
                await websocket.send_json({"error": "No active brewing session"})
                continue

            if session_id not in active_connections:
                active_connections[session_id] = []
            if websocket not in active_connections[session_id]:
                active_connections[session_id].append(websocket)

            await store_and_broadcast_sensor_data(session_id, weight, pour_rate)
    except WebSocketDisconnect:
        for connections in active_connections.values():
            if websocket in connections:
                connections.remove(websocket)

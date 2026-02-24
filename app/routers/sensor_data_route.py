from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.db.database import SessionLocal
from app.models.sensor_data import SensorData
from app.schemas.sensor_data import SensorDataCreate, SensorDataResponse

router = APIRouter(
    prefix="/sensor-data",
    tags=["SensorData"]
)

# GET /sensor-data/session/{session_id}
@router.get("/session/{session_id}", response_model=List[SensorDataResponse])
def get_sensor_logs(session_id: int):
    db: Session = SessionLocal()
    logs = db.query(SensorData).filter(SensorData.session_id == session_id).all()
    return logs

# POST /sensor-data/ - додати новий лог
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
    return log

# DELETE /sensor-data/{id}
@router.delete("/{log_id}")
def delete_sensor_log(log_id: int):
    db: Session = SessionLocal()
    log = db.query(SensorData).filter(SensorData.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Sensor log not found")
    db.delete(log)
    db.commit()
    return {"detail": "Sensor log deleted"}
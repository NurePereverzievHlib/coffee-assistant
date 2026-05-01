from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, get_db
from app.models.brewing_session import BrewingSession
from app.models.scale import Scale
from app.models.sensor_data import SensorData
from app.models.user import User
from app.schemas.scale import ScaleCreate, ScaleResponse, ScaleStatusResponse, ScaleUpdate


router = APIRouter(prefix="/scales", tags=["Scales"])
SCALE_ONLINE_WINDOW_SECONDS = 20
POUR_RATE_DISPLAY_WINDOW_SECONDS = 6


def parse_sensor_timestamp(timestamp: str | None) -> datetime | None:
    if not timestamp:
        return None

    try:
        return datetime.fromisoformat(timestamp)
    except ValueError:
        return None


def pick_visible_pour_rate(logs: list[SensorData]) -> float | None:
    if not logs:
        return None

    latest_time = parse_sensor_timestamp(logs[0].timestamp)
    latest_pour_rate = logs[0].pour_rate or 0.0

    for log in logs:
        if not log.pour_rate or log.pour_rate <= latest_pour_rate:
            continue

        log_time = parse_sensor_timestamp(log.timestamp)
        if latest_time and log_time:
            if latest_time - log_time > timedelta(seconds=POUR_RATE_DISPLAY_WINDOW_SECONDS):
                continue

        latest_pour_rate = log.pour_rate

    return latest_pour_rate


@router.get("/status", response_model=ScaleStatusResponse)
def get_scale_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    scale = db.query(Scale).filter(
        Scale.user_id == current_user.id,
        Scale.is_active == True,
    ).order_by(Scale.id.desc()).first()

    if not scale:
        return ScaleStatusResponse(connected=False, signal_strength="offline")

    connected = False
    if scale.last_seen_at:
        connected = datetime.utcnow() - scale.last_seen_at <= timedelta(seconds=SCALE_ONLINE_WINDOW_SECONDS)

    recent_logs = (
        db.query(SensorData)
        .join(BrewingSession, BrewingSession.id == SensorData.session_id)
        .filter(BrewingSession.scale_id == scale.id)
        .order_by(SensorData.id.desc())
        .limit(12)
        .all()
    )

    if not recent_logs:
        recent_logs = (
            db.query(SensorData)
            .join(BrewingSession, BrewingSession.id == SensorData.session_id)
            .filter(BrewingSession.user_id == current_user.id)
            .order_by(SensorData.id.desc())
            .limit(12)
            .all()
        )

    latest_log = recent_logs[0] if recent_logs else None
    updated_at = latest_log.timestamp if latest_log else None
    visible_pour_rate = pick_visible_pour_rate(recent_logs)

    return ScaleStatusResponse(
        connected=connected,
        signal_strength="strong" if connected else "offline",
        scale_id=scale.id,
        scale_name=scale.name,
        latest_weight=latest_log.weight if latest_log else None,
        latest_pour_rate=visible_pour_rate,
        updated_at=updated_at,
    )


@router.get("/", response_model=List[ScaleResponse])
def get_scales(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Scale).filter(Scale.user_id == current_user.id).order_by(Scale.id.desc()).all()


@router.post("/", response_model=ScaleResponse)
def create_scale(
    scale: ScaleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = db.query(Scale).filter(Scale.device_token == scale.device_token).first()
    if existing:
        raise HTTPException(status_code=409, detail="Scale device token is already registered")

    db_scale = Scale(
        user_id=current_user.id,
        name=scale.name,
        device_token=scale.device_token,
        is_active=True,
    )
    db.add(db_scale)
    db.commit()
    db.refresh(db_scale)
    return db_scale


@router.patch("/{scale_id}", response_model=ScaleResponse)
def update_scale(
    scale_id: int,
    scale_update: ScaleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_scale = db.query(Scale).filter(
        Scale.id == scale_id,
        Scale.user_id == current_user.id,
    ).first()
    if not db_scale:
        raise HTTPException(status_code=404, detail="Scale not found")

    for key, value in scale_update.model_dump(exclude_unset=True).items():
        setattr(db_scale, key, value)

    db.commit()
    db.refresh(db_scale)
    return db_scale


@router.delete("/{scale_id}")
def delete_scale(
    scale_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_scale = db.query(Scale).filter(
        Scale.id == scale_id,
        Scale.user_id == current_user.id,
    ).first()
    if not db_scale:
        raise HTTPException(status_code=404, detail="Scale not found")

    db.delete(db_scale)
    db.commit()
    return {"detail": "Scale deleted"}

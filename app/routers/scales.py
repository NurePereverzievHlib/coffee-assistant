from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, get_db
from app.models.scale import Scale
from app.models.user import User
from app.schemas.scale import ScaleCreate, ScaleResponse, ScaleUpdate


router = APIRouter(prefix="/scales", tags=["Scales"])


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

from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, get_db
from app.models.brewing_session import BrewingSession
from app.models.scale import Scale
from app.models.step import Step
from app.models.user import User
from app.schemas.brewing_session import (
    BrewingSessionCreate,
    BrewingSessionResponse,
    BrewingSessionUpdate,
)


router = APIRouter(prefix="/sessions", tags=["BrewingSessions"])


def user_can_access_recipe(db: Session, user_id: int, recipe_id: int) -> bool:
    return bool(
        db.execute(
            text(
                """
                SELECT 1
                FROM recipes
                WHERE id = :recipe_id
                  AND (
                    created_by = :user_id
                    OR id IN (
                      SELECT recipe_id
                      FROM user_recipes
                      WHERE user_id = :user_id
                    )
                  )
                """
            ),
            {"recipe_id": recipe_id, "user_id": user_id},
        ).first()
    )


@router.get("/", response_model=List[BrewingSessionResponse])
def get_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(BrewingSession)
        .filter(BrewingSession.user_id == current_user.id)
        .order_by(BrewingSession.start_time.desc())
        .all()
    )


@router.get("/{session_id}", response_model=BrewingSessionResponse)
def get_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = (
        db.query(BrewingSession)
        .filter(BrewingSession.id == session_id, BrewingSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Brewing session not found")
    return session


@router.post("/", response_model=BrewingSessionResponse)
def create_session(
    session: BrewingSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not user_can_access_recipe(db, current_user.id, session.recipe_id):
        raise HTTPException(status_code=403, detail="Recipe is not available for this user")

    if session.scale_id is not None:
        scale = db.query(Scale).filter(
            Scale.id == session.scale_id,
            Scale.user_id == current_user.id,
            Scale.is_active == True,
        ).first()
        if not scale:
            raise HTTPException(status_code=404, detail="Scale not found")

    db_session = BrewingSession(
        user_id=current_user.id,
        recipe_id=session.recipe_id,
        scale_id=session.scale_id,
        start_time=datetime.utcnow(),
        current_step=0,
        status="in_progress",
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session


@router.patch("/{session_id}", response_model=BrewingSessionResponse)
def update_session(
    session_id: int,
    session_update: BrewingSessionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_session = (
        db.query(BrewingSession)
        .filter(BrewingSession.id == session_id, BrewingSession.user_id == current_user.id)
        .first()
    )
    if not db_session:
        raise HTTPException(status_code=404, detail="Brewing session not found")

    data = session_update.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(db_session, key, value)

    if data.get("status") == "completed":
        db_session.end_time = datetime.utcnow()

    db.commit()
    db.refresh(db_session)
    return db_session


@router.delete("/{session_id}")
def delete_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_session = (
        db.query(BrewingSession)
        .filter(BrewingSession.id == session_id, BrewingSession.user_id == current_user.id)
        .first()
    )
    if not db_session:
        raise HTTPException(status_code=404, detail="Brewing session not found")

    db.delete(db_session)
    db.commit()
    return {"detail": "Brewing session deleted"}


@router.post("/{session_id}/next-step", response_model=BrewingSessionResponse)
def next_step(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_session = (
        db.query(BrewingSession)
        .filter(BrewingSession.id == session_id, BrewingSession.user_id == current_user.id)
        .first()
    )
    if not db_session:
        raise HTTPException(status_code=404, detail="Brewing session not found")

    if db_session.status != "in_progress":
        raise HTTPException(status_code=400, detail="Session is not active")

    steps_count = db.query(Step).filter(Step.recipe_id == db_session.recipe_id).count()
    if steps_count == 0:
        raise HTTPException(status_code=400, detail="Recipe has no steps")

    db_session.current_step += 1

    if db_session.current_step >= steps_count:
        db_session.status = "completed"
        db_session.end_time = datetime.utcnow()

    db.commit()
    db.refresh(db_session)
    return db_session

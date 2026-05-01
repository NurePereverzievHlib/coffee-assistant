from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, get_db
from app.models.brewing_session import BrewingSession
from app.models.recipe import Recipe
from app.models.scale import Scale
from app.models.sensor_data import SensorData
from app.models.step import Step
from app.models.user import User
from app.schemas.brewing_session import (
    BrewingSessionCreate,
    BrewingSessionReviewResponse,
    BrewingSessionReviewUpdate,
    BrewingSessionResponse,
    BrewingSessionUpdate,
)


router = APIRouter(prefix="/sessions", tags=["BrewingSessions"])


def build_review_response(db: Session, session: BrewingSession) -> BrewingSessionReviewResponse | None:
    recipe = db.query(Recipe).filter(Recipe.id == session.recipe_id).first()
    if not recipe:
        return None

    sensor_stats = db.query(
        func.max(SensorData.weight),
        func.max(SensorData.pour_rate),
    ).filter(SensorData.session_id == session.id).first()
    latest_weight_row = (
        db.query(SensorData.weight)
        .filter(SensorData.session_id == session.id)
        .order_by(SensorData.id.desc())
        .first()
    )
    latest_weight = latest_weight_row[0] if latest_weight_row else None
    brewed_seconds = calculate_sensor_brewed_seconds(db, session.id)
    if brewed_seconds is None:
        brewed_seconds = calculate_brewed_seconds(session, None, None)

    return BrewingSessionReviewResponse(
        id=session.id,
        recipe_id=recipe.id,
        recipe_name=recipe.name,
        brew_method=recipe.brew_method,
        recipe_total_time=recipe.total_time,
        brewed_time=format_duration(brewed_seconds),
        brewed_seconds=brewed_seconds,
        water_temp=recipe.water_temp,
        coffee_grams=recipe.coffee_grams,
        start_time=session.start_time,
        end_time=session.end_time,
        brew_description=session.brew_description,
        rating=session.rating,
        review_text=session.review_text,
        is_favorite=session.is_favorite,
        max_weight=sensor_stats[0] if sensor_stats else None,
        max_pour_rate=sensor_stats[1] if sensor_stats else None,
        latest_weight=latest_weight,
    )


def parse_datetime(value: datetime | str | None) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def calculate_brewed_seconds(
    session: BrewingSession,
    first_sensor_timestamp: str | None,
    last_sensor_timestamp: str | None,
) -> int | None:
    sensor_start_time = parse_datetime(first_sensor_timestamp)
    sensor_end_time = parse_datetime(last_sensor_timestamp)

    if sensor_start_time and sensor_end_time:
        seconds = int((sensor_end_time - sensor_start_time).total_seconds())
        return max(seconds, 0)

    start_time = parse_datetime(session.start_time)
    end_time = parse_datetime(session.end_time)

    if not start_time or not end_time:
        return None

    seconds = int((end_time - start_time).total_seconds())
    return max(seconds, 0)


def calculate_sensor_brewed_seconds(db: Session, session_id: int) -> int | None:
    rows = (
        db.query(SensorData.timestamp)
        .filter(SensorData.session_id == session_id, SensorData.timestamp.like("%T%"))
        .order_by(SensorData.id.desc())
        .limit(120)
        .all()
    )
    timestamps = [parse_datetime(row[0]) for row in rows]
    timestamps = [timestamp for timestamp in timestamps if timestamp is not None]

    if len(timestamps) < 2:
        return None

    latest_time = timestamps[0]
    earliest_time = latest_time

    for timestamp in timestamps[1:]:
        if earliest_time - timestamp > timedelta(minutes=10):
            break
        earliest_time = timestamp

    seconds = int((latest_time - earliest_time).total_seconds())
    return max(seconds, 0)


def format_duration(seconds: int | None) -> str | None:
    if seconds is None:
        return None

    minutes = seconds // 60
    remaining_seconds = seconds % 60
    return f"{minutes}:{remaining_seconds:02d}"


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


@router.get("/review", response_model=List[BrewingSessionReviewResponse])
def get_review_sessions(
    favorite_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sessions = (
        db.query(BrewingSession)
        .filter(
            BrewingSession.user_id == current_user.id,
            BrewingSession.status == "completed",
        )
        .order_by(BrewingSession.end_time.desc().nullslast(), BrewingSession.start_time.desc())
        .all()
    )

    if favorite_only:
        sessions = [session for session in sessions if session.is_favorite]

    reviews: List[BrewingSessionReviewResponse] = []
    for session in sessions:
        review = build_review_response(db, session)
        if review:
            reviews.append(review)

    return reviews


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


@router.patch("/{session_id}/review", response_model=BrewingSessionReviewResponse)
def update_review_session(
    session_id: int,
    review_update: BrewingSessionReviewUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_session = (
        db.query(BrewingSession)
        .filter(
            BrewingSession.id == session_id,
            BrewingSession.user_id == current_user.id,
            BrewingSession.status == "completed",
        )
        .first()
    )
    if not db_session:
        raise HTTPException(status_code=404, detail="Completed brewing session not found")

    data = review_update.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(db_session, key, value)

    db.commit()
    db.refresh(db_session)

    review = build_review_response(db, db_session)
    if not review:
        raise HTTPException(status_code=404, detail="Recipe for brewing session not found")
    return review


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

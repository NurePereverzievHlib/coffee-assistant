from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.db.database import SessionLocal
from app.models.brewing_session import BrewingSession
from app.schemas.brewing_session import BrewingSessionCreate, BrewingSessionUpdate, BrewingSessionResponse

router = APIRouter(
    prefix="/sessions",
    tags=["BrewingSessions"]
)

# GET /sessions/ - всі сесії
@router.get("/", response_model=List[BrewingSessionResponse])
def get_sessions():
    db: Session = SessionLocal()
    sessions = db.query(BrewingSession).all()
    return sessions

# GET /sessions/{id} - конкретна сесія
@router.get("/{session_id}", response_model=BrewingSessionResponse)
def get_session(session_id: int):
    db: Session = SessionLocal()
    session = db.query(BrewingSession).filter(BrewingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Brewing session not found")
    return session

# POST /sessions/ - створити нову сесію
@router.post("/", response_model=BrewingSessionResponse)
def create_session(session: BrewingSessionCreate):
    db: Session = SessionLocal()
    db_session = BrewingSession(
        user_id=session.user_id,
        recipe_id=session.recipe_id,
        start_time=datetime.utcnow(),
        current_step=0,
        status="in_progress"
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

# PATCH /sessions/{id} - оновити статус або поточний крок
@router.patch("/{session_id}", response_model=BrewingSessionResponse)
def update_session(session_id: int, session_update: BrewingSessionUpdate):
    db: Session = SessionLocal()
    db_session = db.query(BrewingSession).filter(BrewingSession.id == session_id).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Brewing session not found")

    data = session_update.model_dump(exclude_unset=True)  # Pydantic v2
    for key, value in data.items():
        setattr(db_session, key, value)

    # Якщо статус став completed — ставимо end_time
    if "status" in data and data["status"] == "completed":
        db_session.end_time = datetime.utcnow()

    db.commit()
    db.refresh(db_session)
    return db_session

# DELETE /sessions/{id} - видалити сесію
@router.delete("/{session_id}")
def delete_session(session_id: int):
    db: Session = SessionLocal()
    db_session = db.query(BrewingSession).filter(BrewingSession.id == session_id).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Brewing session not found")
    db.delete(db_session)
    db.commit()
    return {"detail": "Brewing session deleted"}
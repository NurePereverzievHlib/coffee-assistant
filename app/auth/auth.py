import os
import re
import secrets

from fastapi import APIRouter, HTTPException, Depends
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.user import User
from app.schemas.user import GoogleLogin, UserCreate, UserLogin, UserResponse
from app.auth.utils import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Auth"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_token_for_user(user: User):
    access_token = create_access_token({"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

def normalize_username(value: str) -> str:
    username = re.sub(r"[^a-zA-Z0-9_]", "_", value).strip("_").lower()
    return username[:50] if len(username) >= 3 else f"user_{secrets.token_hex(3)}"

def unique_username(db: Session, email: str, google_name: str | None = None) -> str:
    base = normalize_username(google_name or email.split("@", 1)[0])
    username = base
    suffix = 1

    while db.query(User).filter(User.username == username).first():
        suffix += 1
        trimmed_base = base[: 50 - len(str(suffix)) - 1]
        username = f"{trimmed_base}_{suffix}"

    return username

def google_client_ids() -> list[str]:
    raw_ids = os.getenv("GOOGLE_CLIENT_IDS") or os.getenv("GOOGLE_CLIENT_ID") or ""
    return [client_id.strip() for client_id in raw_ids.split(",") if client_id.strip()]

@router.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    
    db_user = User(
        username=user.username,
        email=user.email,
        hashed_password=hash_password(user.password)  # <- правильно
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return create_token_for_user(db_user)

@router.post("/google")
def google_login(payload: GoogleLogin, db: Session = Depends(get_db)):
    allowed_client_ids = google_client_ids()
    if not allowed_client_ids:
        raise HTTPException(status_code=500, detail="Google client ID is not configured")

    try:
        idinfo = google_id_token.verify_oauth2_token(
            payload.id_token,
            google_requests.Request()
        )
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    if idinfo.get("aud") not in allowed_client_ids:
        raise HTTPException(status_code=401, detail="Invalid Google token audience")

    email = idinfo.get("email")
    email_verified = idinfo.get("email_verified")
    if not email or not email_verified:
        raise HTTPException(status_code=401, detail="Google email is not verified")

    db_user = db.query(User).filter(User.email == email).first()
    if not db_user:
        db_user = User(
            username=unique_username(db, email, idinfo.get("name")),
            email=email,
            hashed_password=hash_password(secrets.token_urlsafe(32))
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)

    return create_token_for_user(db_user)

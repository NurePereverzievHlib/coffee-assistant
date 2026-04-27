from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    created_recipes = relationship("Recipe", back_populates="creator")
    user_recipes = relationship("UserRecipe", back_populates="user", cascade="all, delete-orphan")
    brewing_sessions = relationship("BrewingSession", back_populates="user", cascade="all, delete-orphan")

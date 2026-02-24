from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.db.database import Base
from datetime import datetime

class BrewingSession(Base):
    __tablename__ = "brewing_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    recipe_id = Column(Integer, ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False)
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    current_step = Column(Integer, default=0)
    status = Column(String, default="in_progress")  # in_progress, completed

    sensor_logs = relationship(
        "SensorData",
        back_populates="session",
        cascade="all, delete-orphan"
    )
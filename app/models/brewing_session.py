from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class BrewingSession(Base):
    __tablename__ = "brewing_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    recipe_id = Column(Integer, ForeignKey("recipes.id"))
    start_time = Column(String)
    end_time = Column(String)
    current_step = Column(Integer, default=0)
    status = Column(String, default="in_progress")  # in_progress, completed

    sensor_logs = relationship("SensorData", back_populates="session", cascade="all, delete-orphan")

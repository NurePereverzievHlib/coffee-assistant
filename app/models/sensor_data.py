from sqlalchemy import Column, Integer, Float, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base

class SensorData(Base):
    __tablename__ = "sensor_data"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("brewing_sessions.id"))
    timestamp = Column(String)  # ISO timestamp
    weight = Column(Float, nullable=False)
    pour_rate = Column(Float)  # мл/с

    session = relationship("BrewingSession", back_populates="sensor_logs")
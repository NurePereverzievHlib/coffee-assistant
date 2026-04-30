from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.db.database import Base


class Scale(Base):
    __tablename__ = "scales"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False, default="Coffee scale")
    device_token = Column(String, unique=True, index=True, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    last_seen_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="scales")
    brewing_sessions = relationship("BrewingSession", back_populates="scale")

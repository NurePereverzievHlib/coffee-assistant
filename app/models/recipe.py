from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from .step import Step

class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    coffee_bean_id = Column(Integer, ForeignKey("coffee_beans.id"), nullable=False)
    coffee_grams = Column(Float, nullable=False)
    water_temp = Column(Float, nullable=False)
    grind_level = Column(Float, nullable=False)
    total_time = Column(String, nullable=False)

    steps = relationship("Step", back_populates="recipe", cascade="all, delete-orphan")

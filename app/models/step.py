from sqlalchemy import Column, Integer, Float, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Step(Base):
    __tablename__ = "recipe_steps"

    id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id"))
    step_number = Column(Integer, nullable=False)
    start_time = Column(String, nullable=False)  # "MM:SS"
    water_volume = Column(Float, nullable=False)  # мл

    recipe = relationship("Recipe", back_populates="steps")

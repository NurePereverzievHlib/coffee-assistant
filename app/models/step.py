from sqlalchemy import Column, Integer, Float, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base

class Step(Base):
    __tablename__ = "recipe_steps"

    id = Column(Integer, primary_key=True, index=True)

    recipe_id = Column(
        Integer,
        ForeignKey("recipes.id", ondelete="CASCADE"),
        nullable=False
    )

    step_number = Column(Integer, nullable=False)

    start_time = Column(Integer, nullable=False)  # seconds from start

    water_volume = Column(Float, nullable=False)

    recipe = relationship("Recipe", back_populates="steps")

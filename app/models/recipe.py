from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base
from .step import Step

class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    coffee_bean_id = Column(Integer, ForeignKey("coffee_beans.id"), nullable=True)
    coffee_grams = Column(Float, nullable=False)
    water_temp = Column(Float, nullable=False)
    grind_level = Column(Float, nullable=False)
    total_time = Column(String, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    brew_method = Column(String, nullable=False)

    steps = relationship("Step", back_populates="recipe", cascade="all, delete-orphan")
    coffee_bean = relationship("CoffeeBean", back_populates="recipes")
    creator = relationship("User", back_populates="created_recipes")
    user_recipes = relationship("UserRecipe", back_populates="recipe", cascade="all, delete-orphan")
    brewing_sessions = relationship("BrewingSession", back_populates="recipe", cascade="all, delete-orphan")

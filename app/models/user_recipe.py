from sqlalchemy import Column, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.database import Base


class UserRecipe(Base):
    __tablename__ = "user_recipes"
    __table_args__ = (UniqueConstraint("user_id", "recipe_id", name="uq_user_recipe"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    recipe_id = Column(Integer, ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False)

    user = relationship("User", back_populates="user_recipes")
    recipe = relationship("Recipe", back_populates="user_recipes")

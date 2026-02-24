from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

# Базова схема (тільки потрібні для створення/оновлення поля)
class BrewingSessionBase(BaseModel):
    user_id: int = Field(..., description="ID користувача")
    recipe_id: int = Field(..., description="ID рецепту")
    current_step: Optional[int] = Field(0, ge=0, description="Поточний крок рецепту")
    status: Optional[str] = Field("in_progress", description="Статус сесії: in_progress, completed")

    model_config = {"from_attributes": True}

# Схема для створення нової сесії
class BrewingSessionCreate(BrewingSessionBase):
    pass

# Схема для оновлення існуючої сесії (усі поля опційні)
class BrewingSessionUpdate(BaseModel):
    current_step: Optional[int] = Field(None, ge=0)
    status: Optional[str] = Field(None)

    model_config = {"from_attributes": True}

# Схема відповіді з усіма полями
class BrewingSessionResponse(BrewingSessionBase):
    id: int
    start_time: datetime
    end_time: Optional[datetime] = None

    model_config = {"from_attributes": True}
from pydantic import BaseModel, Field
from typing import Optional

class StepBase(BaseModel):
    step_number: int = Field(..., gt=0, description="Номер кроку, має бути > 0")
    start_time: int = Field(..., ge=0, description="Час початку кроку у секундах від початку рецепту")
    water_volume: float = Field(..., gt=0, description="Об'єм води у мілілітрах для цього кроку")

    model_config = {"from_attributes": True}  # Pydantic v2

class StepCreate(StepBase):
    pass  # recipe_id не передаємо від клієнта

class StepUpdate(BaseModel):
    step_number: Optional[int] = Field(None, gt=0)
    start_time: Optional[int] = Field(None, ge=0)
    water_volume: Optional[float] = Field(None, gt=0)
    recipe_id: Optional[int] = None

    model_config = {"from_attributes": True}

class StepResponse(StepBase):
    id: int
    recipe_id: int

    model_config = {"from_attributes": True}
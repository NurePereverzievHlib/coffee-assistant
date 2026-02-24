from pydantic import BaseModel
from typing import List, Optional
from app.schemas.step import StepCreate, StepResponse

class RecipeBase(BaseModel):
    name: str
    coffee_bean_id: int
    coffee_grams: float
    water_temp: float
    grind_level: float
    total_time: str

    model_config = {"from_attributes": True}

class RecipeCreate(RecipeBase):
    steps: List[StepCreate] = []

class RecipeUpdate(BaseModel):
    name: Optional[str] = None
    coffee_bean_id: Optional[int] = None
    coffee_grams: Optional[float] = None
    water_temp: Optional[float] = None
    grind_level: Optional[float] = None
    total_time: Optional[str] = None
    steps: Optional[List[StepCreate]] = None

    model_config = {"from_attributes": True}

class RecipeResponse(RecipeBase):
    id: int
    steps: List[StepResponse] = []

    model_config = {"from_attributes": True}
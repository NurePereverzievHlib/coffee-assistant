from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class BrewingSessionCreate(BaseModel):
    recipe_id: int = Field(..., description="Recipe ID")
    scale_id: Optional[int] = Field(None, description="Scale ID")


class BrewingSessionUpdate(BaseModel):
    current_step: Optional[int] = Field(None, ge=0)
    status: Optional[str] = None

    model_config = {"from_attributes": True}


class BrewingSessionReviewUpdate(BaseModel):
    brew_description: Optional[str] = None
    rating: Optional[int] = Field(None, ge=1, le=5)
    review_text: Optional[str] = None
    is_favorite: Optional[bool] = None


class BrewingSessionResponse(BaseModel):
    id: int
    user_id: int
    recipe_id: int
    scale_id: Optional[int] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    current_step: int
    status: str
    brew_description: Optional[str] = None
    rating: Optional[int] = None
    review_text: Optional[str] = None
    is_favorite: bool = False

    model_config = {"from_attributes": True}


class BrewingSessionReviewResponse(BaseModel):
    id: int
    recipe_id: int
    recipe_name: str
    brew_method: str
    recipe_total_time: str
    brewed_time: Optional[str] = None
    brewed_seconds: Optional[int] = None
    water_temp: float
    coffee_grams: float
    start_time: datetime
    end_time: Optional[datetime] = None
    brew_description: Optional[str] = None
    rating: Optional[int] = None
    review_text: Optional[str] = None
    is_favorite: bool = False
    max_weight: Optional[float] = None
    latest_weight: Optional[float] = None
    max_pour_rate: Optional[float] = None

    model_config = {"from_attributes": True}

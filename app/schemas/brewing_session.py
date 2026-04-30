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


class BrewingSessionResponse(BaseModel):
    id: int
    user_id: int
    recipe_id: int
    scale_id: Optional[int] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    current_step: int
    status: str

    model_config = {"from_attributes": True}

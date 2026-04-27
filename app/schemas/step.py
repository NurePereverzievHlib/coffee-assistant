from pydantic import BaseModel, Field
from typing import Optional


class StepBase(BaseModel):
    step_number: int = Field(..., gt=0)
    start_time: int = Field(..., ge=0)
    water_volume: float = Field(..., ge=0)

    model_config = {"from_attributes": True}


class StepCreate(StepBase):
    pass


class StepUpdate(BaseModel):
    step_number: Optional[int] = Field(None, gt=0)
    start_time: Optional[int] = Field(None, ge=0)
    water_volume: Optional[float] = Field(None, ge=0)

    model_config = {"from_attributes": True}


class StepResponse(StepBase):
    id: int

    model_config = {"from_attributes": True}

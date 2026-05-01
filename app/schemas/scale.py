from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ScaleCreate(BaseModel):
    name: str = Field(default="Coffee scale", min_length=1, max_length=100)
    device_token: str = Field(..., min_length=8, max_length=128)


class ScaleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    is_active: Optional[bool] = None


class ScaleResponse(BaseModel):
    id: int
    user_id: int
    name: str
    device_token: str
    is_active: bool
    last_seen_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ScaleStatusResponse(BaseModel):
    connected: bool
    signal_strength: str
    scale_id: Optional[int] = None
    scale_name: Optional[str] = None
    latest_weight: Optional[float] = None
    latest_pour_rate: Optional[float] = None
    updated_at: Optional[str] = None

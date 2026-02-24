from pydantic import BaseModel, Field
from typing import Optional

class SensorDataBase(BaseModel):
    weight: float = Field(..., gt=0, description="Поточна вага в грамах")
    pour_rate: Optional[float] = Field(None, description="Швидкість наливу у мл/с")
    timestamp: Optional[str] = Field(None, description="ISO timestamp, якщо не вказано — буде поточний час")

    model_config = {"from_attributes": True}

class SensorDataCreate(SensorDataBase):
    session_id: int

class SensorDataResponse(SensorDataBase):
    id: int
    session_id: int

    model_config = {"from_attributes": True}
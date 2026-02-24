from pydantic import BaseModel

class StepCreate(BaseModel):
    step_number: int
    start_time: str  # формат "MM:SS"
    water_volume: float

    model_config = {
        "from_attributes": True  # Pydantic V2 замість orm_mode
    }

class StepResponse(StepCreate):
    id: int

    model_config = {
        "from_attributes": True
    }
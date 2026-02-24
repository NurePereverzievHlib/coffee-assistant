from pydantic import BaseModel, Field

from pydantic import BaseModel, Field
from typing import List, Optional

class CoffeeBeanBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    processing_type: str
    price: float = Field(..., gt=0)
    descriptors: Optional[List[str]] = []
    weight_in_grams: int = Field(..., gt=0, description="Grams per pack")
    stock: Optional[int] = 0

class CoffeeBeanCreate(CoffeeBeanBase):
    pass

class CoffeeBeanResponse(CoffeeBeanBase):
    id: int

    class Config:
        from_attributes = True
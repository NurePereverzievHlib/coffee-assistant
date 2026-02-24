from sqlalchemy import Column, Integer, String, Float, ARRAY
from app.db.database import Base

class CoffeeBean(Base):
    __tablename__ = "coffee_beans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    processing_type = Column(String, nullable=False)  # "washed", "natural", "anaerobic", "infuse", "thermal_shock"
    price = Column(Float, nullable=False)
    descriptors = Column(ARRAY(String)) 
    weight_in_grams = Column(Integer, nullable=False, default=250)
    stock = Column(Integer, default=0)

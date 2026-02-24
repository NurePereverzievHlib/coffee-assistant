from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.coffee_bean import CoffeeBean
from app.schemas.coffee_bean import CoffeeBeanCreate, CoffeeBeanResponse
from typing import List

router = APIRouter(
    prefix="/coffee-beans",
    tags=["Coffee Beans"]
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# GET ALL
@router.get("/", response_model=List[CoffeeBeanResponse])
def get_coffee_beans(db: Session = Depends(get_db)):
    return db.query(CoffeeBean).all()


# GET BY ID
@router.get("/{bean_id}", response_model=CoffeeBeanResponse)
def get_coffee_bean(bean_id: int, db: Session = Depends(get_db)):
    bean = db.query(CoffeeBean).filter(CoffeeBean.id == bean_id).first()
    if not bean:
        raise HTTPException(status_code=404, detail="Coffee bean not found")
    return bean


# POST
@router.post(
    "/",
    response_model=CoffeeBeanResponse,
    status_code=status.HTTP_201_CREATED
)
def create_coffee_bean(bean: CoffeeBeanCreate, db: Session = Depends(get_db)):
    new_bean = CoffeeBean(**bean.model_dump())
    db.add(new_bean)
    db.commit()
    db.refresh(new_bean)
    return new_bean


# DELETE
@router.delete("/{bean_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_coffee_bean(bean_id: int, db: Session = Depends(get_db)):
    bean = db.query(CoffeeBean).filter(CoffeeBean.id == bean_id).first()
    if not bean:
        raise HTTPException(status_code=404, detail="Coffee bean not found")

    db.delete(bean)
    db.commit()
    return

# PUT
@router.put("/{bean_id}", response_model=CoffeeBeanResponse)
def update_coffee_bean(bean_id: int, updated_data: CoffeeBeanCreate, db: Session = Depends(get_db)):
    bean = db.query(CoffeeBean).filter(CoffeeBean.id == bean_id).first()
    if not bean:
        raise HTTPException(status_code=404, detail="Coffee bean not found")

    for key, value in updated_data.model_dump().items():
        setattr(bean, key, value)

    db.commit()
    db.refresh(bean)
    return bean
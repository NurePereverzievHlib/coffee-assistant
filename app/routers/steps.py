from fastapi import APIRouter, HTTPException, Path
from sqlalchemy.orm import Session
from typing import List

from app.db.database import SessionLocal
from app.models.step import Step
from app.schemas.step import StepCreate, StepUpdate, StepResponse

router = APIRouter(
    prefix="/steps",
    tags=["Steps"]
)

# GET /steps/recipe/{recipe_id} - отримати всі кроки конкретного рецепту
@router.get("/recipe/{recipe_id}", response_model=List[StepResponse])
def get_steps_by_recipe(recipe_id: int):
    db: Session = SessionLocal()
    steps = db.query(Step).filter(Step.recipe_id == recipe_id).all()
    return steps

# POST /steps/ - створити новий крок
@router.post("/recipe/{recipe_id}", response_model=StepResponse)
def create_step(recipe_id: int = Path(..., description="ID рецепту"), step: StepCreate = None):
    db: Session = SessionLocal()

    # Створюємо Step і явно додаємо recipe_id
    new_step = Step(
        **step.model_dump(),  # дані step_number, start_time, water_volume
        recipe_id=recipe_id    # додаємо recipe_id
    )

    db.add(new_step)
    db.commit()
    db.refresh(new_step)
    return new_step

# PUT /steps/{step_id} - оновити крок
@router.put("/{step_id}", response_model=StepResponse)
def update_step(step_id: int, step: StepUpdate):
    db: Session = SessionLocal()
    db_step = db.query(Step).filter(Step.id == step_id).first()
    if not db_step:
        raise HTTPException(status_code=404, detail="Step not found")
    
    for key, value in step.model_dump(exclude_unset=True).items():
        setattr(db_step, key, value)
    
    db.commit()
    db.refresh(db_step)
    return db_step

# DELETE /steps/{step_id} - видалити крок
@router.delete("/{step_id}")
def delete_step(step_id: int):
    db: Session = SessionLocal()
    db_step = db.query(Step).filter(Step.id == step_id).first()
    if not db_step:
        raise HTTPException(status_code=404, detail="Step not found")
    
    db.delete(db_step)
    db.commit()
    return {"detail": "Step deleted"}
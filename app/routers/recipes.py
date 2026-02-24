from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.recipe import Recipe
from app.models.step import Step
from app.models.coffee_bean import CoffeeBean
from app.schemas.recipe import RecipeCreate, RecipeResponse, RecipeUpdate
from app.schemas.step import StepCreate

router = APIRouter(
    prefix="/recipes",
    tags=["Recipes"]
)

# GET /recipes
@router.get("/", response_model=list[RecipeResponse])
def get_recipes():
    db: Session = SessionLocal()
    recipes = db.query(Recipe).all()
    return recipes

# GET /recipes/{id}
@router.get("/{recipe_id}", response_model=RecipeResponse)
def get_recipe(recipe_id: int):
    db: Session = SessionLocal()
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe

# POST /recipes
@router.post("/", response_model=RecipeResponse)
def create_recipe(recipe: RecipeCreate):
    db: Session = SessionLocal()

    # Перевірка, чи існує CoffeeBean
    bean = db.query(CoffeeBean).filter(CoffeeBean.id == recipe.coffee_bean_id).first()
    if not bean:
        raise HTTPException(status_code=400, detail="CoffeeBean not found")

    # Створюємо Recipe
    db_recipe = Recipe(
        name=recipe.name,
        coffee_bean_id=recipe.coffee_bean_id,
        coffee_grams=recipe.coffee_grams,
        water_temp=recipe.water_temp,
        grind_level=recipe.grind_level,
        total_time=recipe.total_time
    )
    db.add(db_recipe)
    db.commit()
    db.refresh(db_recipe)

    # Додаємо кроки
    for step in recipe.steps:
        db_step = Step(
            step_number=step.step_number,
            start_time=step.start_time,
            water_volume=step.water_volume,
            recipe_id=db_recipe.id
        )
        db.add(db_step)
    db.commit()
    db.refresh(db_recipe)

    return db_recipe

# PATCH /recipes/{id}
@router.patch("/{recipe_id}", response_model=RecipeResponse)
def update_recipe(recipe_id: int, recipe: RecipeUpdate):
    db: Session = SessionLocal()
    db_recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not db_recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    data = recipe.model_dump(exclude_unset=True)  # Pydantic V2

    # Перевірка coffee_bean_id
    if "coffee_bean_id" in data:
        bean = db.query(CoffeeBean).filter(CoffeeBean.id == data["coffee_bean_id"]).first()
        if not bean:
            raise HTTPException(status_code=400, detail="CoffeeBean not found")

    # Оновлюємо поля Recipe
    for key, value in data.items():
        if key != "steps":
            setattr(db_recipe, key, value)

    # Оновлюємо кроки
    if "steps" in data:
        db.query(Step).filter(Step.recipe_id == recipe_id).delete()
        for step in data["steps"]:
            db_step = Step(
                step_number=step.step_number,
                start_time=step.start_time,
                water_volume=step.water_volume,
                recipe_id=recipe_id
            )
            db.add(db_step)

    db.commit()
    db.refresh(db_recipe)
    return db_recipe

# DELETE /recipes/{id}
@router.delete("/{recipe_id}")
def delete_recipe(recipe_id: int):
    db: Session = SessionLocal()
    db_recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not db_recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    db.delete(db_recipe)
    db.commit()
    return {"detail": "Recipe deleted"}
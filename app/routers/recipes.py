from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, get_db
from app.models.coffee_bean import CoffeeBean
from app.models.recipe import Recipe
from app.models.step import Step
from app.models.user import User
from app.schemas.recipe import RecipeCreate, RecipeResponse, RecipeUpdate
from app.services.default_recipes import assign_default_recipes


router = APIRouter(prefix="/recipes", tags=["Recipes"])


def user_recipe_access_exists(db: Session, user_id: int, recipe_id: int) -> bool:
    return bool(
        db.execute(
            text(
                """
                SELECT 1
                FROM recipes
                WHERE id = :recipe_id
                  AND (
                    created_by = :user_id
                    OR id IN (
                      SELECT recipe_id
                      FROM user_recipes
                      WHERE user_id = :user_id
                    )
                  )
                """
            ),
            {"recipe_id": recipe_id, "user_id": user_id},
        ).first()
    )


def serialize_recipe_rows(db: Session, recipe_rows: list[dict]) -> list[dict]:
    recipe_ids = [recipe["id"] for recipe in recipe_rows]
    if not recipe_ids:
        return []

    step_rows = (
        db.query(Step)
        .filter(Step.recipe_id.in_(recipe_ids))
        .order_by(Step.recipe_id, Step.step_number)
        .all()
    )

    steps_by_recipe: dict[int, list[dict]] = {recipe_id: [] for recipe_id in recipe_ids}
    for step in step_rows:
        steps_by_recipe[step.recipe_id].append(
            {
                "id": step.id,
                "step_number": step.step_number,
                "step_type": step.step_type,
                "start_time": step.start_time,
                "water_volume": step.water_volume,
            }
        )

    return [
        {
            **recipe,
            "steps": steps_by_recipe.get(recipe["id"], []),
        }
        for recipe in recipe_rows
    ]


@router.get("/", response_model=list[RecipeResponse])
def get_recipes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    assign_default_recipes(db, current_user.id)
    db.commit()

    recipe_rows = db.execute(
        text(
            """
            SELECT DISTINCT
                r.id,
                r.name,
                r.description,
                COALESCE(r.brew_method, 'Hario V-60') AS brew_method,
                r.created_by,
                r.coffee_bean_id,
                r.coffee_grams,
                r.water_temp,
                r.grind_level,
                r.total_time,
                cb.name AS coffee_name,
                cb.image AS coffee_image
            FROM recipes r
            LEFT JOIN user_recipes ur
                ON r.id = ur.recipe_id AND ur.user_id = :user_id
            LEFT JOIN coffee_beans cb
                ON r.coffee_bean_id = cb.id
            WHERE
                ur.user_id IS NOT NULL
                OR r.created_by = :user_id
            ORDER BY r.id
            """
        ),
        {"user_id": current_user.id},
    ).mappings().all()

    return serialize_recipe_rows(db, [dict(recipe) for recipe in recipe_rows])


@router.get("/{recipe_id}", response_model=RecipeResponse)
def get_recipe(
    recipe_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    recipe_rows = db.execute(
        text(
            """
            SELECT
                r.id,
                r.name,
                r.description,
                COALESCE(r.brew_method, 'Hario V-60') AS brew_method,
                r.created_by,
                r.coffee_bean_id,
                r.coffee_grams,
                r.water_temp,
                r.grind_level,
                r.total_time,
                cb.name AS coffee_name,
                cb.image AS coffee_image
            FROM recipes r
            LEFT JOIN coffee_beans cb
                ON r.coffee_bean_id = cb.id
            WHERE r.id = :recipe_id
              AND (
                r.created_by = :user_id
                OR r.id IN (
                  SELECT recipe_id
                  FROM user_recipes
                  WHERE user_id = :user_id
                )
              )
            """
        ),
        {"recipe_id": recipe_id, "user_id": current_user.id},
    ).mappings().all()

    recipes = serialize_recipe_rows(db, [dict(recipe) for recipe in recipe_rows])
    if not recipes:
        raise HTTPException(status_code=404, detail="Recipe not found")

    return recipes[0]


@router.post("/", response_model=RecipeResponse)
def create_recipe(
    recipe: RecipeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if recipe.coffee_bean_id is not None:
        bean = db.query(CoffeeBean).filter(CoffeeBean.id == recipe.coffee_bean_id).first()
        if not bean:
            raise HTTPException(status_code=400, detail="CoffeeBean not found")

    db_recipe = Recipe(
        name=recipe.name,
        description=recipe.description,
        brew_method=recipe.brew_method,
        coffee_bean_id=recipe.coffee_bean_id,
        coffee_grams=recipe.coffee_grams,
        water_temp=recipe.water_temp,
        grind_level=recipe.grind_level,
        total_time=recipe.total_time,
        created_by=current_user.id,
    )
    db.add(db_recipe)
    db.flush()

    for step in recipe.steps:
        db.add(
            Step(
                step_number=step.step_number,
                step_type=step.step_type,
                start_time=step.start_time,
                water_volume=step.water_volume,
                recipe_id=db_recipe.id,
            )
        )

    db.execute(
        text(
            """
            INSERT INTO user_recipes (user_id, recipe_id)
            VALUES (:user_id, :recipe_id)
            ON CONFLICT (user_id, recipe_id) DO NOTHING
            """
        ),
        {"user_id": current_user.id, "recipe_id": db_recipe.id},
    )
    db.commit()

    return get_recipe(db_recipe.id, current_user, db)


@router.patch("/{recipe_id}", response_model=RecipeResponse)
def update_recipe(
    recipe_id: int,
    recipe: RecipeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_recipe = (
        db.query(Recipe)
        .filter(Recipe.id == recipe_id, Recipe.created_by == current_user.id)
        .first()
    )
    if not db_recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    data = recipe.model_dump(exclude_unset=True)

    if "coffee_bean_id" in data and data["coffee_bean_id"] is not None:
        bean = db.query(CoffeeBean).filter(CoffeeBean.id == data["coffee_bean_id"]).first()
        if not bean:
            raise HTTPException(status_code=400, detail="CoffeeBean not found")

    for key, value in data.items():
        if key not in {"steps", "description"}:
            setattr(db_recipe, key, value)

    if "description" in data:
        db_recipe.description = data["description"]

    if "steps" in data and data["steps"] is not None:
        db.query(Step).filter(Step.recipe_id == recipe_id).delete()
        for step in data["steps"]:
            db.add(
                Step(
                    step_number=step["step_number"],
                    step_type=step.get("step_type") or "Лити",
                    start_time=step["start_time"],
                    water_volume=step["water_volume"],
                    recipe_id=recipe_id,
                )
            )

    db.commit()
    return get_recipe(recipe_id, current_user, db)


@router.delete("/{recipe_id}")
def delete_recipe(
    recipe_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_recipe = (
        db.query(Recipe)
        .filter(Recipe.id == recipe_id, Recipe.created_by == current_user.id)
        .first()
    )
    if not db_recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    db.delete(db_recipe)
    db.commit()
    return {"detail": "Recipe deleted"}

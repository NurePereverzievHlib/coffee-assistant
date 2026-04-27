from sqlalchemy import text
from sqlalchemy.orm import Session


def assign_default_recipes(db: Session, user_id: int) -> None:
    db.execute(
        text(
            """
            INSERT INTO user_recipes (user_id, recipe_id)
            SELECT :user_id, id
            FROM recipes
            WHERE created_by IS NULL
              AND coffee_bean_id IS NULL
            ORDER BY id
            LIMIT 5
            ON CONFLICT (user_id, recipe_id) DO NOTHING
            """
        ),
        {"user_id": user_id},
    )

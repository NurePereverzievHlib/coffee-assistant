from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def ensure_user_avatar_column(engine: Engine) -> None:
    inspector = inspect(engine)
    user_columns = {column["name"] for column in inspector.get_columns("users")}

    if "avatar_url" in user_columns:
        return

    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE users ADD COLUMN avatar_url VARCHAR"))


def ensure_recipe_details_columns(engine: Engine) -> None:
    inspector = inspect(engine)
    recipe_columns = {column["name"] for column in inspector.get_columns("recipes")}
    step_columns = {column["name"] for column in inspector.get_columns("recipe_steps")}

    with engine.begin() as connection:
        if "description" not in recipe_columns:
            connection.execute(text("ALTER TABLE recipes ADD COLUMN description VARCHAR"))

        if "step_type" not in step_columns:
            connection.execute(text("ALTER TABLE recipe_steps ADD COLUMN step_type VARCHAR NOT NULL DEFAULT 'Лити'"))

def ensure_brewing_session_scale_column(engine: Engine) -> None:
    inspector = inspect(engine)
    session_columns = {column["name"] for column in inspector.get_columns("brewing_sessions")}

    if "scale_id" in session_columns:
        return

    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE brewing_sessions ADD COLUMN scale_id INTEGER"))
        connection.execute(
            text(
                """
                ALTER TABLE brewing_sessions
                ADD CONSTRAINT brewing_sessions_scale_id_fkey
                FOREIGN KEY (scale_id) REFERENCES scales(id) ON DELETE SET NULL
                """
            )
        )


def ensure_brewing_session_review_columns(engine: Engine) -> None:
    inspector = inspect(engine)
    session_columns = {column["name"] for column in inspector.get_columns("brewing_sessions")}

    with engine.begin() as connection:
        if "brew_description" not in session_columns:
            connection.execute(text("ALTER TABLE brewing_sessions ADD COLUMN brew_description VARCHAR"))

        if "rating" not in session_columns:
            connection.execute(text("ALTER TABLE brewing_sessions ADD COLUMN rating INTEGER"))

        if "review_text" not in session_columns:
            connection.execute(text("ALTER TABLE brewing_sessions ADD COLUMN review_text VARCHAR"))

        if "is_favorite" not in session_columns:
            connection.execute(text("ALTER TABLE brewing_sessions ADD COLUMN is_favorite BOOLEAN NOT NULL DEFAULT FALSE"))

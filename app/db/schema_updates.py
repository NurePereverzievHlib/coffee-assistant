from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def ensure_user_avatar_column(engine: Engine) -> None:
    inspector = inspect(engine)
    user_columns = {column["name"] for column in inspector.get_columns("users")}

    if "avatar_url" in user_columns:
        return

    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE users ADD COLUMN avatar_url VARCHAR"))

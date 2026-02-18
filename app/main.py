from fastapi import FastAPI
from app.database import engine, Base

# імпорт моделей, щоб SQLAlchemy створив таблиці
from app.models import coffee_bean, recipe, step, user, brewing_session, sensor_data

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Coffee Brew Assistant API")

@app.get("/")
def root():
    return {"message": "Coffee Brew Assistant API is running"}

from fastapi import FastAPI
from app.db.database import engine, Base
from fastapi import FastAPI
from app.routers import coffee_beans, recipes, steps

from app.models import coffee_bean, recipe, step, user, brewing_session, sensor_data

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Coffee Brew Assistant API")

@app.get("/")
def root():
    return {"message": "Coffee Brew Assistant API is running"}

app.include_router(coffee_beans.router)
app.include_router(recipes.router)
app.include_router(steps.router)

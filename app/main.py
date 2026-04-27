from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import engine, Base
from app.db.schema_updates import ensure_recipe_details_columns, ensure_user_avatar_column

from app.routers import coffee_beans, recipes, steps, brewing_sessions, sensor_data_route
from app.auth.auth import router as auth_router  

from app.models import coffee_bean, recipe, step, user, user_recipe, brewing_session, sensor_data

Base.metadata.create_all(bind=engine)
ensure_user_avatar_column(engine)
ensure_recipe_details_columns(engine)

app = FastAPI(title="Coffee Brew Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",
        "http://localhost:8082",
        "http://127.0.0.1:8081",
        "http://127.0.0.1:8082",
        "http://192.168.0.100:8081",
        "http://192.168.0.100:8082",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Coffee Brew Assistant API is running"}

app.include_router(auth_router)            
app.include_router(coffee_beans.router)
app.include_router(recipes.router)
app.include_router(steps.router)
app.include_router(brewing_sessions.router)
app.include_router(sensor_data_route.router)

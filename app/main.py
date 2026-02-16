from fastapi import FastAPI
from app.routes import router

app = FastAPI(title="Coffee Brewing Assistant API")

app.include_router(router)

@app.get("/")
def root():
    return {"message": "Coffee API is running"}

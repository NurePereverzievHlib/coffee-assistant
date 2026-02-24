from app.db.database import engine
from app.db.database import Base

# ІМПОРТУЄМО ВСІ МОДЕЛІ !!!
from app.models import coffee_bean
from app.models import recipe

Base.metadata.create_all(bind=engine)

print("Tables created successfully")
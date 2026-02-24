import os
import urllib.parse
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.engine import make_url
from dotenv import load_dotenv

load_dotenv()

def get_engine():
    raw_url = os.getenv("DATABASE_URL")
    
    if not raw_url:
        raise ValueError("DATABASE_URL не знайдено в .env файлі")

    try:
        url_obj = make_url(raw_url)
        
        engine = create_engine(
            url_obj,
            client_encoding='utf8',
            echo=False
        )
        return engine
    except Exception as e:
        print(f"❌ Помилка конфігурації URL: {e}")
        raise

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
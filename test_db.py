import os
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from dotenv import load_dotenv

# Знаходимо шлях до папки, де лежить цей скрипт
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
dotenv_path = os.path.join(BASE_DIR, ".env")

# Завантажуємо .env явно за шляхом
load_dotenv(dotenv_path)

def test_connection():
    db_url = os.getenv("DATABASE_URL")
    
    if not db_url:
        print(f"❌ DATABASE_URL не знайдено за шляхом: {dotenv_path}")
        return

    print(f"✅ URL знайдено. Спроба підключення...")

    try:
        # Додаємо параметри для усунення помилки кодування (0xd4)
        engine = create_engine(
            db_url,
            connect_args={'options': '-c lc_messages=en_US.UTF-8'}
        )
        
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
            print("🚀 УСПІХ! Ви підключилися до PostgreSQL.")
            
    except Exception as e:
        print("❌ ПОМИЛКА:")
        # Тепер тут буде текст помилки англійською без проблем з UTF-8
        print(e)

if __name__ == "__main__":
    test_connection()
import os
from pydantic_settings import BaseSettings
import asyncpg

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://user:password@host/dbname")

settings = Settings()

async def get_db_connection():
    return await asyncpg.connect(settings.DATABASE_URL)
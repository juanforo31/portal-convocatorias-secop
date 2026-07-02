from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    DATABASE_URL: str = "sqlite:///./portal.db"
    SECOP_BASE_URL: str = "https://www.datos.gov.co/resource/p6dx-8zbt.json"
    SECOP_TIMEOUT: int = 15
    SECOP_CACHE_TTL: int = 60

    class Config:
        env_file = ".env"

settings = Settings()
from pydantic_settings import BaseSettings
from functools import lru_cache


DISCLAIMER_TEXT = (
    "IMPORTANT DISCLAIMER: These projections and all information presented are "
    "hypothetical, based purely on historical data and statistical models. They "
    "do not constitute investment advice, guarantees of future performance, or "
    "financial recommendations of any kind. Past performance is not indicative "
    "of future results. All investments involve risk, including the possible loss "
    "of principal. This tool is for educational and informational purposes only "
    "and is not intended as financial advice. Please consult a qualified financial "
    "advisor before making any investment decisions."
)


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "sqlite:///./fund_tracker.db"

    # Cache
    REDIS_URL: str | None = None
    CACHE_TTL_HOURS: int = 24
    NEWS_CACHE_TTL_HOURS: int = 6

    # External APIs
    NEWSAPI_KEY: str | None = None
    OPENFIGI_API_KEY: str | None = None
    OPENAI_API_KEY: str | None = None

    # App behaviour
    DEMO_MODE: bool = False
    MAX_CSV_SIZE_MB: int = 10
    LOG_LEVEL: str = "INFO"

    # CORS
    FRONTEND_URL: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()

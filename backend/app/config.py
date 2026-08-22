from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "SoulCare"
    demo_mode: bool = True
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db: str = "soulcare"
    jwt_secret: str = "change-me-to-a-long-random-string"
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 72
    admin_token: str = "soulcare-admin-demo"
    gemini_api_key: str = ""
    gemini_models: str = "gemini-2.0-flash,gemini-1.5-flash,gemini-2.0-flash-lite"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    port: int = 8000
    rate_limit_per_min: int = 30

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def gemini_model_list(self) -> list[str]:
        return [m.strip() for m in self.gemini_models.split(",") if m.strip()]

    @property
    def use_mock_ai(self) -> bool:
        return self.demo_mode or not self.gemini_api_key


@lru_cache
def get_settings() -> Settings:
    return Settings()

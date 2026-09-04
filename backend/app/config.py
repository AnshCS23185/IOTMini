import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost/paneliq")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "1234")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    
    OPEN_METEO_URL: str = os.getenv("OPEN_METEO_URL", "https://api.open-meteo.com/v1/forecast")
    PVGIS_URL: str = os.getenv("PVGIS_URL", "https://re.jrc.ec.europa.eu/api/v5_2/PVcalc")
    
    OFFLINE_TIMEOUT_MINUTES: int = 5
    WEATHER_CLOUD_THRESHOLD: float = 70.0
    WEATHER_PRECIP_THRESHOLD: float = 0.0
    LDR_REDUCTION_THRESHOLD: float = 0.70
    LDR_BASELINE_SAMPLE_SIZE: int = 10
    THERMAL_TEMP_THRESHOLD: float = 40.0
    FAULT_CONFIRMATION_COUNT: int = 3
    
    # SMTP Config
    SMTP_HOST: str | None = None
    SMTP_PORT: int | None = 587
    SMTP_USER: str | None = None
    SMTP_USERNAME: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_TLS: bool = True
    EMAILS_FROM_EMAIL: str | None = None
    EMAILS_FROM_NAME: str | None = "PanelIQ"
    FROM_EMAIL: str | None = None
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

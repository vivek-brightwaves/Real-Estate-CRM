from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Real Estate CRM"
    API_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"

    # CORS - stored as comma-separated string, parsed in main.py
    BACKEND_CORS_ORIGINS: str = ""

    # Database
    DATABASE_URL: str
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_RECYCLE_SECONDS: int = 1800

    # Auth
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # API platform
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_REQUESTS: int = 120
    RATE_LIMIT_WINDOW_SECONDS: int = 60
    RATE_LIMIT_AUTH_REQUESTS: int = 10
    TRUSTED_HOSTS: str = "*"
    LOG_LEVEL: str = "INFO"
    DEFAULT_BROKER_COMMISSION_PERCENT: float = 2.0

    # Scheduler
    SCHEDULER_ENABLED: bool = True
    SCHEDULER_TIMEZONE: str = "Asia/Kolkata"
    SCHEDULER_MAX_WORKERS: int = 10
    SCHEDULER_JOB_MAX_RETRIES: int = 3
    SCHEDULER_RETRY_DELAY_SECONDS: int = 60
    SCHEDULER_MISFIRE_GRACE_SECONDS: int = 300
    SCHEDULER_LOCK_TIMEOUT_MINUTES: int = 60
    SCHEDULER_DEDUPLICATION_SECONDS: int = 45
    APPROVAL_ESCALATION_HOURS: int = 24
    TOKEN_RETENTION_DAYS: int = 7
    LOG_RETENTION_DAYS: int = 365
    NOTIFICATION_ARCHIVE_DAYS: int = 90
    NOTIFICATION_RETRY_BATCH_SIZE: int = 100
    NOTIFICATION_MAX_RETRIES: int = 5

    @model_validator(mode="after")
    def validate_production_security(self):
        if self.ENVIRONMENT.lower() not in {"production", "prod"}:
            return self
        if len(self.SECRET_KEY.encode("utf-8")) < 32:
            raise ValueError(
                "SECRET_KEY must contain at least 32 UTF-8 bytes in production"
            )
        if not self.DATABASE_URL.startswith(
            ("mysql+pymysql://", "mysql+mysqldb://")
        ):
            raise ValueError("Production DATABASE_URL must use MySQL")
        if self.TRUSTED_HOSTS.strip() in {"", "*"}:
            raise ValueError(
                "TRUSTED_HOSTS must be explicitly configured in production"
            )
        if "*" in {
            origin.strip()
            for origin in self.BACKEND_CORS_ORIGINS.split(",")
        }:
            raise ValueError(
                "Wildcard CORS origins are not allowed in production"
            )
        return self

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()

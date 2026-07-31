from datetime import UTC, date, datetime
from zoneinfo import ZoneInfo


def utcnow() -> datetime:
    """UTC as a naive datetime for the project's existing DB column contract."""
    return datetime.now(UTC).replace(tzinfo=None)


def today_in_timezone(timezone_name: str) -> date:
    return datetime.now(ZoneInfo(timezone_name)).date()

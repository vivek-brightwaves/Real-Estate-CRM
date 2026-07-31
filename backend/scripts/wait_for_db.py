"""Wait for the configured database to accept SQL connections."""

import os
import time

from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError


database_url = os.environ["DATABASE_URL"]
timeout_seconds = int(os.getenv("DATABASE_WAIT_TIMEOUT_SECONDS", "90"))
deadline = time.monotonic() + timeout_seconds
engine = create_engine(database_url, pool_pre_ping=True)

while True:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        print("Database is ready.")
        break
    except OperationalError:
        if time.monotonic() >= deadline:
            raise SystemExit(
                f"Database did not become ready within {timeout_seconds} seconds."
            )
        print("Waiting for database to accept connections...")
        time.sleep(2)

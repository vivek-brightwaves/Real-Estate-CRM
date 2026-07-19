FROM python:3.12-slim

WORKDIR /app

# Install system dependencies required for pymysql/cryptography if needed
RUN apt-get update && apt-get install -y default-libmysqlclient-dev pkg-config gcc && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# First seed the database, then run the app
CMD ["sh", "-c", "python scripts/seed_demo.py && uvicorn app.main:app --host 0.0.0.0 --port 8000"]

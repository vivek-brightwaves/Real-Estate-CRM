FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN addgroup --system crm && adduser --system --ingroup crm crm

COPY --chown=crm:crm . .
RUN mkdir -p /app/uploads && chown -R crm:crm /app/uploads

USER crm

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3)"

CMD ["sh", "-c", "python scripts/wait_for_db.py && alembic upgrade head && if [ -n \"${INITIAL_ADMIN_EMAIL:-}\" ]; then python scripts/seed_admin.py; fi && if [ \"${SEED_DEMO_DATA:-false}\" = \"true\" ]; then python scripts/seed_demo.py; fi && exec uvicorn app.main:app --host 0.0.0.0 --port 8000"]

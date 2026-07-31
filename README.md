# Real Estate CRM

A role-based CRM built with Next.js, FastAPI, SQLAlchemy, and MySQL 8.
PostgreSQL is not used by this project.

## Implemented modules

- Lead capture, assignment, status pipeline, notes, activities, search,
  duplicate handling, follow-ups, and site visits
- Customers, KYC, inventory, bookings, approvals, payments, and collections
- Tasks, internal messages, notifications, audit logs, reports, and scheduler
- Companies, branches, users, role-based access control, and scoped data access
- Rentals, possession, partner records, service tickets, and validated uploads

Payments are recorded manually; there is no payment-gateway integration.

## Docker quick start

Docker Compose is the recommended way to run a deployable stack.

1. Copy `deployment.env.example` to `.env`.
2. Replace every password, secret, hostname, CORS origin, and public API URL.
   Keep `DATABASE_URL` on the internal Docker hostname `mysql:3306`.
3. Validate and start the stack:

   ```bash
   docker compose config --quiet
   docker compose up -d --build
   docker compose ps
   ```

4. On a new, empty database, create the first administrator once:

   ```bash
   docker compose exec \
     -e INITIAL_ADMIN_EMAIL=admin@example.com \
     -e INITIAL_ADMIN_PASSWORD='Replace-With-A-Strong-Pass1!' \
     -e INITIAL_ADMIN_NAME='CRM Administrator' \
     backend python scripts/seed_admin.py
   ```

   The bootstrap refuses weak passwords and will not run when users already
   exist. Do not store the initial administrator password in source control.

The frontend is available on `http://localhost:3000`, the API on
`http://localhost:8000`, and the API schema on
`http://localhost:8000/api/v1/openapi.json`.

## Local development

### Backend

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt -r backend/requirements-dev.txt
cd backend
alembic upgrade head
uvicorn app.main:app --reload
```

Use `backend/.env.example` as the local configuration template. The local
connection uses host port `3307` by default:

```env
DATABASE_URL=mysql+pymysql://crm_user:URL_ENCODED_PASSWORD@localhost:3307/crm_db
```

### Frontend

```bash
cd frontend
npm ci
npm run dev
```

Set `NEXT_PUBLIC_API_URL=http://localhost:8000` in `frontend/.env.local`.

## Verification

```bash
cd backend
python -m ruff check app tests scripts
python -m pytest
```

The frontend production check is `docker compose build frontend`.

See [backend/TESTING.md](backend/TESTING.md),
[backend/DEPLOYMENT.md](backend/DEPLOYMENT.md), and
[backend/BACKEND_PRODUCTION_READINESS.md](backend/BACKEND_PRODUCTION_READINESS.md)
for the full operational notes and the explicit remaining PDF roadmap.

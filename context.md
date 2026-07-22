# Real Estate CRM — Project Context

## Overview

Full-stack Real Estate CRM for managing leads, customers, inventory (projects/towers/blocks/units), bookings, payments, and analytics. Built with a **FastAPI** backend and **Next.js** frontend, containerized with **Docker Compose** and backed by **MySQL 8.0**.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.12, FastAPI, SQLAlchemy 2, Pydantic v2, Alembic |
| **Frontend** | Next.js 14.2 (App Router), React 18, TypeScript, Tailwind CSS |
| **State** | Zustand (auth), TanStack React Query |
| **Charts** | Recharts |
| **Database** | MySQL 8.0 (via PyMySQL) |
| **Auth** | JWT (python-jose), bcrypt (passlib), OAuth2 password flow |
| **Scheduling** | APScheduler (inventory hold expiration) |
| **Reports** | ReportLab (PDF), openpyxl (Excel) |
| **Infra** | Docker, Docker Compose |

---

## Architecture

```
┌──────────────┐      HTTP       ┌──────────────┐     SQLAlchemy     ┌──────────┐
│   Frontend   │ ◄─────────────► │   Backend    │ ◄────────────────► │  MySQL   │
│  :3000 (Next)│   axios/JWT    │ :8000 (FastAPI)│                   │  :3306   │
└──────────────┘                 └──────────────┘                     └──────────┘
                                        │
                                  /uploads (static)
```

### Services (docker-compose.yml)

| Service | Container | Port | Notes |
|---------|-----------|------|-------|
| `mysql` | `crm_mysql` | 3307→3306 | Healthcheck enabled, volume `mysql_data` |
| `backend` | `crm_backend` | 8000 | Runs `seed_demo.py` then `uvicorn` on start |
| `frontend` | `crm_frontend` | 3000 | Build-time `NEXT_PUBLIC_API_URL` |

---

## Backend Structure

```
backend/
├── app/
│   ├── api/deps.py          # Auth dependencies, role guards, data scoping
│   ├── core/
│   │   ├── config.py        # Pydantic Settings (env vars)
│   │   └── security.py      # JWT creation, bcrypt password hashing
│   ├── db/
│   │   ├── base.py          # SQLAlchemy Base
│   │   └── session.py       # Engine + SessionLocal
│   ├── models/              # SQLAlchemy ORM models
│   │   ├── users.py         # User, Company, Branch, RoleEnum
│   │   ├── leads.py         # Lead, LeadNote, SiteVisit
│   │   ├── customers.py     # Customer, CustomerDocument
│   │   ├── projects.py      # Project, Tower, Block, Unit
│   │   ├── sales.py         # Booking, Payment
│   │   └── system.py        # Task, AuditLog, ApprovalRequest, Notification, TokenBlacklist
│   ├── routers/             # FastAPI route handlers (15 routers)
│   │   ├── auth.py          # POST /auth/login, /auth/refresh, /auth/logout
│   │   ├── dashboard.py     # GET /dashboard/{super-admin,manager,employee}
│   │   ├── leads.py, customers.py, bookings.py, payments.py ...
│   │   ├── analytics.py     # Lead funnel, revenue trends
│   │   ├── reports.py       # Excel/PDF export
│   │   └── notifications.py # Real-time notifications
│   ├── schemas/             # Pydantic request/response schemas
│   ├── services/
│   │   ├── inventory_service.py  # APScheduler for unit hold expiry
│   │   ├── audit.py              # Audit logging
│   │   └── notifications.py      # Notification dispatch
│   └── main.py              # App factory, CORS, router mounting, lifespan
├── scripts/
│   ├── seed_admin.py        # Minimal seed (admin + manager + employee)
│   └── seed_demo.py         # Full demo seed (drops tables, seeds everything)
├── alembic/                 # DB migrations
├── Dockerfile               # Python 3.12-slim, seeds then runs uvicorn
├── requirements.txt
└── .env                     # Local dev environment
```

---

## Database Models

### Organization
- **Company** → **Branch** (1:N)
- **User** belongs to a Branch, optional Manager (self-referential FK)

### Roles (`RoleEnum`)
| Role | Data Scope |
|------|-----------|
| `SUPER_ADMIN` | All data across all branches |
| `MANAGER` | Data within their branch only |
| `EMPLOYEE` | Only records where `assigned_to_id` or `created_by_id` matches |

### Inventory Hierarchy
**Project** → **Tower** → **Block** → **Unit**
- Unit has `price` (DECIMAL), `status` (AVAILABLE/HOLD/BOOKED/SOLD), `hold_expires_at`

### Lead Pipeline (`LeadStatusEnum`)
`NEW` → `CONTACTED` → `VISIT_SCHEDULED` → `NEGOTIATION` → `WON` / `LOST`
- WON leads convert to **Customer** records

### Sales Flow
- **Booking**: Links Customer ↔ Unit, status: `PENDING` → `DOCS_VERIFIED` → `APPROVED` → `CONFIRMED` / `CANCELLED`
- **Payment**: Linked to Booking, tracks amount/status/mode (CASH/CHEQUE/BANK_TRANSFER/UPI)

### System
- **AuditLog**: Tracks CREATE/UPDATE/DELETE with JSON diff
- **ApprovalRequest**: DISCOUNT/REFUND/CANCELLATION/UNIT_TRANSFER/PRICE_REVISION workflows
- **Notification**: Per-user notifications with read status
- **TokenBlacklist**: Revoked refresh tokens

---

## Authentication Flow

1. Frontend sends `POST /auth/login` with `username` + `password` (OAuth2 form-encoded)
2. Backend verifies bcrypt hash, checks `is_active`
3. Returns `{ access_token, refresh_token, user }` (JWT, HS256)
4. Frontend stores in `localStorage` via Zustand `useAuthStore`
5. Axios interceptor attaches `Bearer <token>` to all requests
6. On 401: interceptor clears auth and redirects to `/login`
7. Token refresh: `POST /auth/refresh` validates old token, blacklists it, issues new pair

---===

## Frontend Structure

```
frontend/
├── app/
│   ├── page.tsx              # Dashboard (role-based: super-admin/manager/employee views)
│   ├── login/page.tsx        # Login form
│   ├── layout.tsx            # Root layout
│   ├── admin/
│   │   ├── approvals/        # Approval inbox
│   │   ├── audit/            # Audit logs
│   │   ├── organization/     # Org setup
│   │   ├── settings/         # Global settings
│   │   └── users/            # User management
│   ├── bookings/             # Booking list + detail [id]
│   ├── collections/          # Payment collections
│   ├── customers/            # Customer list + detail [id]
│   ├── inventory/            # Project/Tower/Block/Unit browser
│   ├── leads/                # Lead list + detail [id]
│   ├── reports/              # Reports center
│   └── visits/               # Site visits
├── lib/axios.ts              # Axios instance with JWT interceptors
├── store/authStore.ts        # Zustand auth state (localStorage-backed)
├── middleware.ts             # Route protection placeholder
├── tailwind.config.ts        # primary: #3b82f6, secondary: #10b981
└── Dockerfile                # Node 20-alpine, build + start
```

---

## Environment Variables

### Backend (docker-compose → container)

| Variable | Value | Purpose |
|----------|-------|---------|
| `DATABASE_URL` | `mysql+pymysql://crm_user:crm_password@mysql:3306/crm_db` | DB connection (uses Docker service hostname) |
| `SECRET_KEY` | `my-super-secret-key-123456789` | JWT signing key |
| `BACKEND_CORS_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Comma-separated allowed origins |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | Access token TTL |

### Frontend (docker-compose → container)

| Variable | Value | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend API base (baked at build time) |

### Key Gotchas
- `BACKEND_CORS_ORIGINS` is a **plain string** (`str`), not `List[str]` — pydantic-settings v2 tries JSON-parsing `List[str]` fields before validators run, which fails on comma-separated values
- `SECRET_KEY` must be **identical** between seed time and runtime — otherwise JWTs signed with one key can't be verified with another
- `NEXT_PUBLIC_*` vars are inlined at **build time** in Next.js — changing them at runtime requires a rebuild

---

## Default Login Credentials

Seeded by `scripts/seed_demo.py` on every container start (drops & recreates tables):

| Role | Email | Password | Branch |
|------|-------|----------|--------|
| **Super Admin** | `admin@gmail.com` | `admin123` | Downtown HQ |
| **Manager** | `mgr1@example.com` | `mgr123` | Downtown HQ |
| **Manager** | `mgr2@example.com` | `mgr123` | Uptown Office |
| **Employee** (1-3) | `emp1@example.com` – `emp3@example.com` | `emp123` | Downtown HQ |
| **Employee** (4-6) | `emp4@example.com` – `emp6@example.com` | `emp123` | Uptown Office |

Super Admin email sourced from `backend/owner.md`.

---

## API Endpoints (Router Prefixes)

| Prefix | Tag | Description |
|--------|-----|-------------|
| `/auth` | auth | Login, refresh, logout |
| `/organization` | organization | Company & branch management |
| `/users` | users | User CRUD, role/manager assignment |
| `/inventory` | inventory | Projects, towers, blocks, units |
| `/leads` | leads | Lead CRUD, status transitions |
| `/site-visits` | site_visits | Schedule/manage site visits |
| `/customers` | customers | Customer management |
| `/bookings` | bookings | Booking workflow & approvals |
| `/payments` | payments | Payment tracking & collections |
| `/analytics` | analytics | Lead funnel, revenue trends |
| `/dashboard` | dashboard | Role-specific dashboard metrics |
| `/reports` | reports | Excel/PDF report generation |
| `/settings` | settings | Global system settings |
| `/notifications` | notifications | User notifications, unread count |
| `/system` | system | Audit logs, tasks |
| `/health` | — | Health check: `GET /health` |

---

## Running the Project

### Docker (recommended)
```bash
docker compose down -v     # Clean slate (removes DB volume)
docker compose up --build  # Build + seed + start all services
```

### Local Development
```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python scripts/seed_demo.py
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev    # http://localhost:3000
```

### Access
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- API Docs: `http://localhost:8000/api/v1/openapi.json`

# MySQL production deployment

## Prerequisites

- Docker Engine with Compose v2
- DNS and TLS termination for the frontend and API
- durable backup storage for the MySQL volume
- SMTP credentials when email notification delivery is enabled

The production database is MySQL 8. PostgreSQL is intentionally not used.

## Configure

Copy `deployment.env.example` to `.env` in the repository root and replace
every placeholder. URL-encode special characters in the password embedded in
`DATABASE_URL`.

Generate a strong secret, for example:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Production startup rejects:

- a secret shorter than 32 UTF-8 bytes;
- a non-MySQL database URL;
- wildcard or missing trusted hosts;
- wildcard CORS origins.

Keep `SEED_DEMO_DATA=false`. Demo seeding is destructive and is intended only
for disposable development databases.

## Deploy

From the repository root:

```bash
docker compose config --quiet
docker compose up -d --build
docker compose ps
```

The backend container runs `alembic upgrade head` before starting Uvicorn and
exposes `/health` for container and load-balancer checks. Uploaded documents use
the durable `backend_uploads` volume; MySQL uses `mysql_data`.

For a new empty database, bootstrap the first administrator exactly once:

```bash
docker compose exec \
  -e INITIAL_ADMIN_EMAIL=admin@example.com \
  -e INITIAL_ADMIN_PASSWORD='Replace-With-A-Strong-Pass1!' \
  -e INITIAL_ADMIN_NAME='CRM Administrator' \
  backend python scripts/seed_admin.py
```

The command rejects weak passwords and exits without making changes when any
user already exists. Change the initial password after the first sign-in.

Verify:

```bash
curl -f https://api.example.com/health
curl -f https://api.example.com/api/v1/openapi.json
curl -f https://crm.example.com/login
```

## Operating notes

- MySQL initializes `MYSQL_ROOT_PASSWORD`, `MYSQL_USER`, and `MYSQL_PASSWORD`
  only when its data directory is empty. Editing `.env` later does not change
  passwords stored in an existing `mysql_data` volume. Rotate an existing
  account with `ALTER USER`; never delete a production volume to apply a
  password change.
- Inside Compose, `DATABASE_URL` must connect to `mysql:3306`. Host tools use
  `localhost:${MYSQL_HOST_PORT:-3307}` instead.
- Back up MySQL before each migration. The current legacy reconciliation
  migrations are forward-only; restore the backup for database rollback.
- Schedule one daily encrypted database backup and test restoration regularly.
- Run one scheduler-enabled backend instance. Set `SCHEDULER_ENABLED=false` on
  additional API replicas; database locks still protect against duplicate and
  overlapping execution.
- Terminate TLS at a trusted reverse proxy and forward request/correlation IDs.
- Use object storage or a shared malware-scanned volume if the backend is
  deployed across multiple hosts.
- Rotate the JWT secret, database password, and SMTP credentials through the
  deployment platform's secret manager.

# Backend test guide

## Run the complete suite

From `backend/`:

```bash
python -m pip install -r requirements-dev.txt
python -m pytest
```

`python -m pytest` is the single CI-equivalent command. It runs all 102 tests,
writes `coverage.xml`, and fails when application coverage is below 90%.

The suite uses an isolated in-memory SQLite database for fast API and service
tests. A separate repository test validates transaction rollback, uniqueness,
and MySQL-compatible DDL. CI additionally creates a real MySQL 8 database and
runs the complete Alembic chain before executing pytest.

## Useful commands

```bash
# One module without the global coverage gate
python -m pytest tests/test_scheduler.py --no-cov

# One test by name
python -m pytest -k "duplicate_lead" --no-cov

# Show the slowest tests
python -m pytest --durations=20
```

## Test organization

- API and integration tests cover authentication, RBAC, users, organization,
  projects, inventory, leads, customers, site visits, bookings, payments,
  approvals, notifications, analytics, reports, rentals, possession, service
  tickets, partners, files, audit logs, and scheduler management.
- Scheduler tests execute all twelve production jobs and cover enable, disable,
  pause, resume, run-now, status, execution history, retries, deduplication,
  overlap prevention, and failure notification.
- Repository tests cover commit, constraint failures, rollback recovery, and
  generated MySQL schema types.
- External effects such as SMTP delivery are mocked. Uploads and generated
  reports are confined to pytest temporary directories.

Shared database, client, organization, and role-token fixtures live in
`tests/conftest.py`. New tests should reuse them and must not depend on a
developer database or network service.

## CI

`.github/workflows/backend-tests.yml` runs on backend pull requests and pushes:

1. install production and test dependencies;
2. compile the backend;
3. upgrade a clean MySQL 8 database to Alembic head;
4. run all tests with the 90% coverage gate;
5. upload `coverage.xml`.

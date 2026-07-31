# Backend production-readiness audit

Audit date: 2026-07-30  
Reference: `Real Estate CRM Platform.pdf` (57 pages)  
Database decision: MySQL 8 replaces the document's PostgreSQL recommendation.

## 1. Completed modules

The deployable backend now includes:

- authentication, refresh sessions, logout/revocation, password reset/change,
  email verification, account locking, RBAC, and scoped data access;
- companies, branches, users, projects, towers, blocks, units, holds, price
  changes, and inventory filtering/search/sorting/pagination;
- lead lifecycle, mandatory next action, duplicate detection and merge,
  assignments, activities, notes, tags, site visits, customers, and KYC;
- booking locking, discount approval gates, payment verification, cancellation,
  receipts, payment filtering, and immutable audit records;
- notification delivery/preferences/retry/archive, approvals with escalation,
  audit-log APIs, analytics, and CSV/XLSX/PDF reports;
- assigned tasks with lifecycle/search/filtering and internal inbox/sent
  messages with unread tracking and notifications;
- rentals, rent invoices, possession/handover, service tickets, partners, file
  upload validation, and application settings;
- all twelve required scheduler jobs plus enable, disable, pause, resume,
  run-now, status, execution history, retry, database deduplication, overlap
  locking, structured logging, and failure notifications;
- consistent error envelopes, request and correlation IDs, logging middleware,
  rate limiting, CORS, trusted hosts, security headers, OpenAPI examples, and
  unique operation IDs.

## 2. Remaining document roadmap

The supplied document describes a larger end-state product than this repository.
These product areas still require separate design and implementation before the
entire document—not just the current backend scope—is feature-complete:

- quotation/cost-sheet versioning, configurable installment plans, demand
  letters, customer ledgers, refund workflows, and unit-transfer workflows;
- channel-partner commission accrual, approval, payout, clawback, and statements;
- dedicated customer and partner portals, secure document sharing, e-signature,
  loan processing, and maintenance billing;
- telephony, WhatsApp/SMS, payment-gateway, accounting, ERP, webhook, and
  property-portal integrations;
- consent/privacy request workflows, retention-policy administration, MFA/SSO,
  and field-level encryption for selected identity documents;
- campaign automation, attribution, AI lead scoring, forecasting, and anomaly
  detection.

These are explicit remaining features, not hidden stubs. The implemented API is
deployable for its current module set.

## 3. Production readiness score

**91/100 for the implemented backend.**

The main remaining production gates are environment-specific: TLS/DNS, managed
secrets, SMTP and third-party credentials, backup/restore rehearsal, load and
penetration testing, and observability integration. Full functional alignment
with every roadmap item in the PDF is approximately **72%**.

## 4. Test coverage summary

- 102 pytest tests passed.
- Application coverage: **91.07%** (5,743 statements, 513 missed).
- Enforced minimum: 90% through `pytest.ini`.
- Coverage includes unit-style service tests, API contracts, integrations,
  persistence/rollback, RBAC, validation, pagination/filtering/searching,
  uploads, report exports, delivery mocks, and scheduler execution.
- CI runs the suite with one command: `python -m pytest`.

## 5. Database migration summary

- One linear Alembic history with nine revisions and one head:
  `c82d4e5f6a70`.
- A zero-to-head rebuild passed on both SQLite and a disposable real MySQL 8
  database.
- The hardening revision adds lifecycle fields, numeric unit area, missing
  foreign-key/status indexes, and uniqueness constraints for unit numbers,
  lead-to-customer conversion, and handovers.
- The current head adds the task and internal-message tables and indexes.
- Booking and lease mutations lock inventory rows to serialize conflicting
  transactions.
- Reconciliation migrations are intentionally forward-only. Production rollback
  is by verified backup restore.

## 6. Security checklist

- [x] RBAC and branch/company scope checks
- [x] JWT type checks, unique token IDs, revocation, and session invalidation
- [x] Password strength and bcrypt length controls
- [x] Pydantic validation and ORM parameter binding
- [x] Upload type, extension, size, ownership, and path controls
- [x] Rate limiting, CORS, trusted-host validation, and security headers
- [x] Request/correlation IDs and security-relevant audit logging
- [x] Production secret and MySQL configuration fail-fast validation
- [x] Non-root backend container and no default production credentials
- [x] Bandit: no medium/high findings (four informational low-confidence
  string matches)
- [ ] Release dependency-advisory triage: the production frontend install
  reports three high-severity advisory matches. The application uses the
  current Next.js 15 maintenance release, but the advisory details still need
  review in the release environment before a public launch.
- [ ] External penetration test and infrastructure secret-manager verification
- [ ] MFA/SSO and selected PII field encryption from the extended PDF roadmap

## 7. Performance optimization summary

- Indexed foreign keys and frequent status/date query paths.
- Central pagination with bounded page sizes and allow-listed sorting.
- Joined/eager loading on relationship-heavy endpoints to prevent N+1 queries.
- MySQL connection pre-ping, bounded pool/overflow, and connection recycling.
- Row locks prevent inventory double booking and overlapping leases.
- Scheduler database locks, deduplication windows, coalescing, and max-instance
  controls prevent duplicate or overlapping jobs.
- Batch limits bound notification retries and retention jobs.

Before a high-volume launch, run workload-specific MySQL `EXPLAIN` analysis and
load tests using representative data sizes; those measurements cannot be
meaningfully simulated by the repository test database.

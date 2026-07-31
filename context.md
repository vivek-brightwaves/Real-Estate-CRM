# Real Estate CRM Platform — Project Context

## 1. Purpose

This repository contains a deployment-ready, role-based real estate CRM. It
manages the business lifecycle from lead acquisition through customer
conversion, inventory reservation, booking approval, collections, reporting,
rentals, possession, and post-sale service.

This file is the functional and technical source of truth for future
development. When behavior changes, update this document with the code.

The platform uses **MySQL 8 only**. PostgreSQL is not used.

## 2. Technology and Architecture

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Web application | Next.js 15, React 19, TypeScript, Tailwind CSS | Responsive dashboards, forms, tables, boards, charts, and feedback UI |
| API | FastAPI, Pydantic, SQLAlchemy | Authentication, validation, workflows, RBAC, business rules, and reporting |
| Database | MySQL 8 | Persistent CRM, security, operational, and audit data |
| Migrations | Alembic | Versioned database schema and documented role profiles |
| Background work | APScheduler | Reminders, cleanup, reports, rental billing, and operational automation |
| Authentication | JWT access and refresh tokens | Login, refresh, logout, revocation, history, and password recovery |
| Deployment | Docker Compose | MySQL, backend, and frontend services with health checks |
| Tests | Pytest, Ruff | API regression testing, coverage, migration, and code-quality checks |

The frontend sends authenticated requests through the shared Axios client. The
backend applies role and branch scoping before database queries. MySQL is
available inside Docker as `mysql:3306`; host tools use port `3307` by default.

## 3. Main Application Areas

The primary frontend routes are:

| Route | Screen |
| --- | --- |
| `/login` | Secure login |
| `/forgot-password` | Password recovery request |
| `/` | Role-aware dashboard and analytics |
| `/leads` | Lead pipeline board |
| `/leads/new` | Add Lead form |
| `/leads/[id]` | Lead details, notes, activity, assignment, and visits |
| `/inventory` | Project, tower, block, and unit inventory |
| `/bookings` | Booking board/list |
| `/bookings/[id]` | Booking details and workflow actions |
| `/customers` | Customer directory |
| `/customers/[id]` | Customer profile, KYC, documents, and timeline |
| `/collections` | Payments and collections |
| `/reports` | Report filters, preview, Excel export, and PDF export |
| `/tasks` | Personal and assigned task management |
| `/messages` | Internal staff messaging |
| `/visits` | Site visit operations |
| `/admin/organization` | Company, branch, and project setup |
| `/admin/users` | Users, roles, status, reporting manager, and password reset |
| `/admin/approvals` | Approval inbox and decision history |
| `/admin/audit` | Audit trail |
| `/admin/settings` | Operational and integration settings |

Analytics remain available on the main dashboard. The duplicate Analytics
sidebar item was intentionally removed.

## 4. Access Model

### 4.1 Base access roles

Backend permissions are enforced with these base roles:

- `SUPER_ADMIN`: unrestricted global administration.
- `ADMIN`: organization administration and finance-level operations.
- `MANAGER`: branch/project management with branch-scoped data.
- `EMPLOYEE`: operational staff and sales-agent access.
- `PARTNER`: channel partner management.
- `BROKER`: broker/channel partner access.
- `CUSTOMER`: buyer or tenant access.

Managers are scoped to their assigned branch. Employees normally see records
assigned to or created by them. Administrative operations use explicit role
guards and are not protected only by hidden frontend buttons.

### 4.2 Documented business-role profiles

User Management stores a business-role profile and maps it to a base access
role:

| Business role | Base role | Main responsibility |
| --- | --- | --- |
| Organization Administrator | ADMIN | Projects, users, workflows, integrations, and security |
| Business Owner or Director | SUPER_ADMIN | Global sales, collections, inventory, forecasts, and profitability |
| Sales Head | MANAGER | Targets, teams, pipelines, allocation, and approvals |
| Branch or Project Manager | MANAGER | Branch/project leads, visits, inventory, and bookings |
| Inside Sales or Telecalling Executive | EMPLOYEE | Lead qualification, appointments, and follow-ups |
| Field Sales Executive | EMPLOYEE | Site visits, presentations, and feedback |
| CRM Executive | EMPLOYEE | Bookings, documents, demand letters, and communication |
| Collections Executive | EMPLOYEE | Installments, overdue accounts, reminders, and recovery |
| Finance and Accounts User | ADMIN | Payment verification, receipts, reconciliation, tax, and refunds |
| Channel Partner Manager | PARTNER | Broker onboarding, performance, and commissions |
| Broker or Channel Partner | BROKER | Lead registration, authorized inventory, and commission monitoring |
| Property Manager | MANAGER | Tenants, leases, rent, and maintenance |
| Customer or Buyer | CUSTOMER | Bookings, documents, installments, receipts, and requests |
| Tenant | CUSTOMER | Lease information, rent information, and maintenance requests |

The role migration seeds these profiles without duplicating existing records.
Administrators can also create additional role profiles from Add Role.

## 5. Authentication and Sessions

Authentication provides:

- Email/password login with password hashing.
- Short-lived access tokens and rotatable refresh tokens.
- Refresh-token-backed user sessions.
- Logout of one session and logout of all sessions.
- Token revocation and blacklist enforcement.
- Current-user profile lookup.
- Forgot password and reset password.
- Authenticated password change.
- Email verification and verification resend.
- Login history with success, failure, and logout activity.
- Device and request metadata where available.
- Rate limiting and security middleware.

Logout first records a `LOGOUT` history event and then clears local
credentials. The dashboard’s Last Session display uses the latest logout event,
falling back to the previous successful login. The displayed value is converted
to the browser’s local time.

## 6. Dashboard

The dashboard selects data according to the authenticated role:

- Super Admin and Admin receive the global dashboard.
- Manager receives a branch-scoped dashboard.
- Employee receives personal sales and activity metrics.
- Broker and Partner receive the broker dashboard.
- Customer receives a limited landing experience without unauthorized
  analytics requests.

Dashboard functions include:

- Revenue, collections, bookings, lead, visit, and inventory metrics.
- Lead pipeline and revenue trend charts.
- Booking, monthly sales, visit, and property trend visualizations.
- Recent leads with actual API data.
- Activity and notifications.
- Quick actions for Add Lead, Tasks, Messages, and operational pages.
- Live date and time.
- Last session/login information.
- Responsive desktop and mobile navigation.

## 7. Leads

The Leads module supports:

- Create a lead through the Add Lead page.
- List leads with pagination, sorting, status, assignee, branch, source, date,
  and text-search filters.
- Detect and safely handle duplicate contact information.
- View a lead and its activity history.
- Update profile and sales information.
- Move leads through:
  `NEW → CONTACTED → VISIT_SCHEDULED → NEGOTIATION → CONVERTED` or `LOST`.
- Add timestamped notes.
- Assign or reassign a lead to staff.
- Reject/mark a lead lost with workflow validation.
- Convert an eligible lead into a customer.
- Schedule a site visit.
- Export visible lead data.
- Audit important status, assignment, and conversion changes.

Search is local to the Leads tab; it does not overwrite search in another
module.

## 8. Site Visits

Site visit functions include:

- Schedule a visit from a lead.
- List visits with scoped access.
- Employee check-in.
- Optional location/photo evidence supported by the visit model and upload
  workflow.
- Submit feedback and a customer rating.
- Record visit result.
- Manager/Admin approval.
- Status tracking for scheduled, completed, cancelled, rescheduled, and
  no-show visits.

Visits connect lead nurturing with inventory selection and booking conversion.

## 9. Customers and KYC

Customer functions include:

- Create a customer directly or by converting a lead.
- Search, filter, sort, and paginate customers.
- Open a complete customer profile.
- Update customer and assignment details.
- View a combined business timeline.
- Upload KYC/customer documents.
- List documents awaiting verification.
- Verify or reject documents with authorized roles.
- Track document states: `UPLOADED`, `VERIFIED`, and `REJECTED`.
- Export customer data from the frontend.

Customer records connect leads, bookings, payments, documents, assigned staff,
and timeline events.

## 10. Organization and Project Setup

Organization Setup provides CRUD workflows for:

- Companies.
- Branches belonging to companies.
- Projects belonging to branches.
- Project metadata used by inventory and reporting.

Deletion is protected when dependent business records make removal unsafe.
Administrative changes are audited. The frontend includes searchable tables,
forms, summary cards, and CSV export.

## 11. User Management

User Management provides:

- List and search users.
- Create a user with a documented business-role profile.
- Automatically derive the user’s base access role from that profile.
- Create additional role profiles.
- Display both business role and base system role.
- Update user details.
- Activate, suspend, or deactivate accounts.
- Change a user’s role.
- Assign a reporting manager.
- Reset a user password under the backend password policy.
- Branch assignment and branch-aware manager lists.
- User statistics and CSV export.
- Audit administrative changes.

The minimum frontend reset-password length matches the backend’s eight-character
minimum; the backend also enforces password-strength rules.

## 12. Inventory

Inventory represents:

`Company → Branch → Project → Tower → Block → Unit`

Functions include:

- Create and list towers.
- Create and list blocks.
- Create individual units.
- Bulk-create units.
- Search/filter units by project hierarchy, type, status, and other supported
  fields.
- Display unit type, area, price, and current availability.
- Unit states: `AVAILABLE`, `HOLD`, `BOOKED`, and `SOLD`.
- Place a unit on temporary hold.
- Release an active hold.
- Automatically release expired holds.
- Prevent conflicting reservations/bookings.
- Permit only Super Admin to directly change unit price.

Inventory actions are transactionally validated to reduce double-booking risk.

## 13. Bookings

Booking functions include:

- Create a booking linking a customer and unit.
- List/search/filter bookings with scoped access.
- View booking details.
- Verify required documents.
- Submit and approve discounts.
- Submit and approve booking decisions.
- Confirm a valid approved booking.
- Cancel a booking under restricted authorization.
- Release or update the associated unit when a booking is cancelled.
- Preserve booking, payment, customer, unit, and creator relationships.

Booking states are:

`PENDING → DOCS_VERIFIED → APPROVED → CONFIRMED`

A booking can move to `CANCELLED` through the authorized cancellation workflow.

## 14. Payments and Collections

This project records payments manually. It does **not** currently integrate with
an external payment gateway and does not automatically charge a card, bank
account, or UPI account.

Functions include:

- Create a scheduled payment/installment for a booking.
- List payments with booking, status, date, amount, sorting, and receipt
  filters.
- Distinguish pending, received, and overdue installments.
- Mark a payment as received.
- Require payment mode and receipt/reference information.
- Supported modes: cash, cheque, bank transfer, and UPI reference.
- Store received date, operator, amount, mode, and receipt number.
- Generate a PDF receipt only after a payment is received.
- Export payment/collection data.
- Show real stored data rather than invented payment metadata.

### Payment Reminder behavior

The Reminder action:

1. Validates payment access and rejects reminders for received payments.
2. Locates the booking and customer.
3. Builds a reminder containing payment, amount, due date, and customer contact.
4. Creates a persistent in-app `PAYMENT_REMINDER` notification for the
   customer’s assigned CRM user, or the booking creator as fallback.
5. Records the action and destination in the audit trail.
6. Returns delivery information to the frontend’s feedback popup.

It does not claim that an external customer email/SMS was sent unless a future
customer-delivery integration is added.

### Mark Received behavior

Mark Received:

1. Validates that the operator is Super Admin, Admin, or Manager and has record
   access.
2. Rejects an already-received payment.
3. Changes status to `RECEIVED`.
4. Saves mode, receipt reference, and current received date.
5. Writes an audit event.
6. Creates a `PAYMENT_RECEIVED` notification for the booking creator.
7. Enables PDF receipt generation.

## 15. Reports and Analytics

The Reports screen supports:

- Report type selection.
- Start/end date filters.
- A bounded on-screen data preview.
- Authenticated Excel (`.xlsx`) download.
- Authenticated PDF download.
- Loading, success, and failure feedback.
- Branch scoping for managers.
- Audit logging of exports.
- A 5,000-row safety limit for in-memory Excel/PDF generation.

Available backend report datasets include:

- Leads.
- Customers.
- Bookings.
- Payments/finance.
- Collections.
- Inventory.
- Projects.
- Site visits.
- Employees.
- Brokers.
- Rentals.
- Service tickets.
- Audit logs.

Analytics APIs calculate revenue, lead, booking, payment, inventory, and
employee performance. Analytics are rendered on the dashboard instead of a
duplicate standalone navigation page.

## 16. Tasks

Task management supports:

- Create a task.
- Assign a task to an authorized staff member.
- List personal, assigned, or managed tasks under RBAC scope.
- Search and filter tasks.
- View one task.
- Edit title, description, due date, priority, assignee, and supported status.
- Complete/reopen tasks where permitted.
- Delete tasks where permitted.
- Staff-option lookup for task assignment.
- Validation that prevents assignment outside the permitted organization scope.

The Tasks button and dashboard quick action route to the working Tasks page.

## 17. Internal Messages

Messages support:

- Compose an internal message to an authorized CRM user.
- List sent and received messages.
- Search messages independently from other tabs.
- View one message.
- Track unread count.
- Mark an individual message read.
- Delete/hide a message according to sender/recipient rules.
- Display success and error feedback.

This is internal CRM messaging, not a public email or WhatsApp client.

## 18. Notifications

The notification system provides:

- Persistent per-user notifications.
- Categories, types, priorities, and delivery states.
- Paginated notification inbox.
- Unread count.
- Mark one or all notifications read.
- Delete a notification.
- User notification preferences.
- Optional email delivery when SMTP is correctly configured.
- Retry handling for failed external delivery.
- Archiving of old read notifications.

Notifications are used by payments, approvals, rentals, scheduler operations,
and other business workflows.

## 19. Approvals

The generic approval engine supports:

- Create an approval request.
- List approvals with access scoping.
- View an approval and history.
- Approve or reject pending requests.
- Cancel a request where permitted.
- Record each decision in approval history and audit data.
- Escalate approvals that exceed the configured SLA.

Supported approval categories include discounts, refunds, cancellations, unit
transfers, price revisions, bookings, KYC, documents, possession, rentals, and
broker commissions.

## 20. Partners and Brokers

Partner APIs support:

- Broker/channel-partner onboarding.
- Broker listing with validated access.
- Fixed or percentage commission configuration.
- Commission payout states: pending, approved, paid, and cancelled.
- Broker/Partner dashboard data.

These APIs are implemented, though partner administration is not currently a
top-level primary frontend screen.

## 21. Rentals and Property Management

Rental APIs support:

- Create and retrieve lease agreements.
- List leases under access scope.
- Lease states: draft, active, terminated, and expired.
- List rental invoices.
- Mark invoices paid.
- Invoice states: pending, paid, and overdue.
- Generate one monthly invoice per active lease and billing month.
- Notify responsible staff about approaching rent due dates.

Rental operations are backend-complete but do not yet have a dedicated primary
frontend route.

## 22. Possession and Service

Possession and post-sale APIs support:

- Possession/handover records.
- Handover listing.
- Create and manage service or maintenance tickets.
- Ticket assignment and updates.
- Ticket priorities: low, medium, high, and critical.
- Ticket states: open, in progress, resolved, and closed.

These functions support customers, buyers, tenants, and property-management
teams. Dedicated primary frontend screens remain a future UI extension.

## 23. File and Document Management

File services support:

- Single-file upload.
- Multi-file upload.
- File metadata and ownership.
- Entity association.
- Paginated file listing.
- Authorized file download.
- Replace a file.
- Delete a file.
- Size, content-type, extension, and filename validation.
- Local durable upload volume in Docker.

For multi-host production, use shared object storage and malware scanning.

## 24. Audit and Observability

The platform records significant operations such as:

- Authentication and logout activity.
- Lead creation, assignment, status, and conversion.
- Customer and document changes.
- Booking and approval decisions.
- Payment receipt and reminder actions.
- Report exports.
- User, role, organization, and inventory administration.

Operational protections include:

- Structured request logging.
- Request and correlation IDs.
- Trusted-host and CORS validation.
- Standard API error responses.
- Pagination headers.
- Health endpoint.
- Database connection pooling.
- Spreadsheet formula-injection protection during export.

## 25. Background Scheduler

The scheduler provides administration endpoints to inspect, enable, disable,
pause, resume, run now, retry, and review execution history.

Registered jobs include:

- Release expired unit holds.
- Send payment reminders.
- Generate monthly rent invoices.
- Send rental due-date notifications.
- Escalate pending approvals.
- Retry failed notifications.
- Clean expired authentication tokens.
- Delete audit logs beyond retention.
- Archive old read notifications.
- Generate daily reports.
- Generate weekly reports.
- Generate monthly reports.

Database locks and idempotency rules protect jobs from duplicate work. Only one
API instance should normally have `SCHEDULER_ENABLED=true`.

## 26. Search Behavior

Search is intentionally section-specific. Each supported page synchronizes its
own `search` query parameter and section event:

- Leads.
- Customers.
- Inventory.
- Bookings.
- Payments.
- Tasks.
- Messages.
- Users.

The header placeholder changes for the active module. Search text from one tab
does not become the search term for another tab. Pages such as Dashboard and
Reports do not show a misleading global lead-search box.

## 27. User Feedback and Popups

The shared Feedback Provider presents consistent:

- Success messages.
- Error messages.
- Informational notices.
- Confirmation dialogs.
- Loading/disabled action states.
- Auto-dismiss behavior and accessible close controls.

Lead, user, role, report, payment, task, message, booking, customer, inventory,
and administrative actions use feedback instead of browser-native alerts where
integrated.

## 28. Core Business Workflow

1. A lead is created manually or from an authorized source.
2. A manager assigns the lead to a sales employee.
3. The employee contacts and qualifies the lead.
4. A site visit is scheduled, checked in, completed, and reviewed.
5. The lead enters negotiation.
6. A suitable unit is placed on temporary hold.
7. The lead is converted into a customer.
8. A booking links the customer to the unit.
9. Documents, discount, and booking approval workflows are completed.
10. The booking is confirmed and the unit progresses to booked/sold.
11. Installments are scheduled.
12. Staff send reminders for pending or overdue installments.
13. Authorized finance staff mark actual payments received.
14. The system saves the transaction, notifies the booking owner, and generates
    a receipt.
15. Dashboards, audit history, analytics, and reports reflect the new data.
16. Optional rental, possession, service, and partner workflows continue after
    the sale or alongside property management.

## 29. API Groups

The FastAPI application registers these functional groups:

- `/auth`
- `/organization`
- `/users`
- `/inventory`
- `/leads`
- `/site-visits`
- `/customers`
- `/bookings`
- `/payments`
- `/analytics`
- `/system`
- `/approvals`
- `/dashboard`
- `/reports`
- `/settings`
- `/notifications`
- `/partners`
- `/rentals`
- `/possession`
- `/audit`
- `/files`
- `/scheduler`
- `/tasks`
- `/messages`

Interactive OpenAPI documentation is generated from the running backend schema.

## 30. Docker and MySQL Deployment

Services:

- `mysql`: MySQL 8 with the persistent `mysql_data` volume.
- `backend`: runs `alembic upgrade head`, then starts Uvicorn.
- `frontend`: serves the optimized Next.js production build.

Important environment variables:

```env
MYSQL_ROOT_PASSWORD=...
MYSQL_DATABASE=crm_db
MYSQL_USER=crm_user
MYSQL_PASSWORD=...
DATABASE_URL=mysql+pymysql://crm_user:URL_ENCODED_PASSWORD@mysql:3306/crm_db
SECRET_KEY=...
BACKEND_CORS_ORIGINS=...
TRUSTED_HOSTS=...
NEXT_PUBLIC_API_URL=...
SEED_DEMO_DATA=false
```

Current local development was configured with the requested MySQL password
`root`. Public production environments must replace database, administrator,
JWT, SMTP, and integration credentials with strong secrets.

Deployment commands:

```bash
docker compose config --quiet
docker compose up -d --build
docker compose ps
```

The frontend is normally available at `http://localhost:3000`, the backend at
`http://localhost:8000`, and host MySQL at `localhost:3307`.

Changing `.env` does not update credentials already stored in an existing MySQL
volume. Rotate an existing MySQL account with `ALTER USER`; do not delete a
production database volume merely to apply a password change.

## 31. Verification Baseline

The completed local validation baseline is:

- Frontend production Docker image builds successfully.
- Backend production Docker image builds successfully.
- Frontend, backend, and MySQL containers become healthy.
- Alembic migration head: `d13e5f7a9b20`.
- All 14 documented business roles exist in MySQL.
- Backend Ruff checks pass.
- 102 backend tests pass.
- Backend coverage is 90.68%.
- Live frontend and backend health requests return HTTP 200.
- Live authenticated Excel and PDF report downloads return valid content.
- Live report preview returns MySQL data.
- Live logout activity is recorded in login history.

Re-run the test baseline after functional changes:

```bash
cd backend
python -m ruff check app tests scripts
python -m pytest
```

Validate the production frontend with:

```bash
docker compose build frontend
```

## 32. Explicit Boundaries and Future Extensions

- There is no external payment-gateway charge/capture integration.
- Payment reminders currently create actionable internal CRM notifications;
  direct customer SMS/WhatsApp/email delivery requires a customer-delivery
  provider integration.
- Partner, rental, possession, scheduler, and file APIs have stronger backend
  coverage than frontend navigation; dedicated UI modules can be added later.
- TLS termination, public DNS, cloud secret management, production backups,
  SMTP credentials, SMS/WhatsApp providers, and object storage are
  environment-specific deployment responsibilities.
- Use a single scheduler-enabled backend instance unless deployment-level job
  coordination has been explicitly designed.
- Never enable destructive demo seeding against production data.

## 33. Important Repository References

- `README.md`: quick start and project overview.
- `docker-compose.yml`: deployable service topology.
- `deployment.env.example`: production environment template.
- `backend/DEPLOYMENT.md`: production deployment guidance.
- `backend/TESTING.md`: test instructions.
- `backend/BACKEND_PRODUCTION_READINESS.md`: backend readiness and remaining
  roadmap.
- `backend/app/main.py`: registered API modules and middleware.
- `backend/app/models/`: persistent domain model.
- `backend/app/routers/`: API and workflow behavior.
- `backend/app/scheduler.py`: automation jobs.
- `frontend/app/`: frontend routes.
- `frontend/components/`: reusable dashboard and UI elements.

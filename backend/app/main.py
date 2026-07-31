from __future__ import annotations

import os
import re
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.api.openapi import install_openapi
from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging
from app.core.middleware import (
    RateLimitMiddleware,
    RequestContextMiddleware,
    SecurityHeadersMiddleware,
)
from app.routers import (
    analytics,
    approvals,
    audit,
    auth,
    bookings,
    customers,
    dashboard,
    files,
    inventory,
    leads,
    notifications,
    organization,
    partners,
    payments,
    possession,
    rentals,
    reports,
    scheduler as scheduler_router,
    settings as settings_router,
    site_visits,
    system,
    users,
    work,
)
from app.scheduler import start_scheduler, stop_scheduler
from app.schemas.common import HealthResponse
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.files import FileUpload
from app.models.users import RoleEnum, User

configure_logging(settings.LOG_LEVEL)


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    try:
        yield
    finally:
        stop_scheduler()


openapi_tags = [
    {"name": "auth", "description": "Authentication, sessions, and credentials."},
    {"name": "organization", "description": "Companies, branches, and projects."},
    {"name": "users", "description": "User administration and RBAC."},
    {"name": "inventory", "description": "Towers, blocks, units, pricing, and holds."},
    {"name": "leads", "description": "Lead lifecycle and assignments."},
    {"name": "site-visits", "description": "Site visit operations."},
    {"name": "customers", "description": "Customers, documents, and timelines."},
    {"name": "bookings", "description": "Booking and approval workflows."},
    {"name": "payments", "description": "Payment collection and receipts."},
    {"name": "analytics", "description": "Aggregated business analytics."},
    {"name": "approvals", "description": "Multi-level approval workflows."},
    {"name": "dashboard", "description": "Role-specific operational dashboards."},
    {"name": "reports", "description": "Secured CSV, Excel, and PDF exports."},
    {"name": "settings", "description": "Organization-level configuration."},
    {
        "name": "notifications",
        "description": "Notification inbox and delivery preferences.",
    },
    {"name": "partners", "description": "Broker and channel-partner management."},
    {"name": "rentals", "description": "Lease and rental invoice management."},
    {"name": "possession", "description": "Handovers and service tickets."},
    {"name": "audit", "description": "Security and business audit history."},
    {"name": "files", "description": "Protected file lifecycle operations."},
    {"name": "scheduler", "description": "Background job operations and history."},
    {"name": "system", "description": "System administration."},
    {"name": "tasks", "description": "Assigned work and task lifecycle."},
    {"name": "messages", "description": "Secure internal staff messaging."},
]

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.API_VERSION,
    description=(
        "Enterprise Real Estate CRM API. All error responses use a standard "
        "error envelope and every response includes request tracing headers."
    ),
    openapi_url="/api/v1/openapi.json",
    lifespan=lifespan,
    openapi_tags=openapi_tags,
)

os.makedirs("uploads", exist_ok=True)

app.add_middleware(RateLimitMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

trusted_hosts = [
    host.strip() for host in settings.TRUSTED_HOSTS.split(",") if host.strip()
]
if trusted_hosts and trusted_hosts != ["*"]:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=trusted_hosts)

origins = [
    origin.strip()
    for origin in settings.BACKEND_CORS_ORIGINS.split(",")
    if origin.strip()
]
if origins:
    wildcard = origins == ["*"]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=not wildcard,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=[
            "Authorization",
            "Content-Type",
            "X-Request-ID",
            "X-Correlation-ID",
        ],
        expose_headers=[
            "X-Request-ID",
            "X-Correlation-ID",
            "X-Response-Time-Ms",
            "X-Total-Count",
            "X-Page",
            "X-Page-Size",
            "X-Total-Pages",
            "X-RateLimit-Limit",
            "X-RateLimit-Remaining",
        ],
    )

# Outermost middleware: creates trace context for every downstream component.
app.add_middleware(RequestContextMiddleware)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(organization.router, prefix="/organization", tags=["organization"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(inventory.router, prefix="/inventory", tags=["inventory"])
app.include_router(leads.router, prefix="/leads", tags=["leads"])
app.include_router(site_visits.router, prefix="/site-visits", tags=["site-visits"])
app.include_router(customers.router, prefix="/customers", tags=["customers"])
app.include_router(bookings.router, prefix="/bookings", tags=["bookings"])
app.include_router(payments.router, prefix="/payments", tags=["payments"])
app.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
app.include_router(system.router, prefix="/system", tags=["system"])
app.include_router(approvals.router, prefix="/approvals", tags=["approvals"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
app.include_router(reports.router, prefix="/reports", tags=["reports"])
app.include_router(settings_router.router, prefix="/settings", tags=["settings"])
app.include_router(
    notifications.router,
    prefix="/notifications",
    tags=["notifications"],
)
app.include_router(partners.router, prefix="/partners", tags=["partners"])
app.include_router(rentals.router, prefix="/rentals", tags=["rentals"])
app.include_router(possession.router, prefix="/possession", tags=["possession"])
app.include_router(audit.router, prefix="/audit", tags=["audit"])
app.include_router(files.router, prefix="/files", tags=["files"])
app.include_router(
    scheduler_router.router,
    prefix="/scheduler",
    tags=["scheduler"],
)
app.include_router(work.router, tags=["tasks", "messages"])

register_exception_handlers(app)
install_openapi(app)


@app.get(
    "/health",
    tags=["system"],
    summary="Service health",
    response_description="Service is accepting requests.",
    response_model=HealthResponse,
)
def health_check():
    return {
        "status": "ok",
        "service": settings.PROJECT_NAME,
        "version": settings.API_VERSION,
        "environment": settings.ENVIRONMENT,
    }


@app.get(
    "/uploads/{file_path:path}",
    include_in_schema=False,
    response_class=FileResponse,
)
def download_protected_upload(
    file_path: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Compatibility route for legacy upload URLs with resource-level RBAC."""

    upload_root = Path("uploads").resolve()
    candidate = (upload_root / file_path).resolve()
    if candidate != upload_root and upload_root not in candidate.parents:
        raise HTTPException(status_code=404, detail="File not found")
    if not candidate.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    # Files managed by /files retain uploader/admin ownership semantics.
    record = db.query(FileUpload).filter(
        FileUpload.stored_name == candidate.name
    ).first()
    if record is not None:
        if (
            record.uploaded_by_id != current_user.id
            and current_user.role
            not in [RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN]
        ):
            raise HTTPException(status_code=403, detail="Not authorized")
    else:
        customer_match = re.match(r"^customer_(\d+)_", candidate.name)
        visit_match = re.match(r"^(?:visit_)?(\d+)_", candidate.name)
        receipt_match = re.match(r"^receipt_(\d+)\.pdf$", candidate.name)
        staff_roles = {
            RoleEnum.SUPER_ADMIN,
            RoleEnum.ADMIN,
            RoleEnum.MANAGER,
            RoleEnum.EMPLOYEE,
        }
        if current_user.role not in staff_roles:
            raise HTTPException(status_code=403, detail="Not authorized")

        if customer_match:
            from app.routers.customers import (
                get_customer_or_404,
                verify_customer_access,
            )

            customer = get_customer_or_404(
                db,
                int(customer_match.group(1)),
            )
            verify_customer_access(customer, current_user)
        elif candidate.parent.name == "receipts" and receipt_match:
            from app.routers.payments import (
                get_payment_or_404,
                verify_payment_access,
            )

            payment = get_payment_or_404(
                db,
                int(receipt_match.group(1)),
            )
            verify_payment_access(payment, current_user)
        elif visit_match:
            from app.routers.site_visits import (
                get_visit_or_404,
                verify_visit_access,
            )

            visit = get_visit_or_404(db, int(visit_match.group(1)))
            verify_visit_access(visit, current_user)
        else:
            raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=candidate,
        filename=candidate.name,
        headers={"Cache-Control": "private, no-store"},
    )



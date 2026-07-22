from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from app.core.config import settings
from app.routers import auth, organization, users, inventory, leads, site_visits, customers, bookings, payments, analytics, system, dashboard, reports, settings as settings_router, notifications
from app.services.inventory_service import start_scheduler, stop_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    stop_scheduler()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url="/api/v1/openapi.json",
    lifespan=lifespan
)

# Mount uploads directory for photos
import os
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Set all CORS enabled origins (parsed from comma-separated string)
if settings.BACKEND_CORS_ORIGINS:
    origins = [o.strip() for o in settings.BACKEND_CORS_ORIGINS.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(organization.router, prefix="/organization", tags=["organization"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(inventory.router, prefix="/inventory", tags=["inventory"])
app.include_router(leads.router, prefix="/leads", tags=["leads"])
app.include_router(site_visits.router, prefix="/site-visits", tags=["site_visits"])
app.include_router(customers.router, prefix="/customers", tags=["customers"])
app.include_router(bookings.router, prefix="/bookings", tags=["bookings"])
app.include_router(payments.router, prefix="/payments", tags=["payments"])
app.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
app.include_router(system.router, prefix="/system", tags=["system"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
app.include_router(reports.router, prefix="/reports", tags=["reports"])
app.include_router(settings_router.router, prefix="/settings", tags=["settings"])
app.include_router(notifications.router, prefix="/notifications", tags=["notifications"])

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "FastAPI is running!"}

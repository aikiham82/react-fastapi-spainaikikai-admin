"""FastAPI application using hexagonal architecture."""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

from src.domain.exceptions.base import EntityNotFoundError, ValidationError, BusinessRuleViolationError, DomainException
from src.infrastructure.web.routers.users import router as users_router
from src.infrastructure.web.routers.clubs import router as clubs_router
from src.infrastructure.web.routers.members import router as members_router
from src.infrastructure.web.routers.licenses import router as licenses_router
from src.infrastructure.web.routers.seminars import router as seminars_router
from src.infrastructure.web.routers.payments import router as payments_router
from src.infrastructure.web.routers.insurances import router as insurances_router
from src.infrastructure.web.routers.dashboard import router as dashboard_router
from src.infrastructure.web.routers.import_export import router as import_export_router
from src.infrastructure.web.routers.price_configurations import router as price_configurations_router
from src.infrastructure.web.routers.invoices import router as invoices_router
from src.infrastructure.web.routers.notifications import router as notifications_router
from src.infrastructure.web.routers.password_reset import router as password_reset_router
from src.infrastructure.web.routers.member_payments import router as member_payments_router
from src.config.logfire import configure_logfire
from src.config.settings import AppSettings
from dotenv import load_dotenv
load_dotenv()

# Global scheduler instance
_scheduler = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    global _scheduler

    # Startup
    try:
        from src.infrastructure.scheduler import create_notification_scheduler
        _scheduler = create_notification_scheduler()
        if _scheduler:
            await _scheduler.start()
            logger.info("Notification scheduler started successfully")
    except Exception as e:
        logger.error(f"Failed to start notification scheduler: {e}")

    yield

    # Shutdown
    if _scheduler:
        await _scheduler.stop()
        logger.info("Notification scheduler stopped")


def get_scheduler():
    """Get the global scheduler instance."""
    return _scheduler


def create_app() -> FastAPI:
    """Create FastAPI application with hexagonal architecture."""
    app = FastAPI(
        title="Aikido Association Management API",
        description="A FastAPI application implementing hexagonal architecture for Aikido association management",
        version="1.0.0",
        lifespan=lifespan,
    )

    configure_logfire(app)

    # Domain exception handlers — must be registered before CORS middleware
    # so FastAPI handles the response (CORS headers are added by the middleware)
    @app.exception_handler(EntityNotFoundError)
    async def entity_not_found_handler(request: Request, exc: EntityNotFoundError):
        return JSONResponse(status_code=404, content={"detail": str(exc)})

    @app.exception_handler(BusinessRuleViolationError)
    async def business_rule_handler(request: Request, exc: BusinessRuleViolationError):
        return JSONResponse(status_code=409, content={"detail": str(exc)})

    @app.exception_handler(ValidationError)
    async def validation_error_handler(request: Request, exc: ValidationError):
        return JSONResponse(status_code=422, content={"detail": str(exc)})

    @app.exception_handler(DomainException)
    async def domain_exception_handler(request: Request, exc: DomainException):
        return JSONResponse(status_code=400, content={"detail": str(exc)})

    # Configure CORS
    settings = AppSettings()
    cors_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",  # frontend-mobile dev
        "http://127.0.0.1:5174",
        "capacitor://localhost",  # iOS Capacitor
        "http://localhost",       # Android WebView
    ]
    if settings.frontend_base_url and settings.frontend_base_url not in cors_origins:
        cors_origins.append(settings.frontend_base_url)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Mount static file serving for uploads — MUST be before routers
    upload_path = Path(__file__).parent.parent / "uploads"
    upload_path.mkdir(exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(upload_path)), name="uploads")

    # Include routers
    app.include_router(users_router, prefix="/api/v1")
    app.include_router(clubs_router, prefix="/api/v1")
    app.include_router(members_router, prefix="/api/v1")
    app.include_router(licenses_router, prefix="/api/v1")
    app.include_router(seminars_router, prefix="/api/v1")
    app.include_router(payments_router, prefix="/api/v1")
    app.include_router(insurances_router, prefix="/api/v1")
    app.include_router(dashboard_router, prefix="/api")
    app.include_router(import_export_router, prefix="/api/v1")
    app.include_router(price_configurations_router, prefix="/api/v1")
    app.include_router(invoices_router, prefix="/api/v1")
    app.include_router(notifications_router, prefix="/api/v1")
    app.include_router(password_reset_router, prefix="/api/v1")
    app.include_router(member_payments_router, prefix="/api/v1")

    @app.get("/")
    async def root():
        return {"message": "Aikido Association Management API", "version": "1.0.0"}

    @app.get("/api/v1/health")
    async def health_check():
        return {"status": "healthy", "architecture": "hexagonal"}
    
    return app